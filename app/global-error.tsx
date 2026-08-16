"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="state-page" id="main-content">
          <section className="state-card" aria-labelledby="global-error-title">
            <Link className="state-wordmark wordmark" href="/">Chitram</Link>
            <span className="state-code">House lights on</span>
            <h1 id="global-error-title">The show could not start.</h1>
            <p>Reload the game and your device-local progress will still be here.</p>
            <div className="state-actions">
              <button className="state-primary" type="button" onClick={reset}>Reload the show <span aria-hidden="true">→</span></button>
              <Link className="state-secondary" href="/">Return home</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
