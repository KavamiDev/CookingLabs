"use client";
// "use client" car la page a un formulaire : on utilise useState et des clics

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCourse } from "@/app/_service/courses/service";
import { Button } from "@/components/ui/button";

export default function CreateCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (title === "") {
      setError("Le titre est obligatoire");
      return;
    }
    try {
      const course = await createCourse(title, description);
      router.push(`/cours/${course.id}`);
    } catch {
      setError("Impossible de créer le cours");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Créer un cours</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {error !== "" && <p className="text-red-600">{error}</p>}

        <Button type="submit">Créer le cours</Button>
      </form>

      <div className="flex justify-center">
        <Button size="lg">
          <Link href="/cours">Retour à la liste des cours</Link>
        </Button>
      </div>
    </main>
  );
}
