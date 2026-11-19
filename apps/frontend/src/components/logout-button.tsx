"use client";
// "use client" because it reacts to a click

import { useRouter } from "next/navigation";
import { LOGIN_PAGE } from "@/app/_service/auth/cookie";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    // The API deletes the session cookie
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(LOGIN_PAGE);
    // Re-renders the server components (the header) without the user
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Se déconnecter
    </Button>
  );
}
