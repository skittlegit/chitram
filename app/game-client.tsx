"use client";

import Image from "next/image";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ALL_MOVIES, DECADES, GAME_TYPES, MOVIES, gameConfig, movieLane, movieTitleWords, type Decade, type GameType, type Movie } from "./game-data";

type Mode = "daily" | "practice" | "archive";
type Result = "match" | "close" | "miss";
type Era = Decade | "All";
type ClueField = "year" | "genres" | "director" | "hero" | "lane";
type GameSelection = { decade?: Era; gameType?: GameType; mode?: Mode; archiveOffset?: number };

const ERAS: Era[] = ["All", ...DECADES];
const MAX_PAID_HINTS = 3;

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

function moviesForEra(era: Era) {
  return era === "All" ? ALL_MOVIES : MOVIES[era];
}

function eraLabel(era: Era) {
  return era === "All" ? "All eras" : era;
}

function MoviePoster({ movie, className = "" }: { movie: Movie; className?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={`movie-poster ${className}`}>
      <span className="poster-fallback" aria-hidden="true"><b>{movie.title.slice(0, 1)}</b><small>{movie.year}</small></span>
      {!failed && (
        <Image
          src={`/api/poster?id=${encodeURIComponent(movie.id)}`}
          alt={`${movie.title} (${movie.year}) poster`}
          fill
          sizes={className === "result-poster" ? "110px" : "60px"}
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function NextMovieCountdown() {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const update = () => setCountdown(nextPuzzleCountdown());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <strong>{countdown || "Midnight IST"}</strong>;
}

export default function GameExperience({ initialDate }: { initialDate: string }) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [decade, setDecade] = useState<Era>("All");
  const [gameType, setGameType] = useState<GameType>("classic");
  const [mode, setMode] = useState<Mode>("daily");
  const [archiveOffset, setArchiveOffset] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(3);
  const [query, setQuery] = useState("");
  const [guesses, setGuesses] = useState<Movie[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [highlight, setHighlight] = useState(-1);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [toast, setToast] = useState("");
  const [undoMovie, setUndoMovie] = useState<Movie | null>(null);
  const [pendingGame, setPendingGame] = useState<GameSelection | null>(null);
  const [activeSection, setActiveSection] = useState("top");
  const resultRef = useRef<HTMLDivElement>(null);
  const player = useSyncExternalStore(subscribeToPlayer, getPlayerSnapshot, () => DEFAULT_PLAYER);

  useEffect(() => {
    const updateDate = () => {
      const nextDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      setCurrentDate((value) => (value === nextDate ? value : nextDate));
    };
    updateDate();
    const timer = window.setInterval(updateDate, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast("");
      setUndoMovie(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (status !== "playing") window.requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
  }, [status]);

  useEffect(() => {
    const sections = ["how", "game", "archive", "progress", "vault"]
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-24% 0px -58%", threshold: [0, 0.15, 0.35] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const pool = moviesForEra(decade);
  const config = gameConfig(gameType);
  const answer = useMemo(() => {
    if (mode === "practice") return pool[practiceIndex % pool.length];
    const gameIndex = GAME_TYPES.findIndex((game) => game.id === gameType);
    const eraIndex = decade === "All" ? 0 : DECADES.indexOf(decade) + 1;
    const seed = puzzleNumber(currentDate) - archiveOffset + eraIndex * 17 + gameIndex * 29;
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

  const clues: { label: string; value: string; field?: ClueField }[] = [
    answer.lane
      ? { label: "Film lane", value: movieLane(answer), field: "lane" }
      : { label: "Story beat", value: answer.storyClue },
    { label: "Release year", value: String(answer.year), field: "year" },
    { label: "Genre signal", value: answer.genres.join(" / "), field: "genres" },
    { label: "The filmmaker", value: answer.director, field: "director" },
    { label: "Lead billing", value: answer.hero, field: "hero" },
  ];
  const knownClueFields = new Set<ClueField>(
    (["year", "genres", "director", "hero", "lane"] as ClueField[]).filter((field) =>
      guesses.some((guess) => getResult(field, guess, answer) === "match"),
    ),
  );
  const availableClues = clues.filter((clue) => !clue.field || !knownClueFields.has(clue.field));
  const earnedClues = gameType === "rush" ? 2 : gameType === "spotlight" ? 1 + guesses.length : 0;
  const visibleClues = availableClues.slice(0, earnedClues + hintsUsed);
  const revealedClues = visibleClues.length;
  const canRevealHint = status === "playing" && hintsUsed < MAX_PAID_HINTS && visibleClues.length < availableClues.length;
  const potentialScore = scoreFor(gameType, Math.max(1, guesses.length + 1), hintsUsed);
  const guessesLeft = config.maxGuesses - guesses.length;

  function resetBoard() {
    setQuery("");
    setGuesses([]);
    setStatus("playing");
    setHighlight(-1);
    setHintsUsed(0);
    setFinalScore(0);
    setToast("");
  }

  function scrollToSection(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
    setActiveSection(id);
  }

  function applyGame(next: GameSelection) {
    const nextDecade = next.decade ?? decade;
    const nextMode = next.mode ?? mode;
    setDecade(nextDecade);
    setGameType(next.gameType ?? gameType);
    setMode(nextMode);
    setArchiveOffset(next.archiveOffset ?? (nextMode === "archive" ? archiveOffset : 0));
    if (nextMode === "practice") setPracticeIndex(Math.floor(Math.random() * moviesForEra(nextDecade).length));
    resetBoard();
    setPendingGame(null);
    window.setTimeout(() => scrollToSection("game"), 0);
  }

  function startGame(next: GameSelection, force = false) {
    const nextDecade = next.decade ?? decade;
    const nextGameType = next.gameType ?? gameType;
    const nextMode = next.mode ?? mode;
    const nextArchiveOffset = next.archiveOffset ?? (nextMode === "archive" ? archiveOffset : 0);
    const changesGame = nextDecade !== decade || nextGameType !== gameType || nextMode !== mode || nextArchiveOffset !== archiveOffset;

    if (!changesGame && !force) return;
    if (guesses.length > 0 && status === "playing" && !force) {
      setPendingGame(next);
      scrollToSection("game");
      return;
    }
    applyGame(next);
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
    const movie = picked || (highlight >= 0 ? suggestions[highlight] : undefined) || exact || suggestions[0];
    if (!movie) {
      setToast("Choose a film from the suggestions.");
      return;
    }

    const nextGuesses = [...guesses, movie];
    setGuesses(nextGuesses);
    setQuery("");
    setHighlight(-1);
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
      setHighlight(-1);
    }
  }

  function revealHint() {
    if (!canRevealHint) {
      setToast("Every useful clue is already known or on screen.");
      return;
    }
    setHintsUsed((value) => value + 1);
    setToast("Clue developed. −110 points.");
  }

  function toggleVault(movie: Movie) {
    const exists = player.watchlist.includes(movie.id);
    savePlayer({ ...player, watchlist: exists ? player.watchlist.filter((id) => id !== movie.id) : [...player.watchlist, movie.id] });
    setUndoMovie(exists ? movie : null);
    setToast(exists ? "Removed from your vault." : "Saved to your film vault.");
  }

  function undoVaultRemoval() {
    if (!undoMovie || player.watchlist.includes(undoMovie.id)) return;
    savePlayer({ ...player, watchlist: [...player.watchlist, undoMovie.id] });
    setToast(`${undoMovie.title} restored.`);
    setUndoMovie(null);
  }

  async function share() {
    const gameName = config.name;
    const text = `Chitram #${puzzleNumber(currentDate) - archiveOffset} · ${gameName} · ${eraLabel(decade)}\n${guesses.map((guess) => resultEmoji(guess, answer)).join("\n")}\n${status === "won" ? `${guesses.length}/${config.maxGuesses} · ${finalScore} pts` : `X/${config.maxGuesses}`} · chitram.game`;
    try {
      await navigator.clipboard.writeText(text);
      setToast("Result copied. Send it to the group chat.");
    } catch {
      setToast("Could not copy the result.");
    }
  }

  const modeLabel = mode === "practice" ? "Unlimited rehearsal" : mode === "archive" ? `${archiveLabel(currentDate, archiveOffset)} archive` : "Today's premiere";
  const savedMovies = player.watchlist
    .map((id) => ALL_MOVIES.find((movie) => movie.id === id))
    .filter((movie): movie is Movie => Boolean(movie));

  return (
    <main id="top" className={`site ${decade === "All" ? "era-all" : `era-${decade}`}`}>
      {toast && <div className="global-toast" role="status" aria-live="polite"><span>{toast}</span>{undoMovie && <button type="button" onClick={undoVaultRemoval}>Undo</button>}</div>}

      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="Chitram home">
            <span className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 44 44" focusable="false"><path d="M8 15h28v21H8z" /><path d="m9 15 5-7h8l-5 7m8 0 5-7h5l1 7" /><path d="m18 21 10 6-10 6z" /></svg>
            </span>
            <span className="brand-copy"><strong>Chitram</strong><small>Telugu movie game</small></span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <a className={activeSection === "game" ? "nav-primary" : ""} aria-current={activeSection === "game" ? "location" : undefined} href="#game" onClick={() => setActiveSection("game")}>Play</a>
            <a className={activeSection === "how" ? "nav-primary" : ""} aria-current={activeSection === "how" ? "location" : undefined} href="#how" onClick={() => setActiveSection("how")}>How it works</a>
            <a className={activeSection === "archive" ? "nav-primary" : ""} aria-current={activeSection === "archive" ? "location" : undefined} href="#archive" onClick={() => setActiveSection("archive")}>Archive</a>
            <a className={activeSection === "vault" ? "nav-primary" : ""} aria-current={activeSection === "vault" ? "location" : undefined} href="#vault" onClick={() => setActiveSection("vault")}>Saved <span>{player.watchlist.length}</span></a>
          </nav>
          <a className="streak-button" href="#progress" aria-label={`${player.stats.streak} day streak. View progress.`}>
            <span>{player.stats.streak}</span><small>day streak</small>
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span>Today&apos;s game</span> Puzzle #{puzzleNumber(currentDate)}</div>
          <h1>How well do you know <em>Telugu cinema?</em></h1>
          <p>Guess the mystery movie using its year, cast, director and genre. You get six tries, and there is a new film every day.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#game">Play today&apos;s movie <span>→</span></a>
            <button className="secondary-cta" onClick={() => startGame({ mode: "practice" }, true)}>Practice without limits</button>
          </div>
          <div className="hero-facts">
            <span><strong>{ALL_MOVIES.length}</strong> movies</span>
            <span><strong>2000–2025</strong> releases</span>
            <span><strong>Free</strong> to play</span>
          </div>
        </div>
        <div className="hero-visual" role="img" aria-label="A cinema auditorium ready for a Telugu film">
          <div className="hero-show-card">
            <div><span>Now playing</span><strong>Mystery Movie</strong></div>
            <div><span>Next movie in</span><NextMovieCountdown /></div>
          </div>
        </div>
      </section>

      <section className="quick-guide section-target" id="how" tabIndex={-1}>
        <div className="guide-heading"><span>How to play</span><h2>Three simple steps.</h2></div>
        <div className="guide-grid">
          <article><span>1</span><div><strong>Choose your game</strong><p>Play today&apos;s movie or practise from any decade.</p></div></article>
          <article><span>2</span><div><strong>Search and guess</strong><p>Pick a Telugu film from the catalogue. Every guess gives you more information.</p></div></article>
          <article><span>3</span><div><strong>Follow the colours</strong><p><i className="key exact" /> Exact match <i className="key close" /> Close <i className="key miss" /> Not a match</p></div></article>
        </div>
      </section>

      <section className="game-section section-target" id="game" tabIndex={-1}>
        <div className="section-heading">
          <div><span className="section-kicker">Play</span><h2>Guess the movie.</h2></div>
          <p>{modeLabel}. {config.description}</p>
        </div>

        <div className="game-shell">
          {pendingGame && <div className="restart-notice" role="alert"><div><strong>Start a different game?</strong><span>Your current guesses will be cleared.</span></div><div><button type="button" onClick={() => applyGame(pendingGame)}>Start new game</button><button type="button" className="secondary" onClick={() => setPendingGame(null)}>Keep playing</button></div></div>}
          <div className="game-setup">
            <fieldset>
              <legend>Game style</legend>
              <div className="setup-options format-options">
                {GAME_TYPES.map((game) => <button type="button" key={game.id} aria-pressed={gameType === game.id} className={gameType === game.id ? "active" : ""} onClick={() => startGame({ gameType: game.id })}><strong>{game.name}</strong><small>{game.maxGuesses} guesses</small></button>)}
              </div>
            </fieldset>
            <fieldset>
              <legend>Mode</legend>
              <div className="setup-options mode-options">
                <button type="button" aria-pressed={mode === "daily"} className={mode === "daily" ? "active" : ""} onClick={() => startGame({ mode: "daily", archiveOffset: 0 })}>Daily</button>
                <button type="button" aria-pressed={mode === "practice"} className={mode === "practice" ? "active" : ""} onClick={() => startGame({ mode: "practice" })}>Practice</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Movies from</legend>
              <div className="setup-options era-options">
                {ERAS.map((item) => <button type="button" key={item} aria-pressed={decade === item} className={decade === item ? "active" : ""} onClick={() => startGame({ decade: item })}>{item === "All" ? "All years" : item}</button>)}
              </div>
            </fieldset>
          </div>

          <div className="game-statusbar">
            <div className="run-progress">
              <span>{guessesLeft} {guessesLeft === 1 ? "guess" : "guesses"} left</span>
              <div className="take-pips" aria-label={`${guesses.length} of ${config.maxGuesses} guesses used`}>{Array.from({ length: config.maxGuesses }).map((_, index) => <i key={index} className={index < guesses.length ? (guesses[index].id === answer.id ? "won" : "used") : ""} />)}</div>
            </div>
            <div className="score-summary"><span>Possible score</span><strong>{potentialScore.toLocaleString("en-IN")}</strong></div>
            <button className="hint-button" onClick={revealHint} disabled={!canRevealHint}><span>✦</span><strong>Reveal a clue</strong><small>{hintsUsed}/{MAX_PAID_HINTS} used</small></button>
          </div>

          {revealedClues > 0 && <div className="clue-reel"><span className="content-label">Clues</span><div className="clue-track">{visibleClues.map((clue) => <article key={clue.label}><span>{clue.label}</span><strong>{clue.value}</strong></article>)}</div></div>}

          <div className="play-area">
            {status === "playing" ? (
              <form className="search-area" onSubmit={(event) => submit(event)}>
                <label htmlFor="film-search">Search for your next guess</label>
                <div className="search-box">
                  <span aria-hidden="true">⌕</span>
                  <input id="film-search" role="combobox" value={query} onChange={(event) => { setQuery(event.target.value); setHighlight(-1); setToast(""); }} onKeyDown={onSearchKeyDown} aria-autocomplete="list" aria-controls="film-suggestions" aria-expanded={suggestions.length > 0} aria-activedescendant={highlight >= 0 && suggestions[highlight] ? `film-option-${suggestions[highlight].id}` : undefined} autoComplete="off" placeholder="Type a movie title" />
                  <button type="submit">Guess</button>
                </div>
                {suggestions.length > 0 && <div className="suggestions" id="film-suggestions" role="listbox" aria-label="Movie suggestions">{suggestions.map((movie, index) => <button type="button" role="option" id={`film-option-${movie.id}`} aria-selected={index === highlight} tabIndex={-1} className={index === highlight ? "highlight" : ""} key={movie.id} onMouseDown={(event) => event.preventDefault()} onClick={() => submit(undefined, movie)}><MoviePoster movie={movie} className="suggestion-poster" /><span className="suggestion-copy"><strong>{movie.title}</strong><small>{movie.director}</small></span><em>{movie.year}</em></button>)}</div>}
              </form>
            ) : (
              <div className={`result-card ${status}`} ref={resultRef} role="status" aria-live="polite" tabIndex={-1}>
                <div className="result-reveal"><MoviePoster movie={answer} className="result-poster" /><div className="result-verdict"><span>{status === "won" ? "You got it!" : "The movie was"}</span><strong>{answer.title}</strong><small>{answer.year} · {answer.hero}<br />Directed by {answer.director}</small></div></div>
                <div className="result-score"><span>{status === "won" ? "Your score" : "Try another movie"}</span><strong>{status === "won" ? finalScore.toLocaleString("en-IN") : "—"}</strong></div>
                <div className="result-buttons"><button type="button" onClick={share}>Share result</button><button type="button" className="secondary" onClick={() => toggleVault(answer)}>{player.watchlist.includes(answer.id) ? "Saved" : "Save movie"}</button>{mode === "practice" && <button type="button" className="secondary" onClick={() => startGame({ mode: "practice" }, true)}>Next movie</button>}</div>
              </div>
            )}

            <div className="clue-board">
              <div className="grid-head">{["Year", "Lead", "Director", "Genre", "Movie type", "Title length"].map((column) => <span key={column}>{column}</span>)}</div>
              {guesses.length === 0 ? <div className="empty-board"><span>Start with any movie you know.</span><small>Your matches will appear here.</small></div> : <div className="guess-list">{guesses.map((guess, row) => {
                const cells = [
                  { field: "year", label: "Year", value: String(guess.year), sub: guess.year < answer.year ? "↑ Answer is later" : guess.year > answer.year ? "↓ Answer is earlier" : "Exact" },
                  { field: "hero", label: "Lead", value: guess.hero, sub: getResult("hero", guess, answer) === "close" ? "Related film family" : "Lead actor" },
                  { field: "director", label: "Director", value: guess.director, sub: "Director" },
                  { field: "genres", label: "Genre", value: guess.genres.join(" / "), sub: getResult("genres", guess, answer) === "close" ? "Genre overlap" : "Genre" },
                  { field: "lane", label: "Movie type", value: movieLane(guess), sub: "Movie type" },
                  { field: "words", label: "Title length", value: `${movieTitleWords(guess)} ${movieTitleWords(guess) === 1 ? "word" : "words"}`, sub: getResult("words", guess, answer) === "close" ? "Off by one" : "Title length" },
                ];
                return <div className="guess-row" key={guess.id}><div className="guess-title"><span>Guess {row + 1}</span><strong>{guess.title}</strong></div><div className="cells">{cells.map((cell, index) => {
                  const result = getResult(cell.field, guess, answer);
                  const resultLabel = result === "match" ? "Exact match" : result === "close" ? "Close" : "No match";
                  return <div className={`cell ${result}`} aria-label={`${cell.label}: ${cell.value}. ${resultLabel}. ${cell.sub}.`} style={{ animationDelay: `${index * 45}ms` }} key={cell.field}><small className="cell-label">{cell.label}</small><strong>{cell.value}</strong><small className="cell-result">{resultLabel}</small><small className="cell-note">{cell.sub}</small></div>;
                })}</div></div>;
              })}</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="library-section section-target" tabIndex={-1}>
        <div className="section-heading"><div><span className="section-kicker">Your Chitram</span><h2>Come back anytime.</h2></div><p>Replay a recent puzzle, check your progress, or revisit movies you saved.</p></div>
        <div className="utility-grid">
          <section className="utility-card archive-card section-target" id="archive" tabIndex={-1}>
            <div className="utility-heading"><div><span>Past puzzles</span><h3>Play the last seven days</h3></div><small>Archive games do not affect your streak.</small></div>
            <div className="archive-list">{Array.from({ length: 7 }).map((_, index) => <button key={index} onClick={() => startGame({ mode: "archive", archiveOffset: index + 1 })}><span>{archiveLabel(currentDate, index + 1)}</span><strong>#{puzzleNumber(currentDate) - index - 1}</strong><small>Play →</small></button>)}</div>
          </section>

          <section className="utility-card progress-card section-target" id="progress" tabIndex={-1}>
            <div className="utility-heading"><div><span>Your progress</span><h3>At a glance</h3></div></div>
            <div className="stats-grid">
              <div><strong>{player.stats.played}</strong><span>Played</span></div>
              <div><strong>{player.stats.played ? Math.round(player.stats.wins / player.stats.played * 100) : 0}%</strong><span>Win rate</span></div>
              <div><strong>{player.stats.streak}</strong><span>Streak</span></div>
              <div><strong>{player.stats.bestScore.toLocaleString("en-IN")}</strong><span>Best score</span></div>
            </div>
          </section>

          <section className="utility-card vault-card section-target" id="vault" tabIndex={-1}>
            <div className="utility-heading"><div><span>Saved movies</span><h3>Your film list</h3></div><small>Saved only on this device.</small></div>
            {savedMovies.length ? <div className="vault-grid">{savedMovies.map((movie) => <article key={movie.id}><MoviePoster movie={movie} className="vault-poster" /><div><strong>{movie.title}</strong><small>{movie.year} · {movie.director}</small><button type="button" onClick={() => toggleVault(movie)}>Remove</button></div></article>)}</div> : <div className="empty-vault"><strong>No saved movies yet</strong><p>Finish a game and choose “Save movie” to build your list.</p></div>}
          </section>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main"><span className="logo-mark" aria-hidden="true"><svg viewBox="0 0 44 44" focusable="false"><path d="M8 15h28v21H8z" /><path d="m9 15 5-7h8l-5 7m8 0 5-7h5l1 7" /><path d="m18 21 10 6-10 6z" /></svg></span><div><strong>Chitram</strong><small>A Telugu movie guessing game.</small></div></div>
        <a className="tmdb-credit" href="https://www.themoviedb.org" target="_blank" rel="noreferrer"><span className="tmdb-logo" aria-hidden="true" /><small>This product uses the TMDB API but is not endorsed or certified by TMDB.</small></a>
        <a className="back-to-top" href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
