// Shown to a student who opens a course (or one of its lessons) that is not open to their groups
export function CourseAccessDenied() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Vous n'avez pas accès à ce cours
      </h1>
      <p className="text-muted-foreground">
        Ce cours n'est pas ouvert à vos groupes. Si vous pensez que c'est une erreur, contactez un
        administrateur.
      </p>
    </div>
  );
}
