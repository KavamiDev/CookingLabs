import Link from "next/link";
import { Button } from "@/components/ui/button";

// Shown to a student who opens an admin page by typing its URL
export function AccessDenied() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Accès réservé aux administrateurs
      </h1>
      <p className="text-muted-foreground">Vous n'avez pas les droits pour voir cette page.</p>
      <div>
        <Button asChild>
          <Link href="/cours">Retour à la liste des cours</Link>
        </Button>
      </div>
    </div>
  );
}
