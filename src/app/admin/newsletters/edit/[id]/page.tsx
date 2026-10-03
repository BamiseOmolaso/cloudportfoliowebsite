"use client";

import { useParams } from "next/navigation";
import NewsletterForm from "@/components/admin/NewsletterForm";

export default function EditNewsletterPage() {
  const { id } = useParams<{ id: string }>();
  return <NewsletterForm id={id} />;
}
