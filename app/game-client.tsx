"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ALL_MOVIES, DECADES, GAME_RULES, MOVIES, movieFamilies, movieLane, movieLeads, movieTitleWords, type Decade, type Movie } from "./game-data";

type Mode = "daily" | "practice" | "archive";
type Result = "match" | "close" | "miss";
type Era = Decade | "All";
type ClueField = "year" | "genres" | "director" | "hero" | "lane" | "words";
type GameSelection = { decade?: Era; mode?: Mode; archiveOffset?: number };

const ERAS: Era[] = ["All", ...DECADES];

type PlayerStats = {
  played: number;
  wins: number;
  streak: number;
  bestScore: number;
  points: number;
  distribution: number[];
};

type CompletedGame = {
  result: "won" | "lost";
  score: number;
  guesses: number;
};

type PlayerData = {
  stats: PlayerStats;
  watchlist: string[];
  completedGames: Record<string, CompletedGame>;
};

const DEFAULT_STATS: PlayerStats = {
  played: 0,
  wins: 0,
  streak: 0,
  bestScore: 0,
  points: 0,
  distribution: [0, 0, 0, 0, 0, 0, 0, 0],
};
const DEFAULT_PLAYER: PlayerData = { stats: DEFAULT_STATS, watchlist: [], completedGames: {} };
const PLAYER_KEY = "chitram-player-v2";
const PLAYER_EVENT = "chitram-player-change";
const POSTER_MATCH_VERSION = "cast-v4-fast";

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
      completedGames: parsed?.completedGames && typeof parsed.completedGames === "object" ? parsed.completedGames : {},
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
  if (field === "hero") {
    const guessLeads = movieLeads(guess);
    const answerLeads = movieLeads(answer);
    const guessFamilies = movieFamilies(guess);
    const answerFamilies = movieFamilies(answer);
    return guessLeads.length === answerLeads.length && guessLeads.every((lead) => answerLeads.includes(lead))
      ? "match"
      : guessLeads.some((lead) => answerLeads.includes(lead)) || guessFamilies.some((family) => family !== "Independent" && answerFamilies.includes(family)) ? "close" : "miss";
  }
  if (field === "director") return guess.director === answer.director ? "match" : "miss";
  if (field === "genres") return guess.genres.length === answer.genres.length && guess.genres.every((genre) => answer.genres.includes(genre)) ? "match" : guess.genres.some((genre) => answer.genres.includes(genre)) ? "close" : "miss";
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

function gameHistoryKey(date: string, offset: number, era: Era) {
  return `${shiftDate(date, -offset)}:${era}`;
}

