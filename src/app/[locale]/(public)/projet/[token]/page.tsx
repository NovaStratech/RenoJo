export default async function ProjetClientPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  // Phase 4 will validate the token and render the client project view.
  return (
    <main className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold">Espace client</h1>
      <p className="text-muted-foreground mt-2 text-sm">Token reçu: {token.slice(0, 8)}…</p>
    </main>
  );
}
