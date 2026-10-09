import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/ui";

export default function NewCustomerPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add customer" />
      <CustomerForm />
    </div>
  );
}