function scoreFor(guesses: number, cluesUsed: number) {
  return Math.max(100, GAME_RULES.baseScore - Math.max(0, guesses - 1) * GAME_RULES.guessPenalty - cluesUsed * GAME_RULES.cluePenalty);
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

export default function GameExperience({ initialDate, focused = false }: { initialDate: string; focused?: boolean }) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [decade, setDecade] = useState<Era>("All");
  const [mode, setMode] = useState<Mode>("daily");
  const [archiveOffset, setArchiveOffset] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(3);
  const [query, setQuery] = useState("");
  const [guesses, setGuesses] = useState<Movie[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [highlight, setHighlight] = useState(-1);
  const [revealedClueLabels, setRevealedClueLabels] = useState<string[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [toast, setToast] = useState("");
  const [undoMovie, setUndoMovie] = useState<Movie | null>(null);
  const [pendingGame, setPendingGame] = useState<GameSelection | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  const pool = moviesForEra(decade);
  const config = GAME_RULES;
  const answer = useMemo(() => {
    if (mode === "practice") return pool[practiceIndex % pool.length];
    const eraIndex = decade === "All" ? 0 : DECADES.indexOf(decade) + 1;
    const seed = puzzleNumber(currentDate) - archiveOffset + eraIndex * 17;
    return pool[Math.abs(seed) % pool.length];
  }, [archiveOffset, currentDate, decade, mode, pool, practiceIndex]);

  const normalizedQuery = normalize(query);
  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return pool
      .filter((movie) => !guesses.some((guess) => guess.id === movie.id))
      .filter((movie) => [movie.title, ...(movie.aliases || [])].some((name) => normalize(name).includes(normalizedQuery)))
      .sort((a, b) => Number(normalize(b.title).startsWith(normalizedQuery)) - Number(normalize(a.title).startsWith(normalizedQuery)))
      .slice(0, 3);
  }, [guesses, normalizedQuery, pool]);

  const clues: { label: string; value: string; field?: ClueField }[] = [
    { label: "Release year", value: String(answer.year), field: "year" },
    { label: "Genre signal", value: answer.genres.join(" / "), field: "genres" },
    ...(answer.storyClueSource === "generated" ? [] : [{ label: "Story beat", value: answer.storyClue }]),
    { label: "The filmmaker", value: answer.director, field: "director" },
    { label: "Lead billing", value: answer.hero, field: "hero" },
    { label: "Movie type", value: movieLane(answer), field: "lane" },
    {
      label: "Title length",
      value: `${movieTitleWords(answer)} ${movieTitleWords(answer) === 1 ? "word" : "words"}`,
      field: "words",
    },
  ];
  const knownClueFields = new Set<ClueField>(
    (["year", "genres", "director", "hero", "lane", "words"] as ClueField[]).filter((field) =>
      guesses.some((guess) => getResult(field, guess, answer) === "match"),
    ),
  );
  const visibleClues = clues.filter((clue) => revealedClueLabels.includes(clue.label));
  const availableClues = clues.filter((clue) => !revealedClueLabels.includes(clue.label) && (!clue.field || !knownClueFields.has(clue.field)));
  const cluesRemaining = Math.max(0, config.maxClues - revealedClueLabels.length);
  const canRevealClue = status === "playing" && cluesRemaining > 0 && availableClues.length > 0;
  const potentialScore = scoreFor(Math.max(1, guesses.length + 1), revealedClueLabels.length);
  const guessesLeft = config.maxGuesses - guesses.length;

  function resetBoard() {
    setQuery("");
    setGuesses([]);
    setStatus("playing");
    setHighlight(-1);
    setRevealedClueLabels([]);
    setFinalScore(0);
    setToast("");
  }

  function scrollToSection(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  }

  function applyGame(next: GameSelection) {
    const nextDecade = next.decade ?? decade;
    const nextMode = next.mode ?? mode;
    setDecade(nextDecade);
    setMode(nextMode);
    setArchiveOffset(next.archiveOffset ?? (nextMode === "archive" ? archiveOffset : 0));
    if (nextMode === "practice") setPracticeIndex(Math.floor(Math.random() * moviesForEra(nextDecade).length));
    resetBoard();
    setPendingGame(null);
    setSettingsOpen(false);
    window.setTimeout(() => scrollToSection("game"), 0);
  }

  function startGame(next: GameSelection, force = false) {
    const nextDecade = next.decade ?? decade;
    const nextMode = next.mode ?? mode;
    const nextArchiveOffset = next.archiveOffset ?? (nextMode === "archive" ? archiveOffset : 0);
    const changesGame = nextDecade !== decade || nextMode !== mode || nextArchiveOffset !== archiveOffset;

    if (!changesGame && !force) return;
    if (guesses.length > 0 && status === "playing" && !force) {
      setPendingGame(next);
      scrollToSection("game");
      return;
    }
    applyGame(next);
  }

  function recordResult(won: boolean, guessesUsed: number, score: number) {
    const completedGames: Record<string, CompletedGame> = mode === "practice" ? player.completedGames : {
      ...player.completedGames,
      [gameHistoryKey(currentDate, archiveOffset, decade)]: { result: won ? "won" : "lost", score, guesses: guessesUsed },
    };

    if (mode === "archive") {
      savePlayer({ ...player, completedGames });
      return;
    }

    const distribution = Array.from({ length: 8 }, (_, index) => player.stats.distribution[index] || 0);
    if (won && guessesUsed > 0 && guessesUsed <= distribution.length) distribution[guessesUsed - 1] += 1;
    savePlayer({
      ...player,
      completedGames,
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
      const score = scoreFor(nextGuesses.length, revealedClueLabels.length);
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

  function revealClue() {
    if (cluesRemaining === 0) {
      setToast(`You have used all ${config.maxClues} clues.`);
      return;
    }
    const nextClue = availableClues[0];
    if (!nextClue) {
      setToast("Your guesses already revealed every useful clue.");
      return;
    }
    setRevealedClueLabels((current) => [...current, nextClue.label]);
    setToast(`${nextClue.label} revealed. −${config.cluePenalty} points.`);
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
    const clueCount = `${revealedClueLabels.length} ${revealedClueLabels.length === 1 ? "clue" : "clues"}`;
    const text = `Chitram #${puzzleNumber(currentDate) - archiveOffset} · ${eraLabel(decade)}\n${guesses.map((guess) => resultEmoji(guess, answer)).join("\n")}\n${status === "won" ? `${guesses.length}/${config.maxGuesses} · ${clueCount} · ${finalScore} pts` : `X/${config.maxGuesses}`} · chitram.game`;
    try {
      await navigator.clipboard.writeText(text);
      setToast("Result copied. Send it to the group chat.");
    } catch {
      setToast("Could not copy the result.");
    }
  }

  const modeLabel = mode === "practice" ? "Unlimited rehearsal" : mode === "archive" ? `Archive puzzle #${puzzleNumber(currentDate) - archiveOffset} · ${archiveLabel(currentDate, archiveOffset)}` : "Today's premiere";
  const gameSetupLabel = mode === "practice"
    ? `Practice · ${eraLabel(decade)}`
    : mode === "archive"
      ? `Archive #${puzzleNumber(currentDate) - archiveOffset} · ${archiveLabel(currentDate, archiveOffset)} · ${eraLabel(decade)}`
      : `Daily · ${eraLabel(decade)}`;
  const savedMovies = player.watchlist
    .map((id) => ALL_MOVIES.find((movie) => movie.id === id))
    .filter((movie): movie is Movie => Boolean(movie));

  if (focused) {
    return (
      <main className="play-page" id="top">
        <a className="skip-link" href="#film-search-focused">Skip to movie search</a>
        {toast && <div className="global-toast play-toast" role="status" aria-live="polite"><span>{toast}</span>{undoMovie && <button type="button" onClick={undoVaultRemoval}>Undo</button>}</div>}

        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand wordmark" href="/" aria-label="Chitram home">Chitram</Link>
          </div>
        </header>

        <section className="play-stage section-target" id="game" tabIndex={-1}>
          <div className="play-gamebar">
            <button className="play-settings-trigger" type="button" aria-controls="focused-game-settings" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((value) => !value)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" /></svg>
              <span>{settingsOpen ? "Close game options" : gameSetupLabel}</span>
            </button>
          </div>

          {pendingGame && <div className="play-restart" role="alert"><div><strong>Switch games?</strong><span>Your current guesses will be cleared.</span></div><div><button type="button" onClick={() => applyGame(pendingGame)}>Start new game</button><button type="button" className="secondary" onClick={() => setPendingGame(null)}>Keep playing</button></div></div>}

          <div className={`play-settings-panel ${settingsOpen ? "open" : ""}`} id="focused-game-settings" hidden={!settingsOpen}>
            <fieldset>
              <legend>Game mode</legend>
              <div className="play-option-row">
                <button type="button" aria-pressed={mode === "daily"} className={mode === "daily" ? "active" : ""} onClick={() => startGame({ mode: "daily", archiveOffset: 0 })}><strong>Daily</strong><small>Today&apos;s shared film</small></button>
                <button type="button" aria-pressed={mode === "practice"} className={mode === "practice" ? "active" : ""} onClick={() => startGame({ mode: "practice" })}><strong>Practice</strong><small>Unlimited movies</small></button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Movie years</legend>
              <div className="play-option-row eras">
                {ERAS.map((item) => <button type="button" key={item} aria-pressed={decade === item} className={decade === item ? "active" : ""} onClick={() => startGame({ decade: item })}><strong>{item === "All" ? "All eras" : item}</strong></button>)}
              </div>
            </fieldset>
          </div>

          <div className="play-titlebar">
            <div>
              <span className="play-kicker"><b lang="te">తెలుగు సినిమా</b> / {modeLabel}</span>
              <h1>Name the movie.</h1>
            </div>
            <div className="play-score">
              <span>{status === "playing" ? "Score" : "Final"}</span>
              <strong>{(status === "playing" ? potentialScore : finalScore).toLocaleString("en-IN")}</strong>
              <small>{status === "playing" ? `${guessesLeft} ${guessesLeft === 1 ? "guess" : "guesses"} left` : status === "won" ? "Movie solved" : "Game over"}</small>
            </div>
          </div>

          <div className="play-progress-row">
            <div className="play-takes">
              <span>Take</span>
              <div aria-label={`${guesses.length} of ${config.maxGuesses} guesses used`}>{Array.from({ length: config.maxGuesses }).map((_, index) => <i key={index} className={index < guesses.length ? (guesses[index].id === answer.id ? "won" : "used") : ""}><span>{index + 1}</span></i>)}</div>
            </div>
            <p><i className="key exact" /> Exact <i className="key close" /> Close <i className="key miss" /> Miss</p>
          </div>

          {status === "playing" ? (
            <form className="play-search" onSubmit={(event) => submit(event)}>
              <label htmlFor="film-search-focused"><strong>Make your guess</strong><small>Search {pool.length} Telugu films</small></label>
              <div className="play-search-control">
                <span aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 4.25 4.25" /></svg></span>
                <input id="film-search-focused" role="combobox" value={query} onChange={(event) => { setQuery(event.target.value); setHighlight(-1); setToast(""); }} onKeyDown={onSearchKeyDown} aria-autocomplete="list" aria-controls="focused-film-suggestions" aria-expanded={suggestions.length > 0} aria-activedescendant={highlight >= 0 && suggestions[highlight] ? `focused-film-option-${suggestions[highlight].id}` : undefined} autoComplete="off" autoFocus placeholder="Type a movie title..." />
                <button type="submit">Guess <span aria-hidden="true">→</span></button>
              </div>
              {suggestions.length > 0 && <div className="play-suggestions" id="focused-film-suggestions" role="listbox" aria-label="Movie suggestions">{suggestions.map((movie, index) => <button type="button" role="option" id={`focused-film-option-${movie.id}`} aria-selected={index === highlight} tabIndex={-1} className={index === highlight ? "highlight" : ""} key={movie.id} onMouseDown={(event) => event.preventDefault()} onClick={() => submit(undefined, movie)}><MoviePoster movie={movie} className="play-suggestion-poster" /><span><strong>{movie.title}</strong><small>{movie.director}</small></span><em>{movie.year}</em></button>)}</div>}
            </form>
          ) : (
            <div className={`play-result ${status}`} ref={resultRef} role="status" aria-live="polite" tabIndex={-1}>
              <MoviePoster movie={answer} className="play-result-poster" />
              <div className="play-result-copy"><span>{status === "won" ? "That's the one" : "The movie was"}</span><strong>{answer.title}</strong><small>{answer.year} · {answer.hero} · Directed by {answer.director}</small></div>
              <div className="play-result-score"><span>{status === "won" ? "Final score" : "Better luck next reel"}</span><strong>{status === "won" ? finalScore.toLocaleString("en-IN") : "—"}</strong></div>
              <div className="play-result-actions"><button type="button" onClick={share}>Share result</button><button type="button" className="secondary" onClick={() => toggleVault(answer)}>{player.watchlist.includes(answer.id) ? "Saved" : "Save movie"}</button>{mode === "practice" && <button type="button" className="secondary" onClick={() => startGame({ mode: "practice" }, true)}>Next movie</button>}</div>
            </div>
          )}

          <div className={`play-workspace ${guesses.length > 0 ? "has-guesses" : ""}`}>
            <section className="play-board" aria-labelledby="guess-board-title">
              <div className="play-panel-heading"><div><span>Your slate</span><h2 id="guess-board-title">Guesses</h2></div><strong>{guesses.length}<small> / {config.maxGuesses}</small></strong></div>
              <div className="play-grid-head">{["Year", "Lead", "Director", "Genre", "Movie type", "Title length"].map((column) => <span key={column}>{column}</span>)}</div>
              {guesses.length === 0 ? (
                <div className="play-empty-board">
                  <div>{["Year", "Lead", "Director", "Genre", "Type", "Words"].map((label) => <span key={label}><i>?</i><small>{label}</small></span>)}</div>
                  <strong>Your first guess reveals six signals.</strong>
                  <small>Start with any Telugu movie you know.</small>
                </div>
              ) : (
                <div className="play-guess-list">{guesses.map((guess, row) => {
                  const cells = [
                    { field: "year", label: "Year", value: String(guess.year), sub: guess.year === answer.year ? "Same year" : guess.year < answer.year ? "Answer is later ↑" : "Answer is earlier ↓" },
                    { field: "hero", label: "Lead", value: guess.hero, sub: getResult("hero", guess, answer) === "close" ? "Related film family" : "Lead actor" },
                    { field: "director", label: "Director", value: guess.director, sub: "Filmmaker" },
                    { field: "genres", label: "Genre", value: guess.genres.join(" / "), sub: getResult("genres", guess, answer) === "close" ? "Some overlap" : "Genre" },
                    { field: "lane", label: "Movie type", value: movieLane(guess), sub: "Release lane" },
                    { field: "words", label: "Title length", value: `${movieTitleWords(guess)} ${movieTitleWords(guess) === 1 ? "word" : "words"}`, sub: getResult("words", guess, answer) === "close" ? "Off by one" : "Word count" },
                  ];
                  return <article className="play-guess" key={guess.id}><div className="play-guess-title"><span>{String(row + 1).padStart(2, "0")}</span><strong>{guess.title}</strong></div><div className="play-cells">{cells.map((cell, index) => {
                    const result = getResult(cell.field, guess, answer);
                    return <div className={`play-cell ${result}`} aria-label={`${cell.label}: ${cell.value}. ${result === "match" ? "Exact match" : result === "close" ? "Close" : "No match"}. ${cell.sub}.`} style={{ animationDelay: `${index * 45}ms` }} key={cell.field}><small className="play-cell-label">{cell.label}</small><strong>{cell.value}</strong><small>{result === "match" ? "Exact" : result === "close" ? "Close" : cell.sub}</small></div>;
                  })}</div></article>;
                })}</div>
              )}
            </section>

            <aside className="play-tools" aria-label="Game tools">
              <div className="play-panel-heading compact"><div><span>Need a nudge?</span><h2>Clues</h2></div><strong>{cluesRemaining}<small> left</small></strong></div>
              <button className="play-clue-button" type="button" onClick={revealClue} disabled={!canRevealClue}>
                <span><strong>{cluesRemaining === 0 ? "All clues used" : availableClues.length === 0 ? "Nothing new to reveal" : "Reveal next clue"}</strong><small>{cluesRemaining === 0 ? "Keep guessing" : availableClues.length === 0 ? "Your guesses covered them" : `Costs ${config.cluePenalty} points`}</small></span>
                <b aria-hidden="true">?</b>
              </button>
              <div className="play-clue-stack">
                {visibleClues.length > 0 ? visibleClues.map((clue, index) => <article key={clue.label}><span>Clue {index + 1} · {clue.label}</span><strong>{clue.value}</strong></article>) : <div className="play-no-clues"><span>?</span><strong>No clues used</strong><small>You can solve it clean for the full score.</small></div>}
              </div>
              <div className="play-penalties"><span>Scoring</span><p><strong>−{config.guessPenalty}</strong> each extra guess</p><p><strong>−{config.cluePenalty}</strong> each clue</p></div>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="top" className="site">
      <a className="skip-link" href="#game">Skip to the game</a>
      {toast && <div className="global-toast" role="status" aria-live="polite"><span>{toast}</span>{undoMovie && <button type="button" onClick={undoVaultRemoval}>Undo</button>}</div>}

      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand wordmark" href="#top" aria-label="Chitram home">Chitram</a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span lang="te">తెలుగు సినిమా</span><strong>Daily puzzle #{puzzleNumber(currentDate)}</strong></div>
          <h1>A movie is hiding <em>in plain sight.</em></h1>
          <p>Name today&apos;s mystery Telugu film. Every guess develops the picture—year, cast, genre and more—until the title comes into focus.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#game">Enter the guessing room <span>↘</span></a>
            <button className="secondary-cta" onClick={() => startGame({ mode: "practice" }, true)}>Try a practice film</button>
          </div>
          <div className="hero-facts">
            <span><strong>{ALL_MOVIES.length}</strong> films</span>
            <span><strong>27</strong> years of cinema</span>
            <span><strong>1</strong> fresh puzzle daily</span>
          </div>
        </div>
        <div className="hero-poster" role="img" aria-label="A typographic poster for today's mystery Telugu movie">
          <div className="poster-band"><span>Chitram presents</span><span>Daily / #{puzzleNumber(currentDate)}</span></div>
          <div className="poster-title"><small>Can you name the</small><strong lang="te">సినిమా?</strong></div>
          <div className="poster-billing"><span>{config.baseScore.toLocaleString("en-IN")} pts</span><span>{config.maxClues} clues</span><span>{config.maxGuesses} takes</span></div>
          <div className="poster-showtime">
            <span>Next premiere in</span><NextMovieCountdown />
          </div>
        </div>
      </section>

      <section className="game-section section-target" id="game" tabIndex={-1}>
        <div className="section-heading">
          <div><span className="section-kicker">The guessing room</span><h2>Roll the clues.</h2></div>
          <p><strong>{modeLabel}.</strong> {config.description}</p>
        </div>

        <div className="game-shell">
          {pendingGame && <div className="restart-notice" role="alert"><div><strong>Start a different game?</strong><span>Your current guesses will be cleared.</span></div><div><button type="button" onClick={() => applyGame(pendingGame)}>Start new game</button><button type="button" className="secondary" onClick={() => setPendingGame(null)}>Keep playing</button></div></div>}
          <button className="settings-summary" type="button" aria-controls="game-settings" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((value) => !value)}>
            <span><small>Game setup</small><strong>{gameSetupLabel}</strong></span>
            <span aria-hidden="true">{settingsOpen ? "Close −" : "Change +"}</span>
          </button>
          <div className={`game-setup ${settingsOpen ? "open" : ""}`} id="game-settings">
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
                {ERAS.map((item) => <button type="button" key={item} aria-pressed={decade === item} className={decade === item ? "active" : ""} onClick={() => startGame({ decade: item })}>{item === "All" ? "All" : item}</button>)}
              </div>
            </fieldset>
          </div>

          <div className="game-statusbar">
            <div className="run-progress">
              <span>{guessesLeft} {guessesLeft === 1 ? "guess" : "guesses"} left · −{config.guessPenalty} after each miss</span>
              <div className="take-pips" aria-label={`${guesses.length} of ${config.maxGuesses} guesses used`}>{Array.from({ length: config.maxGuesses }).map((_, index) => <i key={index} className={index < guesses.length ? (guesses[index].id === answer.id ? "won" : "used") : ""} />)}</div>
            </div>
            <div className="score-summary"><span>Score now</span><strong>{potentialScore.toLocaleString("en-IN")}</strong></div>
            <button className="clue-button" type="button" onClick={revealClue} disabled={!canRevealClue}>
              <strong>{cluesRemaining === 0 ? "Clues used" : availableClues.length === 0 ? "No useful clues" : "Get a clue"}</strong>
              <small>{cluesRemaining === 0 ? "All clues used" : availableClues.length === 0 ? "Already covered by your guesses" : `${cluesRemaining} remaining · −${config.cluePenalty} pts`}</small>
            </button>
          </div>

          {visibleClues.length > 0 && <div className="clue-reel"><span className="content-label">Clues you requested</span><div className="clue-track">{visibleClues.map((clue) => <article key={clue.label}><span>{clue.label}</span><strong>{clue.value}</strong></article>)}</div></div>}

          <div className="play-area">
            {status === "playing" ? (
              <form className="search-area" onSubmit={(event) => submit(event)}>
                <div className="search-heading"><label htmlFor="film-search">Put a title on the slate</label><span>Search {pool.length} Telugu films</span></div>
                {guesses.length > 0 && <div className="guess-memory" aria-label={`${guesses.length} previous guesses`}>
                  <div><span>On your slate</span><small>{guesses.length}/{config.maxGuesses}</small></div>
                  <ol>{guesses.map((guess, index) => <li key={guess.id}><span>{index + 1}</span><strong>{guess.title}</strong><small>{guess.year}</small></li>)}</ol>
                </div>}
                <div className="search-box">
                  <span aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 4.25 4.25" /></svg></span>
                  <input id="film-search" role="combobox" value={query} onChange={(event) => { setQuery(event.target.value); setHighlight(-1); setToast(""); }} onKeyDown={onSearchKeyDown} aria-autocomplete="list" aria-controls="film-suggestions" aria-expanded={suggestions.length > 0} aria-activedescendant={highlight >= 0 && suggestions[highlight] ? `film-option-${suggestions[highlight].id}` : undefined} autoComplete="off" placeholder="Try a film title…" />
                  <button type="submit">Roll</button>
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
              {guesses.length === 0 ? <div className="empty-board"><span>Your first guess opens the scene.</span><small>Exact matches, near misses and wrong turns will appear here.</small></div> : <div className="guess-list">{guesses.map((guess, row) => {
                const cells = [
                  { field: "year", label: "Year", value: String(guess.year), sub: guess.year === answer.year ? "Year" : guess.year < answer.year ? "↑ Answer is later" : "↓ Answer is earlier" },
                  { field: "hero", label: "Lead", value: guess.hero, sub: getResult("hero", guess, answer) === "close" ? "Related film family" : "Lead actor" },
                  { field: "director", label: "Director", value: guess.director, sub: "Director" },
                  { field: "genres", label: "Genre", value: guess.genres.join(" / "), sub: getResult("genres", guess, answer) === "close" ? "Genre overlap" : "Genre" },
                  { field: "lane", label: "Movie type", value: movieLane(guess), sub: "Movie type" },
                  { field: "words", label: "Title length", value: `${movieTitleWords(guess)} ${movieTitleWords(guess) === 1 ? "word" : "words"}`, sub: getResult("words", guess, answer) === "close" ? "Off by one" : "Title length" },
                ];
                return <div className="guess-row" key={guess.id}><div className="guess-title"><span>Guess {row + 1}</span><strong>{guess.title}</strong></div><div className="cells">{cells.map((cell, index) => {
                  const result = getResult(cell.field, guess, answer);
                  const resultLabel = result === "match" ? (cell.field === "year" ? answer.release : "Exact match") : result === "close" ? "Close" : "No match";
                  return <div className={`cell ${result}`} aria-label={`${cell.label}: ${cell.value}. ${resultLabel}. ${cell.sub}.`} style={{ animationDelay: `${index * 45}ms` }} key={cell.field}><small className="cell-label">{cell.label}</small><strong>{cell.value}</strong><small className="cell-result">{resultLabel}</small><small className="cell-note">{cell.sub}</small></div>;
                })}</div></div>;
              })}</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="quick-guide section-target" id="how" tabIndex={-1}>
        <div className="guide-heading"><span>Three scenes</span><h2>How the story unfolds.</h2></div>
        <div className="guide-grid">
          <article><span>01</span><div><strong>Start at 1,000</strong><p>Everyone gets the same game. Each miss costs 75 points and every clue costs 100.</p></div></article>
          <article><span>02</span><div><strong>Call your shot</strong><p>Search any film. Each guess compares six signals with the mystery title.</p></div></article>
          <article><span>03</span><div><strong>Read the colour</strong><p><i className="key exact" /> Exact <i className="key close" /> Close <i className="key miss" /> Miss</p></div></article>
        </div>
      </section>

      <section className="library-section section-target" tabIndex={-1}>
        <div className="section-heading"><div><span className="section-kicker">Your cinema</span><h2>Keep the reel going.</h2></div><p>Revisit an old puzzle, follow your form, or return to a film you saved.</p></div>
        <div className="utility-grid">
          <section className="utility-card archive-card section-target" id="archive" tabIndex={-1}>
            <div className="utility-heading"><div><span>Previous shows</span><h3>Seven days on the reel</h3></div><small>Archive games do not affect your streak.</small></div>
            <div className="archive-list">{Array.from({ length: 7 }).map((_, index) => {
              const offset = index + 1;
              const completed = player.completedGames[gameHistoryKey(currentDate, offset, decade)];
              const isCurrent = mode === "archive" && archiveOffset === offset;
              const stateLabel = isCurrent
                ? completed ? "Finished · current game" : "Playing now →"
                : completed
                  ? completed.result === "won" ? `Finished · ${completed.score.toLocaleString("en-IN")} pts` : "Finished · Try again"
                  : "Play →";
              return <button
                key={offset}
                className={`${isCurrent ? "current" : ""} ${completed ? "completed" : ""}`.trim()}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`${archiveLabel(currentDate, offset)}, puzzle ${puzzleNumber(currentDate) - offset}. ${stateLabel}`}
                onClick={() => startGame({ mode: "archive", archiveOffset: offset })}
              ><span>{archiveLabel(currentDate, offset)}</span><strong>#{puzzleNumber(currentDate) - offset}</strong><small>{stateLabel}</small></button>;
            })}</div>
          </section>

          <section className="utility-card progress-card section-target" id="progress" tabIndex={-1}>
            <div className="utility-heading"><div><span>Scorecard</span><h3>Your box office</h3></div></div>
            <div className="stats-grid">
              <div><strong>{player.stats.played}</strong><span>Played</span></div>
              <div><strong>{player.stats.played ? Math.round(player.stats.wins / player.stats.played * 100) : 0}%</strong><span>Win rate</span></div>
              <div><strong>{player.stats.streak}</strong><span>Streak</span></div>
              <div><strong>{player.stats.bestScore.toLocaleString("en-IN")}</strong><span>Best score</span></div>
            </div>
          </section>

          <section className="utility-card vault-card section-target" id="vault" tabIndex={-1}>
            <div className="utility-heading"><div><span>Watchlist</span><h3>Films for later</h3></div><small>Saved only on this device.</small></div>
            {savedMovies.length ? <div className="vault-grid">{savedMovies.map((movie) => <article key={movie.id}><MoviePoster movie={movie} className="vault-poster" /><div><strong>{movie.title}</strong><small>{movie.year} · {movie.director}</small><button type="button" onClick={() => toggleVault(movie)}>Remove</button></div></article>)}</div> : <div className="empty-vault"><strong>No saved movies yet</strong><p>Finish a game and choose “Save movie” to build your list.</p></div>}
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
