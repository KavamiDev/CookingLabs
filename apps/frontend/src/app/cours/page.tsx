import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}
// Faire un fetch pour récupérer les cours de l'utilisateur et les afficher dans la page.
// Pour afficher les élément de la table Courses dans prisma
async function fetchCourses(): Promise<Course[]> {
  const response = await fetch("http://localhost:3000/api/courses", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch courses");
  }
  return response.json();
}

export default async function Courses() {
  const courses = await fetchCourses();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Vos Cours</h1>
      <p className="text-lg text-muted-foreground">
        Bienvenu dans vos cours: Voici une liste exhaustive de vos cours
      </p>
      <div>
        {courses.map((course: Course) => (
          <div key={course.id} className="border-b py-4">
            <h2 className="font-semibold text-lg">{course.title}</h2>
            <p className="text-muted-foreground">{course.description}</p>
            <p className="text-sm text-muted-foreground">{course.category}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <ul>
          {courses.map((course: Course) => (
            <li key={course.id}>
              <Link href={`/cours/${course.id}`}>{course.title}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Button>
          <Link href="/cours/creer">Créer un cours</Link>
        </Button>
      </div>
      <div className="flex justify-center">
        <Button size="lg">
          <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </main>
  );
}
