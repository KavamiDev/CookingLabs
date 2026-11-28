import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivationForm } from "./activation-form";

export const metadata: Metadata = {
  title: "Activer mon compte · CookingLabs",
  // The URL contains the token: the browser must not send it to other sites (Referer header)
  referrer: "no-referrer",
};

// Page of the invitation link (public: the student has no account yet)
export default function ActivationPage() {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Bienvenue sur CookingLabs
          </h1>
          <p className="text-muted-foreground">
            Choisissez votre mot de passe pour activer votre compte.
          </p>
        </div>
        {/* Suspense: the form reads the token in the URL, only known in the browser */}
        <Suspense fallback={null}>
          <ActivationForm />
        </Suspense>
      </div>
    </main>
  );
}
