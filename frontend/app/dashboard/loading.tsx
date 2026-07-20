import { RouteLoader } from "@/components/brand/RouteLoader";

/** Shown inside the dashboard shell while any dashboard segment renders. */
export default function Loading() {
  return <RouteLoader label="Loading" size={140} variant="wire" />;
}
