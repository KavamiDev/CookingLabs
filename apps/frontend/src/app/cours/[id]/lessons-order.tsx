"use client";
// Liste des leçons avec des boutons ↑ ↓ pour changer l'ordre

import { useState } from "react";
import type { Lesson } from "@/app/_service/courses/service";
import { reorderLessons } from "@/app/_service/courses/service";
import { Button } from "@/components/ui/button";

export function LessonsOrder({ courseId, lessons }: { courseId: number; lessons: Lesson[] }) {
  const [list, setList] = useState(lessons);
  const [message, setMessage] = useState("");

  function moveLesson(index: number, direction: number) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) {
      return;
    }

    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[newIndex];
    newList[newIndex] = temp;

    setList(newList);
    setMessage("");
  }

  async function handleSave() {
    try {
      await reorderLessons(courseId, list);
      setMessage("Ordre enregistré");
    } catch {
      setMessage("Impossible d'enregistrer l'ordre");
    }
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-4 border-t pt-6">
        <h2 className="font-semibold text-lg">Leçons</h2>
        <p className="text-muted-foreground">Ce cours n'a pas encore de leçon.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 border-t pt-6">
      <h2 className="font-semibold text-lg">Leçons</h2>

      <ol className="flex flex-col gap-2">
        {list.map((lesson, index) => (
          <li key={lesson.id} className="flex items-center gap-2">
            <span className="flex-1">
              {index + 1}. {lesson.title}
            </span>
            <Button variant="outline" size="sm" onClick={() => moveLesson(index, -1)}>
              ↑
            </Button>
            <Button variant="outline" size="sm" onClick={() => moveLesson(index, 1)}>
              ↓
            </Button>
          </li>
        ))}
      </ol>

      {message !== "" && <p className="text-muted-foreground">{message}</p>}

      <Button onClick={handleSave}>Enregistrer l'ordre</Button>
    </div>
  );
}
