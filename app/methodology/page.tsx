const DISCLAIMER = "Educational monitoring tool. Not financial advice. Historical similarity is not predictive.";

export default function MethodologyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-8">
      <header className="border-b border-border pb-6">
        <p className="text-sm font-medium text-muted">{DISCLAIMER}</p>
        <h1 className="mt-2 text-3xl font-semibold">Methodology</h1>
      </header>
      <p className="text-base leading-7 text-muted">
        This page will summarize the offline data refresh, historical similarity method, and model evaluation once the
        dashboard artifacts are generated.
      </p>
    </main>
  );
}
