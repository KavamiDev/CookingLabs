import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">CookingLabs</h1>
      <p className="text-lg text-muted-foreground">
        La plateforme de formation. Connectez-vous pour retrouver vos cours.
      </p>
      <div>
        <Button size="lg">Se connecter</Button>
      </div>
    </main>
  );
}
