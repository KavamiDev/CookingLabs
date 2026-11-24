"use client";
// "Marquer comme terminée" button (students). Once completed, a lesson cannot be unchecked.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markLessonCompleted } from "@/app/_service/lessons/progress";
import { Button } from "@/components/ui/button";

type CompleteLessonButtonProps = { courseId: number; lessonId: number; completed: boolean };

export function CompleteLessonButton({ courseId, lessonId, completed }: CompleteLessonButtonProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(completed);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    // Disabled while saving: a double click sends one request (the API ignores duplicates anyway)
    setIsSaving(true);
    setError("");
    try {
      await markLessonCompleted(courseId, lessonId);
      setIsCompleted(true);
      router.refresh(); // the course page shows the new progress
    } catch {
      setError("Impossible d'enregistrer, réessayez");
    } finally {
      setIsSaving(false);
    }
  }

  if (isCompleted) {
    return <p className="font-semibold text-green-700">✓ Leçon terminée</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={isSaving}>
        {isSaving ? "Enregistrement..." : "Marquer comme terminée"}
      </Button>
      {error !== "" && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
