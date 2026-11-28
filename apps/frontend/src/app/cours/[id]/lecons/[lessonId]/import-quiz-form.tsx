"use client";
// Form to import the quiz of a lesson from a .json file (admins)

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importQuiz } from "@/app/_service/quizzes/import-quiz";
import { QUIZ_TEMPLATE_URL } from "@/app/_service/quizzes/service";
import { Button } from "@/components/ui/button";

type ImportQuizFormProps = { courseId: number; lessonId: number; hasQuiz: boolean };

export function ImportQuizForm({ courseId, lessonId, hasQuiz }: ImportQuizFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setErrors([]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!file) {
      setErrors(["Choisissez un fichier .json"]);
      return;
    }

    setErrors([]);
    setIsImporting(true);
    try {
      const result = await importQuiz(courseId, lessonId, file);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      form.reset();
      setFile(null);
      router.refresh(); // the page shows the preview of the new quiz
    } catch {
      setErrors(["Impossible d'importer le QCM"]);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Partez du{" "}
        <a href={QUIZ_TEMPLATE_URL} download className="underline">
          fichier modèle
        </a>{" "}
        : une seule bonne réponse pour le type « single », au moins une pour « multiple ».
        {hasQuiz && " Importer un fichier remplace le QCM actuel."}
      </p>

      <label className="flex flex-col gap-1">
        Fichier JSON (1 Mo maximum)
        <input
          className="w-full min-w-0 rounded-lg border px-3 py-2"
          type="file"
          accept=".json,application/json"
          required
          onChange={handleFileChange}
        />
      </label>

      {errors.length > 0 && (
        <div role="alert" className="flex flex-col gap-1 text-red-600">
          <p>Le QCM n'a pas été importé :</p>
          <ul className="list-disc pl-6">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" disabled={isImporting}>
        {isImporting ? "Import en cours..." : "Importer le QCM"}
      </Button>
    </form>
  );
}
