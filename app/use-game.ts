import { FormEvent, KeyboardEvent, RefObject, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ALL_MOVIES, GAME_RULES, type Movie } from "./game-data";
import {
  archiveLabel,
  displayedStreak,
  EMPTY_BOARD,
  eraLabel,
  evaluateBoard,
  exactMovie,
  gameHistoryKey,
  indiaDateKey,
  MOVIE_BY_ID,
  moviesForEra,
  OPENING_VERDICT,
  puzzleNumber,
  scoreFor,
  searchMovies,
  type Board,
  type Era,
  type Mode,
  type Verdict,
} from "./game-logic";
import { recordResult, updatePlayer, usePlayer, withBoard } from "./player-store";
import { shareQuery, shareText, sharedResultFrom } from "./share";

export type GameSelection = { decade?: Era; mode?: Mode; archiveOffset?: number };

type PuzzleRequest = { date: string; offset: number; era: Era; board: Board };
type RemoteVerdict = { key: string; historyKey: string; verdict: Verdict };

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  target.focus({ preventScroll: true });
}

const subscribeToNothing = () => () => {};

// False during server rendering and hydration, true afterwards. Saved boards live
// in localStorage, so until then the game area shows a loading state instead of
// flashing an empty board that is about to be replaced.
function useHydrated() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

function verdictKey(historyKey: string, board: Board) {
  return JSON.stringify([historyKey, board.guessIds, board.clueLabels]);
}

