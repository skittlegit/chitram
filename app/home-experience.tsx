"use client";

import Link from "next/link";
import { ALL_MOVIES, GAME_RULES } from "./game-data";
import { ARCHIVE_DAYS, archiveLabel, displayedStreak, gameHistoryKey, gameHref, puzzleNumber, shiftDate } from "./game-logic";
import { GameToast, MoviePoster, NextMovieCountdown, StatsPanel } from "./game-ui";
import { usePlayer } from "./player-store";
import { useToday, useVault } from "./use-game";

const YEARS_COVERED = Math.max(...ALL_MOVIES.map((movie) => movie.year)) - Math.min(...ALL_MOVIES.map((movie) => movie.year)) + 1;

// The landing page: today's puzzle, the rules, the archive, your stats and your
// saved films. It holds no game of its own; every game is played on /game.
export default function HomeExperience({ initialDate }: { initialDate: string }) {
  const currentDate = useToday(initialDate);
  const player = usePlayer();
  const vault = useVault(player.watchlist);
  const todayPuzzle = puzzleNumber(currentDate);

  // Progress on the all-eras puzzle for a day, read from this device.
  function progressFor(offset: number) {
    const key = gameHistoryKey(currentDate, offset, "All");
    const board = player.boards[key];
    return { finished: player.completedGames[key], started: Boolean(board && (board.guessIds.length || board.clueLabels.length)) };
  }
  const today = progressFor(0);
  const playLabel = today.finished ? "See today's result" : today.started ? "Continue today's game" : "Play today's game";

  return (
    <main id="top" className="site">
      <Link className="skip-link" href="/game">Skip to today&apos;s game</Link>
      <GameToast game={vault} />

      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand wordmark" href="#top" aria-label="Chitram, back to top">Chitram</a>
          <Link className="play-settings-trigger topbar-play" href="/game"><span>{today.finished ? "Today's result" : "Play"}</span><b aria-hidden="true">→</b></Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span lang="te">తెలుగు సినిమా</span><strong>Daily puzzle #{todayPuzzle}</strong></div>
          <h1>A movie is hiding <em>in plain sight.</em></h1>
          <p>Name today&apos;s mystery Telugu film. Every guess develops the picture—year, cast, genre and more—until the title comes into focus.</p>
          <div className="hero-actions">
            <Link className="primary-cta" href="/game" prefetch>{playLabel} <span aria-hidden="true">→</span></Link>
            <Link className="secondary-cta" href={gameHref("practice")}>Try a practice film</Link>
          </div>
          {today.finished && (
            <p className="hero-status" role="status">
              {today.finished.result === "won"
                ? <>Solved in <strong>{today.finished.guesses}</strong> for <strong>{today.finished.score.toLocaleString("en-IN")}</strong> points. </>
                : <>Today&apos;s film got away. </>}
              Next film in <NextMovieCountdown />.
            </p>
          )}
          <div className="hero-facts">
            <span><strong>{ALL_MOVIES.length}</strong> films</span>
            <span><strong>{YEARS_COVERED}</strong> years of cinema</span>
            <span><strong>1</strong> fresh puzzle daily</span>
          </div>
        </div>
        <div className="hero-poster" role="img" aria-label="A typographic poster for today's mystery Telugu movie">
          <div className="poster-band"><span>Chitram presents</span><span>Daily / #{todayPuzzle}</span></div>
          <div className="poster-title"><small>Can you name the</small><strong lang="te">సినిమా?</strong></div>
          <div className="poster-billing"><span>{GAME_RULES.baseScore.toLocaleString("en-IN")} pts</span><span>{GAME_RULES.maxClues} clues</span><span>{GAME_RULES.maxGuesses} takes</span></div>
          <div className="poster-showtime">
            <span>Next premiere in</span><NextMovieCountdown />
          </div>
        </div>
      </section>

      <section className="quick-guide section-target" id="how" tabIndex={-1}>
        <div className="guide-heading"><span>Three scenes</span><h2>How the story unfolds.</h2></div>
        <div className="guide-grid">
          <article><span>01</span><div><strong>Start at {GAME_RULES.baseScore.toLocaleString("en-IN")}</strong><p>Everyone gets the same film each day. Each miss costs {GAME_RULES.guessPenalty} points. Clues cost {GAME_RULES.cluePenalties.join(", then ")}.</p></div></article>
          <article><span>02</span><div><strong>Call your shot</strong><p>Search by title, actor or director. Each guess compares six signals with the mystery title: year, lead, director, genre, music director and title length.</p></div></article>
          <article><span>03</span><div><strong>Read the colour</strong><p><i className="key exact" /> Exact <i className="key close" /> Close <i className="key miss" /> Miss</p></div></article>
        </div>
      </section>

      <section className="library-section section-target" tabIndex={-1}>
        <div className="section-heading"><div><span className="section-kicker">Your cinema</span><h2>Keep the reel going.</h2></div><p>Revisit an old puzzle, follow your form, or return to a film you saved.</p></div>
        <div className="utility-grid">
          <section className="utility-card archive-card section-target" id="archive" tabIndex={-1}>
            <div className="utility-heading"><div><span>Previous shows</span><h3>Seven days on the reel</h3></div><small>Archive games do not affect your streak.</small></div>
            <div className="archive-list">
              {Array.from({ length: ARCHIVE_DAYS }, (_, index) => {
                const offset = index + 1;
                const { finished, started } = progressFor(offset);
                const stateLabel = finished
                  ? finished.result === "won" ? `Solved · ${finished.score.toLocaleString("en-IN")} pts` : "Missed"
                  : started ? "Continue →" : "Play →";
                return (
                  <Link
                    key={offset}
                    className={finished ? "completed" : undefined}
                    href={gameHref("archive", "All", shiftDate(currentDate, -offset))}
                    aria-label={`${archiveLabel(currentDate, offset)}, puzzle ${todayPuzzle - offset}. ${stateLabel.replace(" →", "")}`}
                  ><span>{archiveLabel(currentDate, offset)}</span><strong>#{todayPuzzle - offset}</strong><small>{stateLabel}</small></Link>
                );
              })}
            </div>
          </section>

          <section className="utility-card progress-card section-target" id="progress" tabIndex={-1}>
            <div className="utility-heading"><div><span>Scorecard</span><h3>Your box office</h3></div></div>
            <StatsPanel stats={player.stats} streak={displayedStreak(player.stats, currentDate)} />
          </section>

          <section className="utility-card vault-card section-target" id="vault" tabIndex={-1}>
            <div className="utility-heading"><div><span>Watchlist</span><h3>Films for later</h3></div><small>Saved only on this device.</small></div>
            {vault.savedMovies.length ? (
              <div className="vault-grid">
                {vault.savedMovies.map((movie) => (
                  <article key={movie.id}>
                    <MoviePoster movie={movie} className="vault-poster" />
                    <div><strong>{movie.title}</strong><small>{movie.year} · {movie.director}</small><button type="button" onClick={() => vault.toggleVault(movie)}>Remove</button></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-vault"><strong>No saved movies yet</strong><p>Finish a game and choose “Save movie” to build your list.</p></div>
            )}
          </section>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main"><strong className="wordmark">Chitram</strong><small>A Telugu movie guessing game.</small></div>
        <a className="tmdb-credit" href="https://www.themoviedb.org" target="_blank" rel="noreferrer"><span className="tmdb-logo" aria-hidden="true" /><small>This product uses the TMDB API but is not endorsed or certified by TMDB.</small></a>
        <a className="back-to-top" href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
