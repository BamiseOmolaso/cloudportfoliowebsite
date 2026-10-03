import { redirect } from "next/navigation";

// "Performance" was split in two: the newsletter results moved to each newsletter's
// Report, and the site numbers are on the Analytics page. Keep old bookmarks working.
export default function PerformanceRedirect() {
  redirect("/admin/analytics");
}
