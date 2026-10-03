import { permanentRedirect } from "next/navigation";

// The case study moved under Projects. Keep the old address working.
export default function ArchitecturePage() {
  permanentRedirect("/projects/production-platform-on-hetzner");
}
