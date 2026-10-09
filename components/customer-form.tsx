import { saveCustomer } from "@/app/actions";
import { Card, Check, Field, field, btnPrimary } from "./ui";
import type { Customer } from "@/lib/types";

export function CustomerForm({ customer }: { customer?: Customer }) {
  return (
    <form action={saveCustomer}>
      <Card className="space-y-4">
        {customer && <input type="hidden" name="id" value={customer.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input name="name" required defaultValue={customer?.name} className={field} /></Field>
          <Field label="Phone"><input name="phone" type="tel" defaultValue={customer?.phone ?? ""} className={field} /></Field>
          <Field label="Email"><input name="email" type="email" defaultValue={customer?.email ?? ""} className={field} /></Field>
        </div>
        <Field label="Notes"><textarea name="notes" rows={3} defaultValue={customer?.notes ?? ""} className={field} /></Field>
        <div className="rounded-lg border border-line px-4 py-2">
          <Check name="notify_email" label="Send status emails" hint="Only sent for stages you turn on under Settings > Notifications" defaultChecked={customer ? customer.notify_email : true} />
          <Check name="sms_opt_in" label="Customer agreed to text messages" hint="Only tick this if they asked for texts or said yes when you asked" defaultChecked={customer?.sms_opt_in ?? false} />
        </div>
        <button className={btnPrimary}>{customer ? "Save changes" : "Add customer"}</button>
      </Card>
    </form>
  );
}
