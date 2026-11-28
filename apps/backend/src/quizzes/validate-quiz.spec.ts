import { BadRequestException } from "@nestjs/common";
import { validateQuiz } from "./validate-quiz.js";

// A valid quiz, changed by each test to break one rule
function validQuiz() {
  return {
    title: "  Les pâtes  ",
    passThreshold: 80,
    questions: [
      {
        text: "Quelle farine pour une pâte brisée ?",
        type: "single",
        choices: [
          { text: "T55", isCorrect: true },
          { text: "T150", isCorrect: false },
        ],
      },
      {
        text: "Quels ingrédients dans une pâte sucrée ?",
        type: "multiple",
        choices: [
          { text: "Sucre", isCorrect: true },
          { text: "Beurre", isCorrect: true },
          { text: "Levure" },
        ],
      },
    ],
  };
}

// The list of error messages of the 400
function errorsOf(data: unknown): string[] {
  try {
    validateQuiz(data);
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    const response = (error as BadRequestException).getResponse() as { message: string[] };
    return response.message;
  }
  throw new Error("validateQuiz should have thrown");
}

describe("validateQuiz", () => {
  it("returns the quiz with trimmed texts and isCorrect false by default", () => {
    expect(validateQuiz(validQuiz())).toEqual({
      title: "Les pâtes",
      passThreshold: 80,
      questions: [
        {
          text: "Quelle farine pour une pâte brisée ?",
          type: "single",
          choices: [
            { text: "T55", isCorrect: true },
            { text: "T150", isCorrect: false },
          ],
        },
        {
          text: "Quels ingrédients dans une pâte sucrée ?",
          type: "multiple",
          choices: [
            { text: "Sucre", isCorrect: true },
            { text: "Beurre", isCorrect: true },
            { text: "Levure", isCorrect: false },
          ],
        },
      ],
    });
  });

  it("uses a 70 % threshold and no title when the file gives none", () => {
    const { title, passThreshold, ...quiz } = validQuiz();
    expect(validateQuiz(quiz)).toMatchObject({ title: null, passThreshold: 70 });
  });

  it.each([null, [], "QCM", 3])("rejects %j, which is not an object", (data) => {
    expect(errorsOf(data)).toEqual(["Le fichier doit contenir un objet JSON, comme le modèle"]);
  });

  it.each([undefined, [], "questions"])("needs at least one question (questions: %j)", (q) => {
    expect(errorsOf({ ...validQuiz(), questions: q })).toEqual([
      "Le QCM doit contenir au moins une question",
    ]);
  });

  it.each([-1, 101, 70.5, "70"])("rejects the threshold %j", (passThreshold) => {
    expect(errorsOf({ ...validQuiz(), passThreshold })).toEqual([
      "Le seuil de réussite (passThreshold) doit être un nombre entier entre 0 et 100",
    ]);
  });

  it.each(["   ", 42, "x".repeat(201)])("rejects the title %j", (title) => {
    expect(errorsOf({ ...validQuiz(), title })).toEqual([
      "Le titre doit être un texte de 200 caractères maximum",
    ]);
  });

  it("needs a text and a known type, with the question number", () => {
    const quiz = validQuiz();
    quiz.questions[1].text = "  ";
    quiz.questions[1].type = "vrai-faux";
    expect(errorsOf(quiz)).toEqual([
      "Question 2 : le texte est obligatoire (1000 caractères maximum)",
      'Question 2 : le type doit valoir "single" ou "multiple"',
    ]);
  });

  it("needs at least 2 choices", () => {
    const quiz = validQuiz();
    quiz.questions[0].choices = [{ text: "T55", isCorrect: true }];
    expect(errorsOf(quiz)).toEqual(["Question 1 : il faut au moins 2 choix"]);
  });

  it("needs exactly one right answer for a single question", () => {
    const quiz = validQuiz();
    quiz.questions[0].choices[1].isCorrect = true;
    expect(errorsOf(quiz)).toEqual([
      'Question 1 : une seule bonne réponse attendue pour le type "single" (2 trouvée(s))',
    ]);

    quiz.questions[0].choices[0].isCorrect = false;
    quiz.questions[0].choices[1].isCorrect = false;
    expect(errorsOf(quiz)).toEqual([
      'Question 1 : une seule bonne réponse attendue pour le type "single" (0 trouvée(s))',
    ]);
  });

  it("needs at least one right answer for a multiple question", () => {
    const quiz = validQuiz();
    quiz.questions[1].choices = [{ text: "Sel" }, { text: "Poivre", isCorrect: false }];
    expect(errorsOf(quiz)).toEqual([
      'Question 2 : au moins une bonne réponse attendue pour le type "multiple"',
    ]);
  });

  it("checks each choice, with the question and choice numbers", () => {
    const quiz = validQuiz();
    // biome-ignore lint/suspicious/noExplicitAny: a broken file, on purpose
    const choices: any[] = quiz.questions[1].choices;
    choices[0] = { text: "", isCorrect: true };
    choices[1] = { text: "Beurre", isCorrect: "oui" };
    choices[2] = "Levure";
    expect(errorsOf(quiz)).toEqual([
      "Question 2, choix 1 : le texte est obligatoire (500 caractères maximum)",
      "Question 2, choix 2 : isCorrect doit valoir true ou false",
      "Question 2, choix 3 : doit être un objet avec text et isCorrect",
    ]);
  });

  it("refuses the \\0 character, which PostgreSQL cannot store", () => {
    const quiz = validQuiz();
    quiz.questions[0].text = "Pâte\u0000";
    expect(errorsOf(quiz)).toEqual([
      "Question 1 : le texte est obligatoire (1000 caractères maximum)",
    ]);
  });

  it("lists the errors of every question at once", () => {
    const quiz = validQuiz();
    // biome-ignore lint/suspicious/noExplicitAny: a broken file, on purpose
    const questions: any[] = quiz.questions;
    questions[0].choices = [];
    questions.push("Question en texte");
    expect(errorsOf(quiz)).toEqual([
      "Question 1 : il faut au moins 2 choix",
      "Question 3 : doit être un objet avec text, type et choices",
    ]);
  });
});
