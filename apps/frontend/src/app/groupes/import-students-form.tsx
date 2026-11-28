"use client";
// Form to create students from a CSV file (admins)

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import {
  type ImportReport,
  importStudents,
  STUDENTS_TEMPLATE_URL,
} from "@/app/_service/users/import-students";
import { Button } from "@/components/ui/button";

export function ImportStudentsForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setReport(null);
    if (!file) {
      setErrors(["Choisissez un fichier .csv"]);
      return;
    }

    setLoading(true);
    const result = await importStudents(file);
    setLoading(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setReport(result.report);
    // Reloads the groups from the API: the new students appear in them
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 border-b pb-6">
      <h2 className="font-heading text-xl font-semibold">Importer des élèves</h2>
      <p className="text-sm text-muted-foreground">
        Un fichier CSV avec les colonnes email, first_name, last_name et group. Les groupes
        manquants sont créés, et chaque élève reçoit un e-mail pour choisir son mot de passe.{" "}
        <a href={STUDENTS_TEMPLATE_URL} download className="underline">
          Télécharger le fichier modèle
        </a>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          Fichier CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="rounded-lg border px-3 py-2"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {errors.length > 0 && (
          <div role="alert" className="text-sm text-red-600">
            <p>Aucun élève n&apos;a été importé. Corrigez le fichier puis réessayez :</p>
            <ul className="list-disc pl-5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {report && (
          <div role="status" className="text-sm">
            <p>
              {report.created} élève{report.created > 1 ? "s" : ""} importé
              {report.created > 1 ? "s" : ""}.
            </p>
            {report.groupsCreated.length > 0 && (
              <p>Groupes créés : {report.groupsCreated.join(", ")}.</p>
            )}
            {report.invitationFailures.length > 0 && (
              <p className="text-red-600">
                L&apos;e-mail d&apos;invitation n&apos;a pas pu être envoyé à :{" "}
                {report.invitationFailures.join(", ")}.
              </p>
            )}
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Import en cours…" : "Importer les élèves"}
        </Button>
      </form>
    </section>
  );
}
