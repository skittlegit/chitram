"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { GAME_RULES } from "./game-data";
import { ARCHIVE_DAYS, archiveLabel, ERAS, gameHistoryKey, puzzleNumber } from "./game-logic";
import { GameLoading, GameToast, MoviePoster, NextMovieCountdown, StatsPanel } from "./game-ui";
import { useGame } from "./use-game";

const GRID_COLUMNS = ["Year", "Lead", "Director", "Genre", "Movie type", "Title length"];

export default function HomeExperience({ initialDate }: { initialDate: string }) {
  const resultRef = useRef<HTMLDivElement>(null);
  const game = useGame(initialDate, resultRef);
  const { answer, guesses, status, mode, decade, archiveOffset, currentDate, player } = game;
  const todayPuzzle = puzzleNumber(currentDate);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" }), 80);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main id="top" className="site">
      <a className="skip-link" href="#game">Skip to the game</a>
      <GameToast game={game} />

      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand wordmark" href="#top" aria-label="Chitram home">Chitram</a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span lang="te">తెలుగు సినిమా</span><strong>Daily puzzle #{todayPuzzle}</strong></div>
          <h1>A movie is hiding <em>in plain sight.</em></h1>
          <p>Name today&apos;s mystery Telugu film. Every guess develops the picture—year, cast, genre and more—until the title comes into focus.</p>
          <div className="hero-actions">
            <Link className="primary-cta" href="/game" prefetch>Play today&apos;s game <span>→</span></Link>
            <button className="secondary-cta" onClick={() => game.startGame({ mode: "practice" }, true)}>Try a practice film</button>
          </div>
          <div className="hero-facts">
            <span><strong>{game.totalMovies}</strong> films</span>
            <span><strong>27</strong> years of cinema</span>
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

      <section className="game-section section-target" id="game" tabIndex={-1}>
        <div className="section-heading">
          <div><span className="section-kicker">The guessing room</span><h2>Roll the clues.</h2></div>
          <p><strong>{game.modeLabel}.</strong> {GAME_RULES.description}</p>
        </div>

        <div className="game-shell">
          {game.pendingGame && (
            <div className="restart-notice" role="alert">
              <div><strong>Start a different game?</strong><span>Your current guesses will be cleared.</span></div>
              <div>
                <button type="button" onClick={() => game.applyGame(game.pendingGame!)}>Start new game</button>
                <button type="button" className="secondary" onClick={() => game.setPendingGame(null)}>Keep playing</button>
              </div>
            </div>
          )}
          <button className="settings-summary" type="button" aria-controls="game-settings" aria-expanded={game.settingsOpen} onClick={() => game.setSettingsOpen((value) => !value)}>
            <span><small>Game setup</small><strong>{game.gameSetupLabel}</strong></span>
            <span aria-hidden="true">{game.settingsOpen ? "Close −" : "Change +"}</span>
          </button>
          <div className={`game-setup ${game.settingsOpen ? "open" : ""}`} id="game-settings">
            <fieldset>
              <legend>Mode</legend>
              <div className="setup-options mode-options">
                <button type="button" aria-pressed={mode === "daily"} className={mode === "daily" ? "active" : ""} onClick={() => game.startGame({ mode: "daily", archiveOffset: 0 })}>Daily</button>
                <button type="button" aria-pressed={mode === "practice"} className={mode === "practice" ? "active" : ""} onClick={() => game.startGame({ mode: "practice" })}>Practice</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Movies from</legend>
              <div className="setup-options era-options">
                {ERAS.map((item) => <button type="button" key={item} aria-pressed={decade === item} className={decade === item ? "active" : ""} onClick={() => game.startGame({ decade: item })}>{item}</button>)}
              </div>
            </fieldset>
          </div>

          <div className="game-statusbar">
            <div className="run-progress">
              <span>{game.guessesLeft} {game.guessesLeft === 1 ? "guess" : "guesses"} left · −{GAME_RULES.guessPenalty} after each miss</span>
              <div className="take-pips" aria-label={`${guesses.length} of ${GAME_RULES.maxGuesses} guesses used`}>
                {Array.from({ length: GAME_RULES.maxGuesses }).map((_, index) => <i key={index} className={index < guesses.length ? (status === "won" && index === guesses.length - 1 ? "won" : "used") : ""} />)}
              </div>
            </div>
            <div className="score-summary"><span>Score now</span><strong>{game.potentialScore.toLocaleString("en-IN")}</strong></div>
            <button className="clue-button" type="button" onClick={game.revealClue} disabled={!game.canRevealClue}>
              <strong>{game.cluesRemaining === 0 ? "Clues used" : !game.hasNextClue ? "No useful clues" : "Get a clue"}</strong>
              <small>{game.cluesRemaining === 0 ? "All clues used" : !game.hasNextClue ? "Already covered by your guesses" : `${game.cluesRemaining} remaining · −${GAME_RULES.cluePenalty} pts`}</small>
            </button>
          </div>

          {game.visibleClues.length > 0 && (
            <div className="clue-reel">
              <span className="content-label">Clues you requested</span>
              <div className="clue-track">{game.visibleClues.map((clue) => <article key={clue.label}><span>{clue.label}</span><strong>{clue.value}</strong></article>)}</div>
            </div>
          )}

          <div className="play-area">
            {!game.ready ? (
              <GameLoading game={game} />
            ) : status === "playing" || !answer ? (
              <form className="search-area" onSubmit={(event) => game.submit(event)}>
                <div className="search-heading"><label htmlFor="film-search">Put a title on the slate</label><span>Search {game.pool.length} Telugu films</span></div>
                {guesses.length > 0 && (
                  <div className="guess-memory" aria-label={`${guesses.length} previous guesses`}>
                    <div><span>On your slate</span><small>{guesses.length}/{GAME_RULES.maxGuesses}</small></div>
                    <ol>{guesses.map((guess, index) => <li key={guess.id}><span>{index + 1}</span><strong>{guess.title}</strong><small>{guess.year}</small></li>)}</ol>
                  </div>
                )}
                <div className="search-box">
                  <span aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 4.25 4.25" /></svg></span>
                  <input
                    id="film-search"
                    role="combobox"
                    value={game.query}
                    onChange={(event) => game.changeQuery(event.target.value)}
                    onKeyDown={game.onSearchKeyDown}
                    aria-autocomplete="list"
                    aria-controls="film-suggestions"
                    aria-expanded={game.suggestions.length > 0}
                    aria-activedescendant={game.highlight >= 0 && game.suggestions[game.highlight] ? `film-option-${game.suggestions[game.highlight].id}` : undefined}
                    autoComplete="off"
                    placeholder="Try a film title…"
                  />
                  <button type="submit" disabled={game.pending}>{game.pending ? "Checking…" : "Roll"}</button>
                </div>
                {game.suggestions.length > 0 && (
                  <div className="suggestions" id="film-suggestions" role="listbox" aria-label="Movie suggestions">
                    {game.suggestions.map((movie, index) => (
                      <button type="button" role="option" id={`film-option-${movie.id}`} aria-selected={index === game.highlight} tabIndex={-1} className={index === game.highlight ? "highlight" : ""} key={movie.id} onMouseDown={(event) => event.preventDefault()} onClick={() => game.submit(undefined, movie)}>
                        <MoviePoster movie={movie} className="suggestion-poster" />
                        <span className="suggestion-copy"><strong>{movie.title}</strong><small>{movie.director}</small></span>
                        <em>{movie.year}</em>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            ) : (
              <div className={`result-card ${status}`} ref={resultRef} role="status" aria-live="polite" tabIndex={-1}>
                <div className="result-reveal">
                  <MoviePoster movie={answer} className="result-poster" />
                  <div className="result-verdict"><span>{status === "won" ? "You got it!" : "The movie was"}</span><strong>{answer.title}</strong><small>{answer.year} · {answer.hero}<br />Directed by {answer.director}</small></div>
                </div>
                <div className="result-score"><span>{status === "won" ? "Your score" : "Try another movie"}</span><strong>{status === "won" ? game.finalScore.toLocaleString("en-IN") : "—"}</strong></div>
                <div className="result-buttons">
                  <button type="button" onClick={game.share}>Share result</button>
                  <button type="button" className="secondary" onClick={() => game.toggleVault(answer)}>{player.watchlist.includes(answer.id) ? "Saved" : "Save movie"}</button>
                  {mode === "practice" && <button type="button" className="secondary" onClick={() => game.startGame({ mode: "practice" }, true)}>Next movie</button>}
                </div>
              </div>
            )}

            <div className="clue-board">
              <div className="grid-head">{GRID_COLUMNS.map((column) => <span key={column}>{column}</span>)}</div>
              {guesses.length === 0 ? (
                <div className="empty-board"><span>Your first guess opens the scene.</span><small>Exact matches, near misses and wrong turns will appear here.</small></div>
              ) : (
                <div className="guess-list">
                  {guesses.map((guess, row) => (
                    <div className="guess-row" key={guess.id}>
                      <div className="guess-title"><span>Guess {row + 1}</span><strong>{guess.title}</strong></div>
                      <div className="cells">
                        {game.cells[row].map((cell, index) => (
                          <div className={`cell ${cell.result}`} aria-label={`${cell.label}: ${cell.value}. ${cell.resultLabel}. ${cell.note}.`} style={{ animationDelay: `${index * 45}ms` }} key={cell.field}>
                            <small className="cell-label">{cell.label}</small>
                            <strong>{cell.value}</strong>
                            <small className="cell-result">{cell.resultLabel}</small>
                            <small className="cell-note">{cell.note}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="quick-guide section-target" id="how" tabIndex={-1}>
        <div className="guide-heading"><span>Three scenes</span><h2>How the story unfolds.</h2></div>
        <div className="guide-grid">
          <article><span>01</span><div><strong>Start at {GAME_RULES.baseScore.toLocaleString("en-IN")}</strong><p>Everyone gets the same game. Each miss costs {GAME_RULES.guessPenalty} points and every clue costs {GAME_RULES.cluePenalty}.</p></div></article>
          <article><span>02</span><div><strong>Call your shot</strong><p>Search any film. Each guess compares six signals with the mystery title.</p></div></article>
          <article><span>03</span><div><strong>Read the colour</strong><p><i className="key exact" /> Exact <i className="key close" /> Close <i className="key miss" /> Miss</p></div></article>
        </div>
      </section>

      <section className="library-section section-target" tabIndex={-1}>
        <div className="section-heading"><div><span className="section-kicker">Your cinema</span><h2>Keep the reel going.</h2></div><p>Revisit an old puzzle, follow your form, or return to a film you saved.</p></div>
        <div className="utility-grid">
          <section className="utility-card archive-card section-target" id="archive" tabIndex={-1}>
            <div className="utility-heading"><div><span>Previous shows</span><h3>Seven days on the reel</h3></div><small>Archive games do not affect your streak.</small></div>
            <div className="archive-list">
              {Array.from({ length: ARCHIVE_DAYS }).map((_, index) => {
                const offset = index + 1;
                const completed = player.completedGames[gameHistoryKey(currentDate, offset, decade)];
                const isCurrent = mode === "archive" && archiveOffset === offset;
                const stateLabel = isCurrent
                  ? completed ? "Finished · current game" : "Playing now →"
                  : completed
                    ? completed.result === "won" ? `Finished · ${completed.score.toLocaleString("en-IN")} pts` : "Finished · Missed"
                    : "Play →";
                return (
                  <button
                    key={offset}
                    className={`${isCurrent ? "current" : ""} ${completed ? "completed" : ""}`.trim()}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`${archiveLabel(currentDate, offset)}, puzzle ${todayPuzzle - offset}. ${stateLabel}`}
                    onClick={() => game.startGame({ mode: "archive", archiveOffset: offset })}
                  ><span>{archiveLabel(currentDate, offset)}</span><strong>#{todayPuzzle - offset}</strong><small>{stateLabel}</small></button>
                );
              })}
            </div>
          </section>

          <section className="utility-card progress-card section-target" id="progress" tabIndex={-1}>
            <div className="utility-heading"><div><span>Scorecard</span><h3>Your box office</h3></div></div>
            <StatsPanel stats={player.stats} streak={game.streak} highlight={status === "won" ? guesses.length : undefined} />
          </section>

          <section className="utility-card vault-card section-target" id="vault" tabIndex={-1}>
            <div className="utility-heading"><div><span>Watchlist</span><h3>Films for later</h3></div><small>Saved only on this device.</small></div>
            {game.savedMovies.length ? (
              <div className="vault-grid">
                {game.savedMovies.map((movie) => (
                  <article key={movie.id}>
                    <MoviePoster movie={movie} className="vault-poster" />
                    <div><strong>{movie.title}</strong><small>{movie.year} · {movie.director}</small><button type="button" onClick={() => game.toggleVault(movie)}>Remove</button></div>
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
