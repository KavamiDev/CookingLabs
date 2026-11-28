import { BadRequestException } from "@nestjs/common";

// A quiz read from a file, once validated: ready to be saved
export type QuizFile = {
  title: string | null;
  passThreshold: number;
  questions: {
    text: string;
    type: "single" | "multiple";
    choices: { text: string; isCorrect: boolean }[];
  }[];
};

// Pass threshold (in %) when the file does not give one
export const DEFAULT_PASS_THRESHOLD = 70;

const MAX_TITLE_LENGTH = 200;
const MAX_QUESTION_LENGTH = 1000;
const MAX_CHOICE_LENGTH = 500;

// Checks the content of a quiz file and returns it cleaned (texts trimmed, default values set).
// Every error is collected, so the admin can fix the whole file at once:
// throws a 400 whose message is the list of errors, with the number of the question.
export function validateQuiz(data: unknown): QuizFile {
  if (!isObject(data)) {
    throw new BadRequestException(["Le fichier doit contenir un objet JSON, comme le modèle"]);
  }

  const errors: string[] = [];

  // Optional title
  let title: string | null = null;
  if (data.title !== undefined) {
    title = readText(data.title, MAX_TITLE_LENGTH);
    if (title === null) {
      errors.push(`Le titre doit être un texte de ${MAX_TITLE_LENGTH} caractères maximum`);
    }
  }

  // Optional pass threshold, 70 % by default
  let passThreshold = DEFAULT_PASS_THRESHOLD;
  if (data.passThreshold !== undefined) {
    if (
      typeof data.passThreshold !== "number" ||
      !Number.isInteger(data.passThreshold) ||
      data.passThreshold < 0 ||
      data.passThreshold > 100
    ) {
      errors.push("Le seuil de réussite (passThreshold) doit être un nombre entier entre 0 et 100");
    } else {
      passThreshold = data.passThreshold;
    }
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push("Le QCM doit contenir au moins une question");
    throw new BadRequestException(errors);
  }

  const questions: QuizFile["questions"] = [];
  data.questions.forEach((question: unknown, questionIndex: number) => {
    // The admin counts from 1
    const label = `Question ${questionIndex + 1}`;
    if (!isObject(question)) {
      errors.push(`${label} : doit être un objet avec text, type et choices`);
      return;
    }

    const text = readText(question.text, MAX_QUESTION_LENGTH);
    if (text === null) {
      errors.push(
        `${label} : le texte est obligatoire (${MAX_QUESTION_LENGTH} caractères maximum)`,
      );
    }

    const type = question.type;
    if (type !== "single" && type !== "multiple") {
      errors.push(`${label} : le type doit valoir "single" ou "multiple"`);
    }

    if (!Array.isArray(question.choices) || question.choices.length < 2) {
      errors.push(`${label} : il faut au moins 2 choix`);
      return;
    }

    const choices: QuizFile["questions"][number]["choices"] = [];
    question.choices.forEach((choice: unknown, choiceIndex: number) => {
      const choiceLabel = `${label}, choix ${choiceIndex + 1}`;
      if (!isObject(choice)) {
        errors.push(`${choiceLabel} : doit être un objet avec text et isCorrect`);
        return;
      }
      const choiceText = readText(choice.text, MAX_CHOICE_LENGTH);
      if (choiceText === null) {
        errors.push(
          `${choiceLabel} : le texte est obligatoire (${MAX_CHOICE_LENGTH} caractères maximum)`,
        );
      }
      // isCorrect is optional: a choice is wrong unless the file says otherwise
      if (choice.isCorrect !== undefined && typeof choice.isCorrect !== "boolean") {
        errors.push(`${choiceLabel} : isCorrect doit valoir true ou false`);
      }
      if (choiceText !== null) {
        choices.push({ text: choiceText, isCorrect: choice.isCorrect === true });
      }
    });

    // The number of right answers depends on the type
    const correctCount = question.choices.filter(
      (choice: unknown) => isObject(choice) && choice.isCorrect === true,
    ).length;
    if (type === "single" && correctCount !== 1) {
      errors.push(
        `${label} : une seule bonne réponse attendue pour le type "single" (${correctCount} trouvée(s))`,
      );
    }
    if (type === "multiple" && correctCount === 0) {
      errors.push(`${label} : au moins une bonne réponse attendue pour le type "multiple"`);
    }

    if (text !== null && (type === "single" || type === "multiple")) {
      questions.push({ text, type, choices });
    }
  });

  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }
  return { title, passThreshold, questions };
}

// A plain object such as { "text": ... } (not null, not an array)
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The trimmed text, or null when it is not a non-empty text short enough.
// The \0 character is refused by PostgreSQL ("\u0000" in a JSON file).
function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  if (text === "" || text.length > maxLength || text.includes("\0")) {
    return null;
  }
  return text;
}
