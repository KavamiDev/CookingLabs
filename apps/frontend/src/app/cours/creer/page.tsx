import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/app/_service/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { Button } from "@/components/ui/button";
import { CreateCourseForm } from "./create-course-form";

export default function CreateCoursePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <Suspense fallback={<p className="text-muted-foreground">Chargement...</p>}>
        <AdminOnlyForm />
      </Suspense>
    </main>
  );
}

// Admin only: a student who types the URL sees a message instead of the form
async function AdminOnlyForm() {
  const user = await requireUser();
  if (user.role !== "admin") {
    return <AccessDenied />;
  }

  return (
    <>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Créer un cours</h1>
      <CreateCourseForm />
      <div className="flex justify-center">
        <Button asChild size="lg">
          <Link href="/cours">Retour à la liste des cours</Link>
        </Button>
      </div>
    </>
  );
}
