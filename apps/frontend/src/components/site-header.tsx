import Link from "next/link";
import { getCurrentUser } from "@/app/_service/auth/session";
import { LogoutButton } from "./logout-button";

// Top bar shown on every page once logged in: app name, who is connected, logout button
export async function SiteHeader() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const roleLabel = user.role === "admin" ? "Administrateur" : "Élève";
  return (
    <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
      <nav className="flex items-center gap-4">
        <Link href="/cours" className="font-heading font-semibold">
          CookingLabs
        </Link>
        {/* Admin only: the page to manage the groups */}
        {user.role === "admin" && (
          <Link href="/groupes" className="text-sm hover:underline">
            Groupes
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-muted-foreground sm:inline">
          {user.firstName || user.email} · {roleLabel}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
