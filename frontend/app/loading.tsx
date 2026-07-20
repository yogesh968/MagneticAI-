import { RouteLoader } from "@/components/brand/RouteLoader";

/** Root loader — landing, widget demo, and anything without a closer boundary. */
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <RouteLoader label="Loading" size={170} variant="swarm" />
    </main>
  );
}
