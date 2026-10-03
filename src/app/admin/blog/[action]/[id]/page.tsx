"use client";

import { useParams } from "next/navigation";
import EntryForm from "@/components/admin/EntryForm";

export default function EditBlogPost() {
  const { id } = useParams<{ id: string }>();
  return <EntryForm kind="post" id={id} />;
}