async function fetchVerdict({ date, offset, era, board }: PuzzleRequest): Promise<Verdict> {
  const response = await fetch("/api/puzzle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, offset, era, guessIds: board.guessIds, clueLabels: board.clueLabels }),
  });
  if (!response.ok) throw new Error(`Puzzle request failed with ${response.status}`);
  return response.json();
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
  const [remote, setRemote] = useState<RemoteVerdict | null>(null);
  const [pending, setPending] = useState(false);
  const [failedLoadKey, setFailedLoadKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [toast, setToast] = useState("");
  const [undoMovie, setUndoMovie] = useState<Movie | null>(null);
  const [pendingGame, setPendingGame] = useState<GameSelection | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gameInProgressRef = useRef(false);
  const player = usePlayer();
  const hydrated = useHydrated();

  useEffect(() => {
    const updateDate = () => {
      // Never swap the puzzle out from under a player mid-game at midnight; the
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
  const practiceAnswer = pool[practiceIndex % pool.length];
  const puzzle = puzzleNumber(currentDate) - archiveOffset;

  // Daily and archive boards are saved per puzzle and scored by the server, which
  // alone knows the answer. Practice boards stay in memory and are scored here.
  const historyKey = mode === "practice" ? null : gameHistoryKey(currentDate, archiveOffset, decade);
  const board = historyKey ? player.boards[historyKey] ?? EMPTY_BOARD : practiceBoard;
  const boardIsEmpty = board.guessIds.length === 0 && board.clueLabels.length === 0;
  const currentKey = historyKey ? verdictKey(historyKey, board) : null;
  const practiceVerdict = useMemo(() => evaluateBoard(practiceAnswer, practiceBoard), [practiceAnswer, practiceBoard]);

  let verdict: Verdict | null = null;
  if (!historyKey) verdict = practiceVerdict;
  else if (hydrated && boardIsEmpty) verdict = OPENING_VERDICT;
  else if (hydrated && remote?.historyKey === historyKey) verdict = remote.verdict;
  const ready = verdict !== null && (!historyKey || boardIsEmpty || remote?.key === currentKey);
  const loadFailed = currentKey !== null && failedLoadKey === currentKey;

  useEffect(() => {
    if (!historyKey || !currentKey || !hydrated || boardIsEmpty || pending || remote?.key === currentKey || failedLoadKey === currentKey) return;
    let cancelled = false;
    fetchVerdict({ date: currentDate, offset: archiveOffset, era: decade, board })
      .then((result) => {
        if (!cancelled) setRemote({ key: currentKey, historyKey, verdict: result });
      })
      .catch(() => {
        if (!cancelled) setFailedLoadKey(currentKey);
      });
    return () => {
      cancelled = true;
    };
  }, [archiveOffset, board, boardIsEmpty, currentDate, currentKey, decade, failedLoadKey, historyKey, hydrated, pending, remote?.key]);

  const status = verdict?.status ?? "playing";
  // While a newer board is being checked, show only the rows already scored.
  const guesses = board.guessIds
    .slice(0, verdict?.cells.length ?? 0)
    .map((id) => MOVIE_BY_ID.get(id))
    .filter((movie): movie is Movie => Boolean(movie));
  const cells = verdict?.cells ?? [];
  const answer = verdict?.answer ?? null;
  const finalScore = verdict?.score ?? 0;
  const cluesRemaining = Math.max(0, GAME_RULES.maxClues - board.clueLabels.length);
  const nextClueLabel = verdict?.nextClueLabel ?? null;
  const canRevealClue = ready && !pending && status === "playing" && cluesRemaining > 0 && nextClueLabel !== null;
  const potentialScore = scoreFor(Math.max(1, board.guessIds.length + 1), board.clueLabels.length);
  const guessesLeft = GAME_RULES.maxGuesses - board.guessIds.length;

  useEffect(() => {
    gameInProgressRef.current = status === "playing" && board.guessIds.length > 0;
  }, [board.guessIds.length, status]);

  useEffect(() => {
    if (status !== "playing") window.requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
  }, [resultRef, status]);

  const suggestions = useMemo(() => searchMovies(pool, query, board.guessIds), [board.guessIds, pool, query]);

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
    if (mode === "practice" && board.guessIds.length > 0 && status === "playing" && !force) {
      setPendingGame(next);
      scrollToSection("game");
      return;
    }
    applyGame(next);
  }

  // Scores a new board, then saves it (and the result, if the game just ended)
  // in one update. A daily board is only saved once the server has accepted it.
  async function commitBoard(next: Board): Promise<Verdict | null> {
    let result: Verdict;
    if (!historyKey) {
      result = evaluateBoard(practiceAnswer, next);
      setPracticeBoard(next);
    } else {
      setPending(true);
      try {
        result = await fetchVerdict({ date: currentDate, offset: archiveOffset, era: decade, board: next });
      } catch {
        setToast("Could not reach Chitram. Check your connection and try again.");
        return null;
      } finally {
        setPending(false);
      }
      setRemote({ key: verdictKey(historyKey, next), historyKey, verdict: result });
    }

    updatePlayer((current) => {
      const saved = historyKey ? withBoard(current, historyKey, next, currentDate) : current;
      if (result.status === "playing") return saved;
      return recordResult(saved, {
        mode,
        historyKey: historyKey ?? "",
        date: currentDate,
        won: result.status === "won",
        guesses: next.guessIds.length,
        score: result.score,
      });
    });
    return result;
  }

  function changeQuery(value: string) {
    setQuery(value);
    setHighlight(-1);
    setToast("");
  }

  async function submit(event?: FormEvent, picked?: Movie) {
    event?.preventDefault();
    if (!ready || pending || status !== "playing") return;
    const movie = picked || (highlight >= 0 ? suggestions[highlight] : undefined) || exactMovie(pool, query) || suggestions[0];
    if (!movie) {
      setToast("Choose a film from the suggestions.");
      return;
    }

    setQuery("");
    setHighlight(-1);
    setToast("");
    const result = await commitBoard({ ...board, guessIds: [...board.guessIds, movie.id] });
    if (!result) setQuery(movie.title);
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

  async function revealClue() {
    if (cluesRemaining === 0) {
      setToast(`You have used all ${GAME_RULES.maxClues} clues.`);
      return;
    }
    if (!nextClueLabel) {
      setToast("Your guesses already revealed every useful clue.");
      return;
    }
    if (!canRevealClue) return;
    const result = await commitBoard({ ...board, clueLabels: [...board.clueLabels, nextClueLabel] });
    if (result) setToast(`${nextClueLabel} revealed. −${GAME_RULES.cluePenalty} points.`);
  }

  function toggleVault(movie: Movie) {
    const exists = player.watchlist.includes(movie.id);
    updatePlayer((current) => ({
      ...current,
      watchlist: exists ? current.watchlist.filter((id) => id !== movie.id) : [...current.watchlist, movie.id],
    }));
    setUndoMovie(exists ? movie : null);
    setToast(exists ? "Removed from your vault." : "Saved to your film vault.");
  }

  function undoVaultRemoval() {
    if (!undoMovie) return;
    const movie = undoMovie;
    updatePlayer((current) => (current.watchlist.includes(movie.id) ? current : { ...current, watchlist: [...current.watchlist, movie.id] }));
    setToast(`${movie.title} restored.`);
    setUndoMovie(null);
  }

  async function share() {
    const result = sharedResultFrom(cells, mode === "practice" ? null : puzzle, decade, board.clueLabels.length, finalScore);
    const text = shareText(result, `${window.location.origin}/s?${shareQuery(result)}`);

    // Phones get the system share sheet (straight into WhatsApp and friends);
    // desktops, where that sheet is clumsy, copy to the clipboard instead.
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
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
    ready,
    pending,
    loadFailed,
    retryLoad: () => setFailedLoadKey(null),
    pool,
    answer,
    guesses,
    cells,
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
    visibleClues: verdict?.clues ?? [],
    hasNextClue: nextClueLabel !== null,
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
