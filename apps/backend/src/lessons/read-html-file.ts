import { BadRequestException } from "@nestjs/common";

// Returns the text of an uploaded .html file, or throws a 400.
// The MIME type is not checked: the browser guesses it from the extension, and it is easy to fake.
export function readHtmlFile(file?: Express.Multer.File): string {
  if (!file) {
    throw new BadRequestException("Le fichier est obligatoire");
  }
  if (!/\.html?$/i.test(file.originalname)) {
    throw new BadRequestException("Le fichier doit être au format .html");
  }

  let text: string;
  try {
    // fatal: throws instead of silently replacing the accents of a file that is not in UTF-8
    text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
  } catch {
    throw new BadRequestException("Le fichier doit être encodé en UTF-8");
  }
  // A binary file renamed to .html (PostgreSQL also refuses this character)
  if (text.includes("\0")) {
    throw new BadRequestException("Le fichier n'est pas un fichier texte");
  }
  return text;
}
