import { redirect } from "next/navigation";
export default function Home() {
  // Server-side: always send to login; client layout will redirect to /dashboard if already authed
  redirect("/login");
}
