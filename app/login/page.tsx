import { signIn } from "@/app/actions";
import { Card, Field, field, btnPrimary } from "@/components/ui";
import { SHOP_NAME } from "@/lib/util";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-4xl font-bold">{SHOP_NAME}</h1>
      <p className="mb-6 text-mute">Sign in to see the bench.</p>
      <form action={signIn}>
        <Card className="space-y-4">
          {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Field label="Email"><input name="email" type="email" required autoComplete="email" className={field} /></Field>
          <Field label="Password"><input name="password" type="password" required autoComplete="current-password" className={field} /></Field>
          <button className={`${btnPrimary} w-full`}>Sign in</button>
        </Card>
      </form>
    </main>
  );
}
