import { FormEvent, KeyboardEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { ALL_MOVIES, GAME_RULES, movieLane, type Movie } from "./game-data";
import {
  archiveLabel,
  dailyMovie,
  displayedStreak,
  eraLabel,
  gameHistoryKey,
  gameStatus,
  getResult,
  indiaDateKey,
  MOVIE_BY_ID,
  moviesForEra,
  nextStreak,
  normalize,
  puzzleNumber,
  resultEmoji,
  scoreFor,
  titleLengthLabel,
  type ClueField,
  type Era,
  type Mode,
} from "./game-logic";
import { boardsWith, EMPTY_BOARD, savePlayer, usePlayer, type Board, type CompletedGame, type PlayerData } from "./player-store";

export type GameSelection = { decade?: Era; mode?: Mode; archiveOffset?: number };
export type Clue = { label: string; value: string; field?: ClueField };

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  target.focus({ preventScroll: true });
}

function cluesFor(answer: Movie): Clue[] {
  return [
    { label: "Release year", value: String(answer.year), field: "year" },
    { label: "Genre signal", value: answer.genres.join(" / "), field: "genres" },
    ...(answer.storyClueSource === "generated" ? [] : [{ label: "Story beat", value: answer.storyClue }]),
    { label: "The filmmaker", value: answer.director, field: "director" },
    { label: "Lead billing", value: answer.hero, field: "hero" },
    { label: "Movie type", value: movieLane(answer), field: "lane" },
    { label: "Title length", value: titleLengthLabel(answer), field: "words" },
  ];
}

