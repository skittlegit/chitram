"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Movie } from "./game-data";
import { nextPuzzleCountdown } from "./game-logic";
import type { PlayerStats } from "./player-store";
import type { Game } from "./use-game";

const POSTER_MATCH_VERSION = "cast-v5";

export function MoviePoster({ movie, className = "" }: { movie: Movie; className?: string }) {
  const [failed, setFailed] = useState(false);
  const isImmediate = className.includes("suggestion") || className.includes("result");
  const posterSize = className.includes("result") ? "110px" : "60px";

  return (
    <span className={`movie-poster ${className}`}>
      <span className="poster-fallback" aria-hidden="true"><span>Chitram</span><b lang="te">చి</b><small>{movie.year}</small></span>
      {!failed && (
        <Image
          src={`/api/poster?id=${encodeURIComponent(movie.id)}&v=${POSTER_MATCH_VERSION}`}
          alt={`${movie.title} (${movie.year}) poster`}
          fill
          sizes={posterSize}
          loading={isImmediate ? "eager" : "lazy"}
          fetchPriority={isImmediate ? "high" : "auto"}
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export function NextMovieCountdown() {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const update = () => setCountdown(nextPuzzleCountdown());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <strong>{countdown || "Midnight IST"}</strong>;
}

// Stands in for the search box or result card until the saved board for this
// puzzle has been loaded and scored.
export function GameLoading({ game, className = "game-loading" }: { game: Game; className?: string }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy={!game.loadFailed}>
      {game.loadFailed ? (
        <>
          <strong>Could not load this puzzle.</strong>
          <span>Check your connection, then try again.</span>
          <button type="button" onClick={game.retryLoad}>Try again</button>
        </>
      ) : (
        <>
          <i aria-hidden="true" />
          <strong>Loading your game…</strong>
        </>
      )}
    </div>
  );
}

// Stat tiles plus a guess distribution. The distribution is a list, not a
// picture: every row reads as "N guesses: count", so it needs no legend and
// works with a screen reader. `highlight` marks the bar for the game just won.
export function StatsPanel({ stats, streak, highlight }: { stats: PlayerStats; streak: number; highlight?: number }) {
  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const most = Math.max(1, ...stats.distribution);

  return (
    <div className="stats-panel">
      <div className="stats-grid">
        <div><strong>{stats.played}</strong><span>Played</span></div>
        <div><strong>{winRate}%</strong><span>Win rate</span></div>
        <div><strong>{streak}</strong><span>Streak</span></div>
        <div><strong>{stats.bestScore.toLocaleString("en-IN")}</strong><span>Best score</span></div>
      </div>
      <p className="stats-points"><span>Total points</span><strong>{stats.points.toLocaleString("en-IN")}</strong></p>
      <div className="stats-distribution">
        <h4 id="guess-distribution-title">Wins by guesses</h4>
        <ol aria-labelledby="guess-distribution-title">
          {stats.distribution.map((count, index) => (
            <li key={index} className={highlight === index + 1 ? "current" : undefined}>
              <span>{index + 1}<span className="visually-hidden"> {index === 0 ? "guess" : "guesses"}:</span></span>
              <span className="stats-bar-track" aria-hidden="true"><i style={{ width: `${(count / most) * 100}%` }} /></span>
              <b>{count}</b>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function GameToast({ game, className = "global-toast" }: { game: Game; className?: string }) {
  if (!game.toast) return null;
  return (
    <div className={className} role="status" aria-live="polite">
      <span>{game.toast}</span>
      {game.undoMovie && <button type="button" onClick={game.undoVaultRemoval}>Undo</button>}
    </div>
  );
}
