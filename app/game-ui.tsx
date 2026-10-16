"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Movie } from "./game-data";
import { nextPuzzleCountdown } from "./game-logic";
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

export function GameToast({ game, className = "global-toast" }: { game: Game; className?: string }) {
  if (!game.toast) return null;
  return (
    <div className={className} role="status" aria-live="polite">
      <span>{game.toast}</span>
      {game.undoMovie && <button type="button" onClick={game.undoVaultRemoval}>Undo</button>}
    </div>
  );
}
