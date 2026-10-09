import { PartForm } from "@/components/part-form";
import { PageHeader } from "@/components/ui";

export default function NewPartPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add part" />
      <PartForm />
    </div>
  );
}
