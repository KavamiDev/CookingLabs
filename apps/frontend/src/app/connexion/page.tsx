"use client";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Error messages for the status codes of POST /api/auth/login
const ERROR_MESSAGES: Record<number, string> = {
  400: "Vérifiez le format de l'e-mail.",
  401: "E-mail ou mot de passe incorrect.",
  429: "Trop de tentatives. Réessayez dans une minute.",
};

// True when the browser already has a valid session (GET /api/auth/me answers 200)
async function isLoggedIn() {
  const res = await fetch("/api/auth/me");
  return res.ok;
}

// Login page: the entry point of the app. Once logged in, the user goes to the courses
export default function ConnexionPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already logged in (valid session): no need to log in again
  useEffect(() => {
    isLoggedIn().then((loggedIn) => {
      if (loggedIn) {
        router.replace("/cours");
      }
    });
  }, [router]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(ERROR_MESSAGES[res.status] ?? "Erreur inattendue, réessayez.");
        return;
      }
      router.push("/cours");
      // Re-renders the server components (the header) with the logged-in user
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // Deux colonnes sur grand écran (formulaire | panneau), une seule sur mobile
    <div className="grid flex-1 lg:grid-cols-2">
      <main className="flex flex-col justify-center px-6 py-12">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Bon retour en cuisine
            </h1>
            <p className="text-muted-foreground">
              Connectez-vous pour retrouver vos cours, vos fiches techniques et vos QCM.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="font-black">
                Adresse e-mail
              </Label>
              <Input
                placeholder="adresse@mail.com"
                className="bg-popover"
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="font-black">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  placeholder="************"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-9 [&::-ms-reveal]:hidden bg-popover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-0.5 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          {/* Carte d'information : fond beige (--muted), coins arrondis, marge intérieure */}
          <div className="rounded-xl bg-muted p-4 text-sm leading-relaxed">
            <strong>Pas encore de compte ?</strong> Les comptes sont créés par votre école. Vous
            recevrez un e-mail d'invitation pour choisir votre mot de passe. Pensez à vérifier vos
            spams.
          </div>
        </div>
      </main>

      {/* Panneau décoratif de droite : caché sur mobile, visible à partir de lg (1024 px) */}
      <aside className="relative m-4 hidden overflow-hidden rounded-3xl bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-center">
        {/* Cercles décoratifs : en partie hors du panneau, coupés par overflow-hidden */}
        <div className="absolute -top-20 -left-20 size-48 rounded-full bg-white/10" />
        <div className="absolute -right-24 -bottom-40 size-96 rounded-full bg-[oklch(0.59_0.143_39.2)]" />

        {/* relative : le texte passe au-dessus des cercles */}
        <div className="relative flex flex-col gap-4">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-80">
            Du CAP au Bac+5
          </p>
          <h2 className="text-5xl font-bold leading-tight">
            La théorie ici, la pratique en cuisine.
          </h2>
          <p className="text-lg opacity-90">
            Vos leçons s&apos;ouvrent au fil de la formation, vos QCM vous disent où vous en êtes.
          </p>
        </div>
      </aside>
    </div>
  );
}
