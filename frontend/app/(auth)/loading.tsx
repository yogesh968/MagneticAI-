import { RouteLoader } from "@/components/brand/RouteLoader";

/** Full-screen loader while an auth screen (login/register/reset) renders. */
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <RouteLoader label="Loading" size={150} variant="core" />
    </main>
  );
}
