"use client";
// Form to import a lesson from a .html file (admins)

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importLesson } from "@/app/_service/lessons/import-lesson";
import { Button } from "@/components/ui/button";

export function ImportLessonForm({ courseId }: { courseId: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setError("");
    // Suggested title: the file name without .html
    setTitle(selectedFile?.name.replace(/\.html?$/i, "") ?? "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!file || title.trim() === "") {
      setError("Le fichier et le titre sont obligatoires");
      return;
    }

    setError("");
    setIsImporting(true);
    try {
      const result = await importLesson(courseId, title, file);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // Next keeps this page in memory: empty the form for when the admin comes back
      form.reset();
      setFile(null);
      setTitle("");
      router.push(`/cours/${courseId}/lecons/${result.lessonId}`);
      router.refresh();
    } catch {
      setError("Impossible d'importer la leçon");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t pt-6">
      <h2 className="font-semibold text-lg">Importer une leçon</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Fichier HTML (1 Mo maximum)
          <input
            className="w-full min-w-0 rounded-lg border px-3 py-2"
            type="file"
            accept=".html,.htm"
            required
            onChange={handleFileChange}
          />
        </label>

        <label className="flex flex-col gap-1">
          Titre de la leçon
          <input
            className="rounded-lg border px-3 py-2"
            value={title}
            maxLength={200}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        {error !== "" && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isImporting}>
          {isImporting ? "Import en cours..." : "Importer la leçon"}
        </Button>
      </form>
    </div>
  );
}
