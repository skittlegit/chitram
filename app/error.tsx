"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="state-page" id="main-content">
      <section className="state-card" aria-labelledby="error-title">
        <Link className="state-wordmark wordmark" href="/">Chitram</Link>
        <span className="state-code">Projection interrupted</span>
        <h1 id="error-title">The reel slipped.</h1>
        <p>Your local scores and saved films are safe. Try loading this scene again.</p>
        <div className="state-actions">
          <button className="state-primary" type="button" onClick={reset}>Try again <span aria-hidden="true">→</span></button>
          <Link className="state-secondary" href="/">Return home</Link>
        </div>
      </section>
    </main>
  );
}
