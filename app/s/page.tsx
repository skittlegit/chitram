import type { Metadata } from "next";
import Link from "next/link";
import { parseSharedResult, shareOutcome, shareQuery, shareTitle } from "../share";

// Landing page for a shared result. Link previews (WhatsApp, X, iMessage) read
// this page's metadata, which points at a generated image of the player's grid.

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const FALLBACK_TITLE = "Chitram — The Telugu Cinema Guessing Game";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const result = parseSharedResult(await searchParams);
  if (!result) return { title: { absolute: FALLBACK_TITLE }, robots: { index: false } };

  const title = shareTitle(result);
  const description = `${shareOutcome(result)}. Can you name today's Telugu film?`;
  const image = { url: `/s/og?${shareQuery(result)}`, width: 1200, height: 630, alt: `${title} result grid` };
  return {
    title: { absolute: title },
    description,
    robots: { index: false },
    openGraph: { title, description, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function SharedResultPage({ searchParams }: Props) {
  const result = parseSharedResult(await searchParams);

  return (
    <main className="share-page">
      <div className="share-card">
        <Link className="wordmark" href="/">Chitram</Link>
        {result ? (
          <>
            <h1>{shareTitle(result)}</h1>
            <div className="share-grid" role="img" aria-label={`${result.rows.length} guesses. ${result.won ? "Solved" : "Not solved"}.`}>
              {result.rows.map((row, rowIndex) => (
                <div key={rowIndex}>{row.map((value, cellIndex) => <i key={cellIndex} className={value} />)}</div>
              ))}
            </div>
            <p>{shareOutcome(result)}</p>
          </>
        ) : (
          <>
            <h1>Name the Telugu movie.</h1>
            <p>One mystery film a day. Every guess and clue counts.</p>
          </>
        )}
        <Link className="primary-cta" href="/game">Play today&apos;s game <span aria-hidden="true">→</span></Link>
      </div>
    </main>
  );
}
