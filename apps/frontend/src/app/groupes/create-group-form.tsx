"use client";
// Form to create a group (admins)

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createGroup } from "@/app/_service/groups/service";
import { Button } from "@/components/ui/button";

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim() === "") {
      setError("Le nom du groupe est obligatoire");
      return;
    }
    try {
      await createGroup(name);
      setName("");
      setError("");
      router.refresh(); // reloads the list of groups from the API
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible de créer le groupe");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-b pb-6">
      <label className="flex flex-col gap-1">
        Nom du nouveau groupe
        <input
          className="rounded-lg border px-3 py-2"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {error !== "" && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <Button type="submit">Créer le groupe</Button>
    </form>
  );
}
