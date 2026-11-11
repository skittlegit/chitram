"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { GAME_RULES } from "./game-data";
import { ARCHIVE_DAYS, archiveLabel, ERAS, gameHistoryKey, type GameSelection } from "./game-logic";
import { cellHint, GameLoading, GameToast, MoviePoster, NextMovieCountdown, StatsPanel } from "./game-ui";
import { useGame } from "./use-game";

const GRID_COLUMNS = ["Year", "Lead", "Director", "Genre", "Music", "Title length"];
const EMPTY_SIGNALS = ["Year", "Lead", "Director", "Genre", "Music", "Words"];

export default function FocusedGame({ initialDate, initialGame }: { initialDate: string; initialGame?: GameSelection }) {
  const resultRef = useRef<HTMLDivElement>(null);
  const game = useGame(initialDate, resultRef, initialGame);
  const { answer, guesses, status, mode, decade, settingsOpen, currentDate, archiveOffset } = game;
  const highlighted = game.highlight >= 0 ? game.suggestions[game.highlight] : undefined;

  // An actor or director search can list many films, so keep the arrow-key choice in view.
  useEffect(() => {
    if (highlighted) document.getElementById(`focused-film-option-${highlighted.id}`)?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  return (
    <main className="play-page" id="top">
      <a className="skip-link" href="#film-search-focused">Skip to movie search</a>
      <GameToast game={game} className="global-toast play-toast" />

      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand wordmark" href="/" aria-label="Chitram home">Chitram</Link>
          <button className="play-settings-trigger" type="button" aria-controls="focused-game-settings" aria-expanded={settingsOpen} onClick={() => game.setSettingsOpen((value) => !value)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" /></svg>
            <span>{settingsOpen ? "Close options" : game.gameSetupLabel}</span>
          </button>
        </div>
      </header>

      <section className="play-stage section-target" id="game" tabIndex={-1}>
        {game.pendingGame && (
          <div className="play-restart" role="alert">
            <div><strong>Switch games?</strong><span>Your current guesses will be cleared.</span></div>
            <div>
              <button type="button" onClick={() => game.applyGame(game.pendingGame!)}>Start new game</button>
              <button type="button" className="secondary" onClick={() => game.setPendingGame(null)}>Keep playing</button>
            </div>
          </div>
        )}

        <div className={`play-settings-panel ${settingsOpen ? "open" : ""}`} id="focused-game-settings" hidden={!settingsOpen}>
          <fieldset>
            <legend>Game mode</legend>
            <div className="play-option-row">
              <button type="button" aria-pressed={mode === "daily"} className={mode === "daily" ? "active" : ""} onClick={() => game.startGame({ mode: "daily", archiveOffset: 0 })}><strong>Daily</strong><small>Today&apos;s shared film</small></button>
              <button type="button" aria-pressed={mode === "practice"} className={mode === "practice" ? "active" : ""} onClick={() => game.startGame({ mode: "practice" })}><strong>Practice</strong><small>Unlimited movies</small></button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Movie years</legend>
            <div className="play-option-row eras">
              {ERAS.map((item) => (
                <button type="button" key={item} aria-pressed={decade === item} className={decade === item ? "active" : ""} onClick={() => game.startGame({ decade: item })}><strong>{item === "All" ? "All eras" : item}</strong></button>
              ))}
            </div>
          </fieldset>
          <fieldset className="play-archive">
            <legend>Previous days</legend>
            <div className="play-option-row days">
              {Array.from({ length: ARCHIVE_DAYS }, (_, index) => {
                const offset = index + 1;
                const finished = game.player.completedGames[gameHistoryKey(currentDate, offset, decade)];
                const isCurrent = mode === "archive" && archiveOffset === offset;
                const state = finished ? (finished.result === "won" ? `${finished.score.toLocaleString("en-IN")} pts` : "Missed") : `#${game.todayPuzzle - offset}`;
                return (
                  <button type="button" key={offset} aria-pressed={isCurrent} className={`${isCurrent ? "active" : ""} ${finished ? "finished" : ""}`.trim()} onClick={() => game.startGame({ mode: "archive", archiveOffset: offset })}>
                    <strong>{archiveLabel(currentDate, offset)}</strong><small>{state}</small>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="play-titlebar">
          <div>
            <span className="play-kicker"><b lang="te">తెలుగు సినిమా</b><i aria-hidden="true">/</i><span>{game.modeLabel}</span></span>
            <h1>{status === "won" ? "That's a wrap." : status === "lost" ? "Roll the credits." : "Name the movie."}</h1>
          </div>
          <div className="play-score">
            <span>{status === "playing" ? "Score" : "Final"}</span>
            <strong>{(status === "playing" ? game.potentialScore : game.finalScore).toLocaleString("en-IN")}</strong>
            <small>{status === "playing" ? `${game.guessesLeft} ${game.guessesLeft === 1 ? "guess" : "guesses"} left` : status === "won" ? "Movie solved" : "Game over"}</small>
          </div>
        </div>

        <div className="play-progress-row">
          <div className="play-takes">
            <span>Take</span>
            <div aria-label={`${guesses.length} of ${GAME_RULES.maxGuesses} guesses used`}>
              {Array.from({ length: GAME_RULES.maxGuesses }).map((_, index) => (
                <i key={index} className={index < guesses.length ? (status === "won" && index === guesses.length - 1 ? "won" : "used") : ""}><span>{index + 1}</span></i>
              ))}
            </div>
          </div>
          <p><i className="key exact" /> Exact <i className="key close" /> Close <i className="key miss" /> Miss</p>
        </div>

        {!game.ready ? (
          <GameLoading game={game} />
        ) : status === "playing" || !answer ? (
          <form className="play-search" onSubmit={(event) => game.submit(event)}>
            <label htmlFor="film-search-focused"><strong>Make your guess</strong><small>Search {game.pool.length} Telugu films</small></label>
            <div className="play-search-control">
              <span aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 4.25 4.25" /></svg></span>
              <input
                id="film-search-focused"
                role="combobox"
                value={game.query}
                onChange={(event) => game.changeQuery(event.target.value)}
                onKeyDown={game.onSearchKeyDown}
                aria-autocomplete="list"
                aria-controls="focused-film-suggestions"
                aria-expanded={game.suggestions.length > 0}
                aria-activedescendant={game.highlight >= 0 && game.suggestions[game.highlight] ? `focused-film-option-${game.suggestions[game.highlight].id}` : undefined}
                autoComplete="off"
                autoFocus
                placeholder="Type a movie title..."
              />
              <button type="submit" disabled={game.pending}>{game.pending ? "Checking…" : <>Guess <span aria-hidden="true">→</span></>}</button>
            </div>
            {game.suggestions.length > 0 && (
              <div className="play-suggestions" id="focused-film-suggestions" role="listbox" aria-label="Movie suggestions">
                {game.suggestions.map((movie, index) => (
                  <button type="button" role="option" id={`focused-film-option-${movie.id}`} aria-selected={index === game.highlight} tabIndex={-1} className={index === game.highlight ? "highlight" : ""} key={movie.id} onMouseDown={(event) => event.preventDefault()} onClick={() => game.submit(undefined, movie)}>
                    <MoviePoster movie={movie} className="play-suggestion-poster" />
                    <span><strong>{movie.title}</strong><small>{movie.hero} · {movie.director}</small></span>
                    <em>{movie.year}</em>
                  </button>
                ))}
              </div>
            )}
          </form>
        ) : (
          <div className={`play-result ${status}`} ref={resultRef} role="status" aria-live="polite" tabIndex={-1}>
            <MoviePoster movie={answer} className="play-result-poster" />
            <div className="play-result-copy"><span>{status === "won" ? "That's the one" : "The movie was"}</span><strong>{answer.title}</strong><small>{answer.year} · {answer.hero} · Directed by {answer.director}</small></div>
            <div className="play-result-score"><span>{status === "won" ? "Final score" : "Better luck next reel"}</span><strong>{status === "won" ? game.finalScore.toLocaleString("en-IN") : "—"}</strong></div>
            <div className="play-result-actions">
              <button type="button" onClick={game.share}>Share result</button>
              <button type="button" className="secondary" onClick={() => game.toggleVault(answer)}>{game.player.watchlist.includes(answer.id) ? "Saved" : "Save movie"}</button>
              <button type="button" className="secondary" onClick={() => game.startGame({ mode: "practice" }, true)}>{mode === "practice" ? "Next movie" : "Play a practice film"}</button>
            </div>
          </div>
        )}

        <div className={`play-workspace ${guesses.length > 0 ? "has-guesses" : ""}`}>
          <section className="play-board" aria-labelledby="guess-board-title">
            <div className="play-panel-heading"><div><span>Your slate</span><h2 id="guess-board-title">Guesses</h2></div><strong>{guesses.length}<small> / {GAME_RULES.maxGuesses}</small></strong></div>
            <div className="play-grid-head">{GRID_COLUMNS.map((column) => <span key={column}>{column}</span>)}</div>
            {guesses.length === 0 ? (
              <div className="play-empty-board">
                <div>{EMPTY_SIGNALS.map((label) => <span key={label}><i>?</i><small>{label}</small></span>)}</div>
                <strong>Your first guess reveals six signals.</strong>
                <small>Start with any Telugu movie you know.</small>
              </div>
            ) : (
              <div className="play-guess-list">
                {/* Newest first, so the row you just played lands right under the search box. */}
                {guesses.map((guess, row) => (
                  <article className="play-guess" key={guess.id}>
                    <div className="play-guess-title"><span>{String(row + 1).padStart(2, "0")}</span><strong>{guess.title}</strong></div>
                    <div className="play-cells">
                      {game.cells[row].map((cell, index) => (
                        <div className={`play-cell ${cell.result}`} aria-label={`${cell.label}: ${cell.value}. ${cell.resultLabel}. ${cell.note}.`} style={{ animationDelay: `${index * 45}ms` }} key={cell.field}>
                          <small className="play-cell-label">{cell.label}</small>
                          <strong>{cell.value}</strong>
                          <small>{cellHint(cell)}</small>
                        </div>
                      ))}
                    </div>
                  </article>
                )).reverse()}
              </div>
            )}
          </section>

          <aside className="play-tools" aria-label="Game tools">
            <div className="play-panel-heading compact"><div><span>Need a nudge?</span><h2>Clues</h2></div><strong>{game.cluesRemaining}<small> left</small></strong></div>
            <button className="play-clue-button" type="button" onClick={game.revealClue} disabled={!game.canRevealClue} hidden={status !== "playing"}>
              <span>
                <strong>{game.cluesRemaining === 0 ? "All clues used" : !game.hasNextClue ? "Nothing new to reveal" : `Next clue: ${game.nextClueLabel}`}</strong>
                <small>{game.cluesRemaining === 0 ? "Keep guessing" : !game.hasNextClue ? "Your guesses covered them" : `Reveal for ${game.nextClueCost} points`}</small>
              </span>
              <b aria-hidden="true">?</b>
            </button>
            <div className="play-clue-stack">
              {game.visibleClues.length > 0
                ? game.visibleClues.map((clue, index) => <article key={clue.label}><span>Clue {index + 1} · {clue.label}</span><strong>{clue.value}</strong></article>)
                : <div className="play-no-clues"><span>?</span><strong>No clues used</strong><small>You can solve it clean for the full score.</small></div>}
            </div>
            <div className="play-penalties"><span>Scoring</span><p><strong>−{GAME_RULES.guessPenalty}</strong> each extra guess</p><p><strong>−{GAME_RULES.cluePenalties.join(" / ")}</strong> clues</p></div>
          </aside>
        </div>
        {status !== "playing" && (
          <section className="play-stats" aria-labelledby="play-stats-title">
            <div className="play-stats-heading">
              <h2 id="play-stats-title">Your box office</h2>
              {mode === "daily" && <p>Next film in <NextMovieCountdown /></p>}
            </div>
            <StatsPanel stats={game.player.stats} streak={game.streak} highlight={status === "won" ? guesses.length : undefined} />
          </section>
        )}
      </section>
    </main>
  );
}
