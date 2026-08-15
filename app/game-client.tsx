"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ALL_MOVIES, DECADES, GAME_TYPES, MOVIES, gameConfig, movieLane, movieTitleWords, type Decade, type GameType, type Movie } from "./game-data";

type Mode = "daily" | "practice" | "archive";
type Result = "match" | "close" | "miss";
type Modal = "how" | "stats" | "vault" | "archive" | null;

type PlayerStats = {
  played: number;
  wins: number;
  streak: number;
  bestScore: number;
  points: number;
  distribution: number[];
};

type PlayerData = {
  stats: PlayerStats;
  watchlist: string[];
};

const DEFAULT_STATS: PlayerStats = {
  played: 0,
  wins: 0,
  streak: 0,
  bestScore: 0,
  points: 0,
  distribution: [0, 0, 0, 0, 0, 0],
};
const DEFAULT_PLAYER: PlayerData = { stats: DEFAULT_STATS, watchlist: [] };
const PLAYER_KEY = "chitram-player-v2";
const PLAYER_EVENT = "chitram-player-change";

let cachedPlayerJson: string | null = null;
let cachedPlayer = DEFAULT_PLAYER;

function subscribeToPlayer(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PLAYER_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PLAYER_EVENT, callback);
  };
}

function getPlayerSnapshot(): PlayerData {
  const playerJson = localStorage.getItem(PLAYER_KEY);
  if (playerJson === cachedPlayerJson) return cachedPlayer;

  cachedPlayerJson = playerJson;
  try {
    const parsed = playerJson ? JSON.parse(playerJson) : null;
    const legacy = JSON.parse(localStorage.getItem("chitram-stats") || "null");
    cachedPlayer = {
      stats: { ...DEFAULT_STATS, ...(legacy || {}), ...(parsed?.stats || {}) },
      watchlist: Array.isArray(parsed?.watchlist) ? parsed.watchlist : [],
    };
  } catch {
    cachedPlayer = DEFAULT_PLAYER;
  }
  return cachedPlayer;
}

function savePlayer(next: PlayerData) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(PLAYER_EVENT));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/th/g, "t")
    .replace(/sh/g, "s");
}

function puzzleNumber(date: string) {
  return Math.floor(
    (new Date(`${date}T00:00:00+05:30`).getTime() - new Date("2026-01-01T00:00:00+05:30").getTime()) / 86400000,
  ) + 1;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00+05:30`);
  value.setUTCDate(value.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(value);
}

function archiveLabel(date: string, offset: number) {
  const value = new Date(`${shiftDate(date, -offset)}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "Asia/Kolkata" }).format(value);
}

function getResult(field: string, guess: Movie, answer: Movie): Result {
  if (guess.id === answer.id) return "match";
  if (field === "year") return guess.year === answer.year ? "match" : Math.abs(guess.year - answer.year) <= 2 ? "close" : "miss";
  if (field === "hero") return guess.hero === answer.hero ? "match" : guess.family !== "Other" && (answer.family.includes(guess.family) || guess.family.includes(answer.family)) ? "close" : "miss";
  if (field === "director") return guess.director === answer.director ? "match" : "miss";
  if (field === "genres") return guess.genres.join() === answer.genres.join() ? "match" : guess.genres.some((genre) => answer.genres.includes(genre)) ? "close" : "miss";
  if (field === "lane") return movieLane(guess) === movieLane(answer) ? "match" : "miss";
  if (field === "words") {
    const difference = Math.abs(movieTitleWords(guess) - movieTitleWords(answer));
    return difference === 0 ? "match" : difference === 1 ? "close" : "miss";
  }
  return "miss";
}

function resultEmoji(guess: Movie, answer: Movie) {
  return ["year", "hero", "director", "genres", "lane", "words"]
    .map((field) => ({ match: "🟩", close: "🟨", miss: "⬛" })[getResult(field, guess, answer)])
    .join("");
}

function scoreFor(gameType: GameType, guesses: number, hints: number) {
  const base = gameType === "rush" ? 1400 : gameType === "spotlight" ? 1200 : 1000;
  return Math.max(100, base - Math.max(0, guesses - 1) * 140 - hints * 110);
}

