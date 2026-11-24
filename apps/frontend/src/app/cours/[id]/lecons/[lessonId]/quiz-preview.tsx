import type { QuizWithAnswers } from "@/app/_service/quizzes/service";

// Preview of the imported quiz for the admin, right answers marked
export function QuizPreview({ quiz }: { quiz: QuizWithAnswers }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {quiz.title && <h3 className="font-semibold">{quiz.title}</h3>}
        <p className="text-sm text-muted-foreground">
          {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""} · seuil de réussite
          : {quiz.passThreshold} %
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {quiz.questions.map((question, index) => (
          <li key={question.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <p className="font-medium">
              {index + 1}. {question.text}
            </p>
            <p className="text-xs text-muted-foreground">
              {question.type === "single" ? "Une seule bonne réponse" : "Plusieurs bonnes réponses"}
            </p>
            <ul className="flex flex-col gap-1">
              {question.choices.map((choice) => (
                <li
                  key={choice.id}
                  className={choice.isCorrect ? "font-medium text-green-700" : undefined}
                >
                  {choice.isCorrect ? "✓" : "–"} {choice.text}
                  {choice.isCorrect && <span className="sr-only"> (bonne réponse)</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
