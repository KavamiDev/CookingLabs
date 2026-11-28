"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import { activateAccount, MIN_PASSWORD_LENGTH } from "@/app/_service/auth/activate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Form of the invitation link: the student chooses a password, typed twice
export function ActivationForm() {
  // The token comes from the link of the e-mail: /activation?token=...
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);

  if (!token) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Ce lien d&apos;invitation est incomplet. Ouvrez le lien reçu par e-mail.
      </p>
    );
  }

  if (activated) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status">Votre compte est activé. Vous pouvez maintenant vous connecter.</p>
        <Button asChild size="lg">
          <Link href="/connexion">Se connecter</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // Checked here for a quick answer; the API checks the length again
    if (password !== confirmation) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setLoading(true);
    const result = await activateAccount(token, password);
    setLoading(false);
    if (result.ok) {
      setActivated(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="font-black">
          Mot de passe
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          aria-describedby="password-help"
          className="bg-popover"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p id="password-help" className="text-sm text-muted-foreground">
          Au moins {MIN_PASSWORD_LENGTH} caractères. Une phrase facile à retenir fonctionne bien.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmation" className="font-black">
          Confirmer le mot de passe
        </Label>
        <Input
          id="confirmation"
          type="password"
          autoComplete="new-password"
          required
          className="bg-popover"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Activation…" : "Activer mon compte"}
      </Button>
    </form>
  );
}
