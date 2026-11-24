// Quiz types, shared by Server and Client Components (no server-only import here)

export interface QuizChoice {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  text: string;
  type: "single" | "multiple";
  position: number;
  choices: QuizChoice[];
}

// A quiz with its right answers, as GET .../quiz returns it to an admin
export interface QuizWithAnswers {
  id: number;
  title: string | null;
  passThreshold: number;
  questions: QuizQuestion[];
}

// Template offered to the admins, served from apps/frontend/public
export const QUIZ_TEMPLATE_URL = "/modele-qcm.json";
