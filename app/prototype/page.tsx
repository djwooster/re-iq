import { redirect } from "next/navigation";
// import { Login } from "@/components/prototype/overview";

// Signing in is real now (/login), so the prototype's own sign-in screen is parked; proxy.ts makes
// /prototype require a session. Setup still runs first for a workspace that hasn't finished it.
export default function Page() {
  redirect("/prototype/overview");
  // return <Login />;
}
