"use client";
// Formulaire pour renommer un cours + bouton pour le supprimer

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Course } from "@/app/_service/courses/service";
import { deleteCourse, updateCourse } from "@/app/_service/courses/service";
import { Button } from "@/components/ui/button";

export function EditCourse({ course }: { course: Course }) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [message, setMessage] = useState("");

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (title === "") {
      setMessage("Le titre est obligatoire");
      return;
    }

    try {
      await updateCourse(course.id, title, description);
      setMessage("Cours modifié");
      router.refresh();
    } catch {
      setMessage("Impossible de modifier le cours");
    }
  }

  async function handleDelete() {
    const ok = confirm("ÊTES VOUS SUR ? ");
    if (!ok) {
      return;
    }

    try {
      await deleteCourse(course.id);
      router.push("/cours");
    } catch {
      setMessage("Impossible de supprimer le cours");
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t pt-6">
      <h2 className="font-semibold text-lg">Modifier le cours</h2>

      <form onSubmit={handleRename} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Titre
          <input
            className="rounded-lg border px-3 py-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          Description
          <textarea
            className="rounded-lg border px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {message !== "" && <p className="text-muted-foreground">{message}</p>}

        <Button type="submit">Enregistrer</Button>
      </form>

      <Button variant="destructive" onClick={handleDelete}>
        Supprimer le cours
      </Button>
    </div>
  );
}