function nextPuzzleCountdown() {
  const now = new Date();
  const indiaNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const next = new Date(indiaNow);
  next.setHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((next.getTime() - indiaNow.getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function GameExperience({ initialDate }: { initialDate: string }) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [countdown, setCountdown] = useState("");
  const [decade, setDecade] = useState<Decade>("2010s");
  const [gameType, setGameType] = useState<GameType>("classic");
  const [mode, setMode] = useState<Mode>("daily");
  const [archiveOffset, setArchiveOffset] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(3);
  const [query, setQuery] = useState("");
  const [guesses, setGuesses] = useState<Movie[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [highlight, setHighlight] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const player = useSyncExternalStore(subscribeToPlayer, getPlayerSnapshot, () => DEFAULT_PLAYER);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(nextPuzzleCountdown());
      const nextDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      setCurrentDate((value) => (value === nextDate ? value : nextDate));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pool = MOVIES[decade];
  const config = gameConfig(gameType);
  const answer = useMemo(() => {
    if (mode === "practice") return pool[practiceIndex % pool.length];
    const gameIndex = GAME_TYPES.findIndex((game) => game.id === gameType);
    const seed = puzzleNumber(currentDate) - archiveOffset + DECADES.indexOf(decade) * 17 + gameIndex * 29;
    return pool[Math.abs(seed) % pool.length];
  }, [archiveOffset, currentDate, decade, gameType, mode, pool, practiceIndex]);

  const normalizedQuery = normalize(query);
  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return pool
      .filter((movie) => !guesses.some((guess) => guess.id === movie.id))
      .filter((movie) => [movie.title, ...(movie.aliases || [])].some((name) => normalize(name).includes(normalizedQuery)))
      .sort((a, b) => Number(normalize(b.title).startsWith(normalizedQuery)) - Number(normalize(a.title).startsWith(normalizedQuery)))
      .slice(0, 6);
  }, [guesses, normalizedQuery, pool]);

  const clues = [
    { label: "Story beat", value: answer.storyClue },
    { label: "Release year", value: String(answer.year) },
    { label: "Genre signal", value: answer.genres.join(" / ") },
    { label: "The filmmaker", value: answer.director },
    { label: "Lead billing", value: answer.hero },
  ];
  const earnedClues = gameType === "rush" ? 2 : gameType === "spotlight" ? Math.min(1 + guesses.length, clues.length) : 0;
  const revealedClues = Math.min(clues.length, earnedClues + hintsUsed);
  const potentialScore = scoreFor(gameType, Math.max(1, guesses.length + 1), hintsUsed);
  const guessesLeft = config.maxGuesses - guesses.length;

  const achievements = [
    { name: "First show", detail: "Finish your first game", unlocked: player.stats.played >= 1 },
    { name: "Hat-trick", detail: "Reach a 3-game streak", unlocked: player.stats.streak >= 3 },
    { name: "Blockbuster", detail: "Score 1,000+ in one game", unlocked: player.stats.bestScore >= 1000 },
    { name: "Century club", detail: "Earn 5,000 total points", unlocked: player.stats.points >= 5000 },
  ];

  function resetBoard() {
    setQuery("");
    setGuesses([]);
    setStatus("playing");
    setHighlight(0);
    setHintsUsed(0);
    setFinalScore(0);
    setToast("");
  }

  function startGame(next: { decade?: Decade; gameType?: GameType; mode?: Mode; archiveOffset?: number }) {
    const nextDecade = next.decade ?? decade;
    const nextMode = next.mode ?? mode;
    setDecade(nextDecade);
    setGameType(next.gameType ?? gameType);
    setMode(nextMode);
    setArchiveOffset(next.archiveOffset ?? (nextMode === "archive" ? archiveOffset : 0));
    if (nextMode === "practice") setPracticeIndex(Math.floor(Math.random() * MOVIES[nextDecade].length));
    resetBoard();
    window.setTimeout(() => document.getElementById("game")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function recordResult(won: boolean, guessesUsed: number, score: number) {
    const distribution = [...player.stats.distribution];
    if (won && guessesUsed > 0 && guessesUsed <= distribution.length) distribution[guessesUsed - 1] += 1;
    savePlayer({
      ...player,
      stats: {
        played: player.stats.played + 1,
        wins: player.stats.wins + Number(won),
        streak: won ? player.stats.streak + 1 : 0,
        bestScore: Math.max(player.stats.bestScore, score),
        points: player.stats.points + score,
        distribution,
      },
    });
  }

  function submit(event?: FormEvent, picked?: Movie) {
    event?.preventDefault();
    if (status !== "playing") return;
    const exact = pool.find((movie) => [movie.title, ...(movie.aliases || [])].some((name) => normalize(name) === normalizedQuery));
    const movie = picked || exact || suggestions[highlight] || suggestions[0];
    if (!movie) {
      setToast("Choose a film from the marquee.");
      return;
    }

    const nextGuesses = [...guesses, movie];
    setGuesses(nextGuesses);
    setQuery("");
    setHighlight(0);
    setToast("");
    if (movie.id === answer.id) {
      const score = scoreFor(gameType, nextGuesses.length, hintsUsed);
      setStatus("won");
      setFinalScore(score);
      recordResult(true, nextGuesses.length, score);
    } else if (nextGuesses.length >= config.maxGuesses) {
      setStatus("lost");
      setFinalScore(0);
      recordResult(false, nextGuesses.length, 0);
    }
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setHighlight((value) => Math.min(value + 1, suggestions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Escape") {
      setQuery("");
      setHighlight(0);
    }
  }

  function revealHint() {
    if (revealedClues >= clues.length) {
      setToast("Every clue is already on screen.");
      return;
    }
    setHintsUsed((value) => value + 1);
    setToast("Clue developed. −110 points.");
  }

  function toggleVault(movie: Movie) {
    const exists = player.watchlist.includes(movie.id);
    savePlayer({ ...player, watchlist: exists ? player.watchlist.filter((id) => id !== movie.id) : [...player.watchlist, movie.id] });
    setToast(exists ? "Removed from your vault." : "Saved to your film vault.");
  }

  async function share() {
    const gameName = config.name;
    const text = `Chitram #${puzzleNumber(currentDate) - archiveOffset} · ${gameName} · ${decade}\n${guesses.map((guess) => resultEmoji(guess, answer)).join("\n")}\n${status === "won" ? `${guesses.length}/${config.maxGuesses} · ${finalScore} pts` : `X/${config.maxGuesses}`} · chitram.game`;
    try {
      await navigator.clipboard.writeText(text);
      setToast("Result copied. Send it to the group chat.");
    } catch {
      setToast("Could not copy the result.");
    }
  }

  const modeLabel = mode === "practice" ? "Unlimited rehearsal" : mode === "archive" ? `${archiveLabel(currentDate, archiveOffset)} archive` : "Today's premiere";

  return (
    <main className={`site era-${decade}`}>
      <div className="texture" aria-hidden="true" />

      <header className="topbar">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Chitram home">
          <span className="brand-seal">చి</span>
          <span className="brand-copy"><strong>CHITRAM</strong><small>తెలుగు సినిమా ఆట</small></span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button onClick={() => document.getElementById("game")?.scrollIntoView({ behavior: "smooth" })}>Play</button>
          <button onClick={() => setModal("archive")}>Archive</button>
          <button onClick={() => setModal("vault")}>My vault <span>{player.watchlist.length}</span></button>
        </nav>
        <div className="header-actions">
          <button onClick={() => setModal("stats")} aria-label="Player statistics">↗</button>
          <button onClick={() => setModal("how")} aria-label="How to play">?</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span>NOW PLAYING</span><i /> PUZZLE #{puzzleNumber(currentDate)}</div>
          <h1><span>Guess the</span> blockbuster.</h1>
          <p>The daily Telugu cinema game for people who remember the interval bang, the album, and the banner.</p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => document.getElementById("game")?.scrollIntoView({ behavior: "smooth" })}>Play today&apos;s cut <span>↘</span></button>
            <button className="text-cta" onClick={() => startGame({ mode: "practice" })}>Try unlimited mode</button>
          </div>
          <div className="hero-proof">
            <div><strong>{ALL_MOVIES.length}</strong><span>handpicked films</span></div>
            <div><strong>03</strong><span>game formats</span></div>
            <div><strong>{player.stats.streak.toString().padStart(2, "0")}</strong><span>your streak</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-label="A grand Tollywood-inspired cinema auditorium">
          <div className="film-frame">
            <div className="now-card"><span>01</span><div><small>TODAY&apos;S FEATURE</small><strong>Mystery picture</strong></div></div>
            <div className="rating-stamp"><strong>U/A</strong><span>CINEMA<br />LOVERS</span></div>
            <div className="screening-time"><span>NEXT SHOW</span><strong>{countdown || "MIDNIGHT IST"}</strong></div>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true"><div>కథ • హీరో • దర్శకుడు • సంగీతం • మాస్ • క్లాస్ • బొమ్మ బ్లాక్‌బస్టర్ • కథ • హీరో • దర్శకుడు • సంగీతం • మాస్ • క్లాస్ • బొమ్మ బ్లాక్‌బస్టర్ •</div></div>

      <section className="game-section" id="game">
        <div className="section-heading">
          <div><span className="section-number">01 / THE GAME</span><h2>Your seat is ready.</h2></div>
          <p>Pick a format, choose an era, then read the film one clue at a time.</p>
        </div>

        <div className="format-tabs" role="tablist" aria-label="Game format">
          {GAME_TYPES.map((game, index) => (
            <button key={game.id} role="tab" aria-selected={gameType === game.id} className={gameType === game.id ? "active" : ""} onClick={() => startGame({ gameType: game.id })}>
              <span>0{index + 1}</span><div><strong>{game.name}</strong><small>{game.kicker}</small></div>
            </button>
          ))}
        </div>

        <div className="game-console">
          <div className="console-topline">
            <div className="mode-switch" aria-label="Game mode">
              <button className={mode === "daily" ? "active" : ""} onClick={() => startGame({ mode: "daily", archiveOffset: 0 })}>Daily</button>
              <button className={mode === "practice" ? "active" : ""} onClick={() => startGame({ mode: "practice" })}>Unlimited</button>
              <button className={mode === "archive" ? "active" : ""} onClick={() => setModal("archive")}>Archive</button>
            </div>
            <span className="mode-label"><i /> {modeLabel}</span>
          </div>

          <div className="console-grid">
            <div className="play-panel">
              <div className="era-row">
                <div><span className="micro-label">SELECT AN ERA</span><div className="era-tabs">{DECADES.map((item) => <button key={item} className={decade === item ? "active" : ""} onClick={() => startGame({ decade: item })}>{item}</button>)}</div></div>
                <div className="live-score"><span>MAX SCORE</span><strong>{potentialScore.toLocaleString("en-IN")}</strong><small>− points with guesses & hints</small></div>
              </div>

              {revealedClues > 0 && (
                <div className="clue-reel">
                  <div className="micro-label">DEVELOPED CLUES</div>
                  <div className="clue-track">{clues.slice(0, revealedClues).map((clue, index) => <article key={clue.label}><span>0{index + 1} / {clue.label}</span><strong>{clue.value}</strong></article>)}</div>
                </div>
              )}

              {status === "playing" ? (
                <form className="search-area" onSubmit={(event) => submit(event)}>
                  <label htmlFor="film-search">Your next guess</label>
                  <div className="search-box">
                    <span aria-hidden="true">⌕</span>
                    <input id="film-search" role="combobox" value={query} onChange={(event) => { setQuery(event.target.value); setHighlight(0); setToast(""); }} onKeyDown={onSearchKeyDown} aria-label="Search Telugu films" aria-autocomplete="list" aria-controls="film-suggestions" aria-expanded={suggestions.length > 0} autoComplete="off" placeholder="Type a Telugu film title..." />
                    <button type="submit">Lock it in <span>→</span></button>
                  </div>
                  {suggestions.length > 0 && <div className="suggestions" id="film-suggestions" role="listbox">{suggestions.map((movie, index) => <button type="button" role="option" aria-selected={index === highlight} className={index === highlight ? "highlight" : ""} key={movie.id} onMouseDown={() => submit(undefined, movie)}><span><strong>{movie.title}</strong><small>{movie.director}</small></span><em>{movie.year}</em></button>)}</div>}
                  {toast && <div className="toast" role="status">{toast}</div>}
                </form>
              ) : (
                <div className={`result-card ${status}`}>
                  <div className="result-verdict"><span>{status === "won" ? "BOMMA BLOCKBUSTER" : "END CREDITS"}</span><strong>{answer.title}</strong><small>{answer.year} · {answer.hero} · A {answer.director} film</small></div>
                  <div className="result-score"><span>{status === "won" ? "FINAL SCORE" : "BETTER LUCK NEXT SHOW"}</span><strong>{status === "won" ? finalScore.toLocaleString("en-IN") : "—"}</strong></div>
                  <div className="result-buttons"><button onClick={share}>Share result</button><button className="secondary" onClick={() => toggleVault(answer)}>{player.watchlist.includes(answer.id) ? "Saved to vault" : "+ Save film"}</button>{mode === "practice" && <button className="secondary" onClick={() => startGame({ mode: "practice" })}>Next film</button>}</div>
                  {toast && <div className="toast result-toast" role="status">{toast}</div>}
                </div>
              )}

              <div className="clue-board">
                <div className="grid-head">{["YEAR", "LEAD", "DIRECTOR", "GENRE", "FILM LANE", "TITLE SIZE"].map((column) => <span key={column}>{column}</span>)}</div>
                {guesses.length === 0 ? (
                  <div className="empty-board"><div className="reel-icon">◉</div><strong>The projector is rolling</strong><span>Your comparison clues will develop here after the first guess.</span></div>
                ) : (
                  <div className="guess-list">{guesses.map((guess, row) => {
                    const cells = [
                      { field: "year", value: String(guess.year), sub: guess.year < answer.year ? "↑ LATER" : guess.year > answer.year ? "↓ EARLIER" : "EXACT" },
                      { field: "hero", value: guess.hero, sub: getResult("hero", guess, answer) === "close" ? "SAME FILM FAMILY" : "LEAD" },
                      { field: "director", value: guess.director, sub: "DIRECTOR" },
                      { field: "genres", value: guess.genres.join(" / "), sub: getResult("genres", guess, answer) === "close" ? "GENRE OVERLAP" : "GENRE" },
                      { field: "lane", value: movieLane(guess), sub: "FILM LANE" },
                      { field: "words", value: `${movieTitleWords(guess)} ${movieTitleWords(guess) === 1 ? "WORD" : "WORDS"}`, sub: getResult("words", guess, answer) === "close" ? "OFF BY ONE" : "TITLE SIZE" },
                    ];
                    return <div className="guess-row" key={guess.id}><div className="guess-title"><span>TAKE {String(row + 1).padStart(2, "0")}</span><strong>{guess.title}</strong></div><div className="cells">{cells.map((cell, index) => <div className={`cell ${getResult(cell.field, guess, answer)}`} style={{ animationDelay: `${index * 80}ms` }} key={cell.field}><strong>{cell.value}</strong><small>{cell.sub}</small></div>)}</div></div>;
                  })}</div>
                )}
              </div>
            </div>

            <aside className="game-sidebar">
              <section className="progress-card">
                <div className="side-title"><span>YOUR RUN</span><small>{guessesLeft} {guessesLeft === 1 ? "take" : "takes"} left</small></div>
                <div className="take-pips">{Array.from({ length: config.maxGuesses }).map((_, index) => <span key={index} className={index < guesses.length ? (guesses[index].id === answer.id ? "won" : "used") : ""}>{String(index + 1).padStart(2, "0")}</span>)}</div>
                <div className="legend"><span><i className="green" /> Match</span><span><i className="amber" /> Close</span><span><i /> Miss</span></div>
              </section>
              <section className="hint-card">
                <span className="micro-label">PROJECTION BOOTH</span>
                <h3>Need another frame?</h3>
                <p>Develop a story, year, genre, filmmaker or lead clue. Each costs 110 points.</p>
                <button onClick={revealHint} disabled={status !== "playing" || revealedClues >= clues.length}><span>✦</span> Reveal clue <small>{hintsUsed}/3 used</small></button>
              </section>
              <section className="daily-card">
                <div><span>DAILY CALL SHEET</span><strong>#{puzzleNumber(currentDate) - archiveOffset}</strong></div>
                <dl><div><dt>Format</dt><dd>{config.name}</dd></div><div><dt>Era</dt><dd>{decade}</dd></div><div><dt>Difficulty</dt><dd>{answer.difficulty}</dd></div><div><dt>Resets</dt><dd>{countdown || "Midnight IST"}</dd></div></dl>
              </section>
            </aside>
          </div>
        </div>
      </section>

      <section className="formats-section">
        <div className="section-heading"><div><span className="section-number">02 / MORE WAYS TO PLAY</span><h2>One obsession. Three cuts.</h2></div><p>From a slow-burn investigation to a first-day rush, choose your kind of cinema brain.</p></div>
        <div className="format-cards">{GAME_TYPES.map((game, index) => <article key={game.id} className={game.id}><span className="card-index">0{index + 1}</span><div><small>{game.kicker}</small><h3>{game.name}</h3><p>{game.description}</p></div><button onClick={() => startGame({ gameType: game.id })} aria-label={`Play ${game.name}`}>↗</button></article>)}</div>
      </section>

      <section className="archive-strip">
        <div><span className="section-number">03 / THE ARCHIVE</span><h2>Missed a show?</h2><p>Rewind the last seven daily puzzles. Your streak stays intact; your pride may not.</p></div>
        <div className="archive-tickets">{Array.from({ length: 7 }).map((_, index) => <button key={index} onClick={() => startGame({ mode: "archive", archiveOffset: index + 1 })}><small>{archiveLabel(currentDate, index + 1)}</small><strong>#{puzzleNumber(currentDate) - index - 1}</strong><span>PLAY ↗</span></button>)}</div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand"><span className="brand-seal">చి</span><div><strong>CHITRAM</strong><small>Made for Telugu cinema people.</small></div></div>
        <p>From the first whistle to the final frame.</p>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button>
      </footer>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className={`modal modal-${modal}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Close">×</button>
        {modal === "how" && <><span className="modal-kicker">HOUSE RULES</span><h2 id="modal-title">Read the cinema.</h2><p className="modal-intro">Search any film from the selected era. Every guess compares six details with the mystery picture.</p><div className="rule-list"><div><i className="green" /><strong>Exact match</strong><span>You are on the money.</span></div><div><i className="amber" /><strong>Close connection</strong><span>Nearby year, shared genre or film family.</span></div><div><i /><strong>No connection</strong><span>Take the next guess in another direction.</span></div></div><p className="modal-note">Arrows point toward an earlier or later release. Hints cost points but never a guess.</p></>}
        {modal === "stats" && <><span className="modal-kicker">YOUR BOX OFFICE</span><h2 id="modal-title">The numbers don&apos;t lie.</h2><div className="big-stats"><div><strong>{player.stats.played}</strong><span>PLAYED</span></div><div><strong>{player.stats.played ? Math.round(player.stats.wins / player.stats.played * 100) : 0}%</strong><span>WIN RATE</span></div><div><strong>{player.stats.streak}</strong><span>STREAK</span></div><div><strong>{player.stats.bestScore.toLocaleString("en-IN")}</strong><span>BEST</span></div></div><h3 className="modal-subhead">Guess distribution</h3><div className="distribution">{player.stats.distribution.map((value, index) => <div key={index}><span>{index + 1}</span><i style={{ width: `${Math.max(8, value / Math.max(1, ...player.stats.distribution) * 100)}%` }} /><strong>{value}</strong></div>)}</div><h3 className="modal-subhead">Achievements</h3><div className="achievement-grid">{achievements.map((achievement) => <div key={achievement.name} className={achievement.unlocked ? "unlocked" : ""}><span>{achievement.unlocked ? "✦" : "○"}</span><strong>{achievement.name}</strong><small>{achievement.detail}</small></div>)}</div></>}
        {modal === "archive" && <><span className="modal-kicker">SEVEN-DAY ARCHIVE</span><h2 id="modal-title">Rewind the reel.</h2><p className="modal-intro">Choose a previous daily puzzle. Archive plays use your currently selected game format and era.</p><div className="modal-archive">{Array.from({ length: 7 }).map((_, index) => <button key={index} onClick={() => { setModal(null); startGame({ mode: "archive", archiveOffset: index + 1 }); }}><span>{archiveLabel(currentDate, index + 1)}</span><strong>Puzzle #{puzzleNumber(currentDate) - index - 1}</strong><small>PLAY NOW →</small></button>)}</div></>}
        {modal === "vault" && <><span className="modal-kicker">MY FILM VAULT</span><h2 id="modal-title">Saved for interval.</h2><p className="modal-intro">Keep a personal list of films revealed during play. It stays on this device.</p>{player.watchlist.length ? <div className="vault-grid">{player.watchlist.map((id) => ALL_MOVIES.find((movie) => movie.id === id)).filter((movie): movie is Movie => Boolean(movie)).map((movie) => <article key={movie.id}><div className="vault-poster"><span>{movie.year}</span><strong>{movie.title.slice(0, 1)}</strong></div><div><strong>{movie.title}</strong><small>{movie.director}</small><button onClick={() => toggleVault(movie)}>Remove</button></div></article>)}</div> : <div className="empty-vault"><span>◎</span><strong>No films saved yet.</strong><p>Finish a game and add the reveal to your vault.</p></div>}</>}
      </section></div>}
    </main>
  );
}
