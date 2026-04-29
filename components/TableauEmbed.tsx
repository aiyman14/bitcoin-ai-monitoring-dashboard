"use client";

import Script from "next/script";

export function TableauEmbed({ src }: { src?: string }) {
  if (!src) {
    return <div className="rounded-md border border-border bg-white p-5 text-sm text-muted">Tableau workbook pending.</div>;
  }

  return (
    <>
      <Script src="https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js" type="module" />
      <tableau-viz src={src} toolbar="bottom" />
    </>
  );
}
