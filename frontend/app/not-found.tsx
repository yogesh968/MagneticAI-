import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OrbBot3D } from "@/components/brand/OrbBot3D";

export default function NotFound() {
  return (
    <main className="dot-grid flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <OrbBot3D size={190} variant="swarm" />
      <p className="mono-label-accent mt-4">Error · 404</p>
      <h1 className="display mt-3 text-[clamp(2.5rem,7vw,4.5rem)]">PAGE NOT FOUND</h1>
      <p className="mt-4 max-w-sm text-ink-soft">
        Ye page maujood nahi hai — ho sakta hai link purana ho ya address galat.
      </p>
      <Link href="/" className="btn-primary mt-8 gap-2 px-6 py-3.5 text-[15px]">
        <ArrowLeft size={16} /> Back to home
      </Link>
    </main>
  );
}
