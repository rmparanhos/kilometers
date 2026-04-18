import { redirect } from "next/navigation";

// Authentication removed — self-hosted, single-user.
export default function LoginPage() {
  redirect("/dashboard");
}
