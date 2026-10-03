"use client";

import { useParams } from "next/navigation";
import EntryForm from "@/components/admin/EntryForm";

export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  return <EntryForm kind="project" id={id} />;
}
