import { ASSETS } from "@/lib/assets";

const DISCLAIMER = "Educational monitoring tool. Not financial advice. Historical similarity is not predictive.";

export default function Home() {
  const enabledAssets = ASSETS.filter((asset) => asset.enabled);
  const asset = enabledAssets[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">Pattern recognition with measured ranges.</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">
            {asset.displayName} Market Monitor - A Responsible AI Dashboard
          </h1>
        </div>
        <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-muted">{DISCLAIMER}</div>
      </header>

      <section className="rounded-md border border-border bg-white p-5">
        <div className="text-sm font-medium text-muted">Current Phase 0 Scaffold</div>
        <h2 className="mt-2 text-2xl font-semibold">{asset.displayName} offline pipeline is being prepared.</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          The dashboard shell is ready for the hourly artifacts that Phase 0 writes into the local data directory.
        </p>
      </section>
    </main>
  );
}
