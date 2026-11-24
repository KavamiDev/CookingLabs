import { BadRequestException } from "@nestjs/common";

// Returns the content of an uploaded .json file, or throws a 400.
// The content is not checked here: validateQuiz() does it.
// The MIME type is not checked: the browser guesses it from the extension, and it is easy to fake.
export function readQuizFile(file?: Express.Multer.File): unknown {
  if (!file) {
    throw new BadRequestException("Le fichier est obligatoire");
  }
  if (!/\.json$/i.test(file.originalname)) {
    throw new BadRequestException("Le fichier doit être au format .json");
  }

  let text: string;
  try {
    // fatal: throws instead of silently replacing the accents of a file that is not in UTF-8
    text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
  } catch {
    throw new BadRequestException("Le fichier doit être encodé en UTF-8");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequestException(
      "Le fichier n'est pas un JSON valide : comparez-le au fichier modèle",
    );
  }
}
