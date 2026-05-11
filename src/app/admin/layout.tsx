import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-middleware";
import AdminLayoutClient from "./AdminLayoutClient";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    redirect("/login");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
