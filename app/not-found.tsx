import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "That Chitram page could not be found. Return to today's Telugu movie guessing game.",
};

export default function NotFound() {
  return (
    <main className="state-page" id="main-content">
      <section className="state-card" aria-labelledby="not-found-title">
        <Link className="state-wordmark wordmark" href="/" aria-label="Chitram home">Chitram</Link>
        <span className="state-code">404 · Reel missing</span>
        <h1 id="not-found-title">This scene isn&apos;t in the cut.</h1>
        <p>The page may have moved, but today&apos;s Telugu movie is ready to play.</p>
        <div className="state-actions">
          <Link className="state-primary" href="/#game">Play today&apos;s game <span aria-hidden="true">→</span></Link>
          <Link className="state-secondary" href="/">Back to the poster</Link>
        </div>
      </section>
    </main>
  );
}
