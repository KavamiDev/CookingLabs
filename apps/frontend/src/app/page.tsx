import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LOGIN_PAGE } from "@/app/_service/auth/cookie";
import { getCurrentUser } from "@/app/_service/auth/session";

// localhost:3000 is the entry point: logged in → the courses, otherwise → the login page
export default function Home() {
  return (
    <Suspense fallback={null}>
      <RedirectFromHome />
    </Suspense>
  );
}

// Renders nothing: redirect() always sends the browser to another page
async function RedirectFromHome(): Promise<null> {
  const user = await getCurrentUser();
  redirect(user ? "/cours" : LOGIN_PAGE);
}