// The caller owns the result card ref so the returned object holds no refs and
// can be read freely during render.
export function useGame(initialDate: string, resultRef: RefObject<HTMLDivElement | null>) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [decade, setDecade] = useState<Era>("All");
  const [mode, setMode] = useState<Mode>("daily");
  const [archiveOffset, setArchiveOffset] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(3);
  const [practiceBoard, setPracticeBoard] = useState<Board>(EMPTY_BOARD);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [toast, setToast] = useState("");
  const [undoMovie, setUndoMovie] = useState<Movie | null>(null);
  const [pendingGame, setPendingGame] = useState<GameSelection | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gameInProgressRef = useRef(false);
  const player = usePlayer();

  useEffect(() => {
    const updateDate = () => {
      // Never swap the answer out from under a player mid-game at midnight; the
      // date catches up on the next tick after the game finishes.
      if (gameInProgressRef.current) return;
      const nextDate = indiaDateKey();
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

  const pool = moviesForEra(decade);
  const answer = useMemo(
    () => (mode === "practice" ? pool[practiceIndex % pool.length] : dailyMovie(decade, puzzleNumber(currentDate) - archiveOffset)),
    [archiveOffset, currentDate, decade, mode, pool, practiceIndex],
  );

  // Daily and archive boards are saved per puzzle, so a refresh resumes the game
  // and a finished puzzle stays finished instead of being replayable for stats.
  const boardKey = mode === "practice" ? null : gameHistoryKey(currentDate, archiveOffset, decade);
  const board = boardKey ? player.boards[boardKey] ?? EMPTY_BOARD : practiceBoard;
  const guesses = useMemo(
    () => board.guessIds.map((id) => MOVIE_BY_ID.get(id)).filter((movie): movie is Movie => Boolean(movie)),
    [board],
  );
  const revealedClueLabels = board.clueLabels;
  const status = gameStatus(guesses, answer);
  const finalScore = status === "won" ? scoreFor(guesses.length, revealedClueLabels.length) : 0;

  useEffect(() => {
    gameInProgressRef.current = status === "playing" && guesses.length > 0;
  }, [guesses.length, status]);

  useEffect(() => {
    if (status !== "playing") window.requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
  }, [resultRef, status]);

  const normalizedQuery = normalize(query);
  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return pool
      .filter((movie) => !guesses.some((guess) => guess.id === movie.id))
      .filter((movie) => [movie.title, ...(movie.aliases || [])].some((name) => normalize(name).includes(normalizedQuery)))
      .sort((a, b) => Number(normalize(b.title).startsWith(normalizedQuery)) - Number(normalize(a.title).startsWith(normalizedQuery)))
      .slice(0, 3);
  }, [guesses, normalizedQuery, pool]);

  const clues = cluesFor(answer);
  const knownClueFields = new Set(
    clues
      .map((clue) => clue.field)
      .filter((field): field is ClueField => Boolean(field) && guesses.some((guess) => getResult(field!, guess, answer) === "match")),
  );
  const visibleClues = clues.filter((clue) => revealedClueLabels.includes(clue.label));
  const availableClues = clues.filter((clue) => !revealedClueLabels.includes(clue.label) && (!clue.field || !knownClueFields.has(clue.field)));
  const cluesRemaining = Math.max(0, GAME_RULES.maxClues - revealedClueLabels.length);
  const canRevealClue = status === "playing" && cluesRemaining > 0 && availableClues.length > 0;
  const potentialScore = scoreFor(Math.max(1, guesses.length + 1), revealedClueLabels.length);
  const guessesLeft = GAME_RULES.maxGuesses - guesses.length;
  const puzzle = puzzleNumber(currentDate) - archiveOffset;

  function resetBoard() {
    setQuery("");
    setPracticeBoard(EMPTY_BOARD);
    setHighlight(-1);
    setToast("");
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
    // Only practice boards are thrown away; daily and archive boards are saved.
    if (mode === "practice" && guesses.length > 0 && status === "playing" && !force) {
      setPendingGame(next);
      scrollToSection("game");
      return;
    }
    applyGame(next);
  }

  function resultUpdate(won: boolean, guessesUsed: number, score: number): Partial<PlayerData> {
    const completedGames: Record<string, CompletedGame> = mode === "practice" ? player.completedGames : {
      ...player.completedGames,
      [gameHistoryKey(currentDate, archiveOffset, decade)]: { result: won ? "won" : "lost", score, guesses: guessesUsed },
    };

    if (mode === "archive") return { completedGames };

    const distribution = Array.from({ length: GAME_RULES.maxGuesses }, (_, index) => player.stats.distribution[index] || 0);
    if (won && guessesUsed > 0 && guessesUsed <= distribution.length) distribution[guessesUsed - 1] += 1;

    return {
      completedGames,
      stats: {
        played: player.stats.played + 1,
        wins: player.stats.wins + Number(won),
        bestScore: Math.max(player.stats.bestScore, score),
        points: player.stats.points + score,
        distribution,
        ...nextStreak(player.stats, mode, won, currentDate),
      },
    };
  }

  function saveBoard(next: Board, update: Partial<PlayerData> = {}) {
    if (!boardKey) {
      setPracticeBoard(next);
      if (Object.keys(update).length) savePlayer({ ...player, ...update });
      return;
    }
    savePlayer({ ...player, ...update, boards: boardsWith(player.boards, boardKey, next, currentDate) });
  }

  function changeQuery(value: string) {
    setQuery(value);
    setHighlight(-1);
    setToast("");
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

    const next = { ...board, guessIds: [...board.guessIds, movie.id] };
    const won = movie.id === answer.id;
    const finished = won || next.guessIds.length >= GAME_RULES.maxGuesses;
    setQuery("");
    setHighlight(-1);
    setToast("");
    const score = won ? scoreFor(next.guessIds.length, revealedClueLabels.length) : 0;
    saveBoard(next, finished ? resultUpdate(won, next.guessIds.length, score) : undefined);
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
      setToast(`You have used all ${GAME_RULES.maxClues} clues.`);
      return;
    }
    const nextClue = availableClues[0];
    if (!nextClue) {
      setToast("Your guesses already revealed every useful clue.");
      return;
    }
    saveBoard({ ...board, clueLabels: [...board.clueLabels, nextClue.label] });
    setToast(`${nextClue.label} revealed. −${GAME_RULES.cluePenalty} points.`);
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
    const outcome = status === "won" ? `${guesses.length}/${GAME_RULES.maxGuesses} · ${clueCount} · ${finalScore} pts` : `X/${GAME_RULES.maxGuesses}`;
    const text = `Chitram #${puzzle} · ${eraLabel(decade)}\n${guesses.map((guess) => resultEmoji(guess, answer)).join("\n")}\n${outcome} · ${window.location.host}`;
    try {
      await navigator.clipboard.writeText(text);
      setToast("Result copied. Send it to the group chat.");
    } catch {
      setToast("Could not copy the result.");
    }
  }

  const modeLabel = mode === "practice"
    ? "Unlimited rehearsal"
    : mode === "archive" ? `Archive puzzle #${puzzle} · ${archiveLabel(currentDate, archiveOffset)}` : "Today's premiere";
  const gameSetupLabel = mode === "practice"
    ? `Practice · ${eraLabel(decade)}`
    : mode === "archive" ? `Archive #${puzzle} · ${archiveLabel(currentDate, archiveOffset)} · ${eraLabel(decade)}` : `Daily · ${eraLabel(decade)}`;
  const savedMovies = player.watchlist.map((id) => MOVIE_BY_ID.get(id)).filter((movie): movie is Movie => Boolean(movie));

  return {
    // selection
    currentDate,
    decade,
    mode,
    archiveOffset,
    puzzle,
    modeLabel,
    gameSetupLabel,
    settingsOpen,
    setSettingsOpen,
    pendingGame,
    setPendingGame,
    startGame,
    applyGame,
    // board
    pool,
    answer,
    guesses,
    status,
    finalScore,
    potentialScore,
    guessesLeft,
    // search
    query,
    changeQuery,
    suggestions,
    highlight,
    submit,
    onSearchKeyDown,
    // clues
    visibleClues,
    availableClues,
    cluesRemaining,
    canRevealClue,
    revealClue,
    // player
    player,
    streak: displayedStreak(player.stats, currentDate),
    savedMovies,
    toggleVault,
    undoMovie,
    undoVaultRemoval,
    toast,
    share,
    totalMovies: ALL_MOVIES.length,
  };
}

export type Game = ReturnType<typeof useGame>;
