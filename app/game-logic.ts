import { ALL_MOVIES, DECADES, GAME_RULES, MOVIES, movieFamilies, movieLane, movieLeads, movieTitleWords, type Decade, type Movie } from "./game-data";

// Pure game rules shared by the client views, the puzzle API and the unit tests.
// Nothing here touches React, the DOM, or storage. The daily answer itself is
// chosen in daily-answer.ts, which only server code may import.

export type Mode = "daily" | "practice" | "archive";
export type Result = "match" | "close" | "miss";
export type Era = Decade | "All";
export type ClueField = "year" | "hero" | "director" | "genres" | "lane" | "words";
export type GameStatus = "playing" | "won" | "lost";
export type Board = { guessIds: string[]; clueLabels: string[] };
export type Clue = { label: string; value: string; field?: ClueField };

export const ERAS: Era[] = ["All", ...DECADES];
export const CLUE_FIELDS: ClueField[] = ["year", "hero", "director", "genres", "lane", "words"];
export const ARCHIVE_DAYS = 7;
export const MOVIE_BY_ID = new Map(ALL_MOVIES.map((movie) => [movie.id, movie]));
export const EMPTY_BOARD: Board = { guessIds: [], clueLabels: [] };

const FIRST_PUZZLE_DATE = "2026-01-01";

export function isEra(value: unknown): value is Era {
  return typeof value === "string" && (ERAS as string[]).includes(value);
}

export function indiaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

export function puzzleNumber(date: string) {
  return Math.floor(
    (new Date(`${date}T00:00:00+05:30`).getTime() - new Date(`${FIRST_PUZZLE_DATE}T00:00:00+05:30`).getTime()) / 86400000,
  ) + 1;
}

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00+05:30`);
  value.setUTCDate(value.getUTCDate() + days);
  return indiaDateKey(value);
}

export function archiveLabel(date: string, offset: number) {
  const value = new Date(`${shiftDate(date, -offset)}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "Asia/Kolkata" }).format(value);
}

export function gameHistoryKey(date: string, offset: number, era: Era) {
  return `${shiftDate(date, -offset)}:${era}`;
}

export function moviesForEra(era: Era) {
  return era === "All" ? ALL_MOVIES : MOVIES[era];
}

export function eraLabel(era: Era) {
  return era === "All" ? "All eras" : era;
}

// ---------------------------------------------------------------------------
// Search

// Telugu titles are romanised many ways, so both the query and every title are
// folded to one spelling: long vowels, aspirated consonants, w/v and doubled
// letters all collapse ("Pokkiri" and "Pokiri" both become "pokiri").
export function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/th/g, "t")
    .replace(/sh/g, "s")
    .replace(/w/g, "v")
    .replace(/(.)\1+/g, "$1");
}

// Levenshtein distance with an early exit once every path exceeds `limit`.
export function editDistance(a: string, b: string, limit = Infinity) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
      rowMinimum = Math.min(rowMinimum, current[j]);
    }
    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

// 4 exact, 3 prefix, 2 substring, 1 close typo of a word-start prefix, 0 none.
export function matchScore(movie: Movie, normalizedQuery: string) {
  let best = 0;
  for (const name of [movie.title, ...(movie.aliases || [])]) {
    const normalizedName = normalize(name);
    if (normalizedName === normalizedQuery) return 4;
    if (normalizedName.startsWith(normalizedQuery)) best = Math.max(best, 3);
    else if (normalizedName.includes(normalizedQuery)) best = Math.max(best, 2);
    else if (best === 0 && normalizedQuery.length >= 4) {
      const allowed = normalizedQuery.length >= 7 ? 2 : 1;
      const words = name.trim().split(/\s+/);
      const typo = words.some((_, index) => {
        const tail = normalize(words.slice(index).join(""));
        return editDistance(normalizedQuery, tail.slice(0, normalizedQuery.length), allowed) <= allowed ||
          editDistance(normalizedQuery, tail, allowed) <= allowed;
      });
      if (typo) best = 1;
    }
  }
  return best;
}

export function searchMovies(pool: Movie[], query: string, excludeIds: string[] = [], limit = 3) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  return pool
    .filter((movie) => !excludeIds.includes(movie.id))
    .map((movie) => ({ movie, score: matchScore(movie, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ movie }) => movie);
}

export function exactMovie(pool: Movie[], query: string) {
  const normalizedQuery = normalize(query);
  return normalizedQuery ? pool.find((movie) => matchScore(movie, normalizedQuery) === 4) : undefined;
}

// ---------------------------------------------------------------------------
// Comparing a guess with the answer

export function getResult(field: ClueField, guess: Movie, answer: Movie): Result {
  if (guess.id === answer.id) return "match";
  if (field === "year") return guess.year === answer.year ? "match" : Math.abs(guess.year - answer.year) <= 2 ? "close" : "miss";
  if (field === "hero") {
    const guessLeads = movieLeads(guess);
    const answerLeads = movieLeads(answer);
    const answerFamilies = movieFamilies(answer);
    if (guessLeads.length === answerLeads.length && guessLeads.every((lead) => answerLeads.includes(lead))) return "match";
    const sharesLead = guessLeads.some((lead) => answerLeads.includes(lead));
    const sharesFamily = movieFamilies(guess).some((family) => family !== "Independent" && answerFamilies.includes(family));
    return sharesLead || sharesFamily ? "close" : "miss";
  }
  if (field === "director") return guess.director === answer.director ? "match" : "miss";
  if (field === "genres") {
    if (guess.genres.length === answer.genres.length && guess.genres.every((genre) => answer.genres.includes(genre))) return "match";
    return guess.genres.some((genre) => answer.genres.includes(genre)) ? "close" : "miss";
  }
  if (field === "lane") return movieLane(guess) === movieLane(answer) ? "match" : "miss";
  const difference = Math.abs(movieTitleWords(guess) - movieTitleWords(answer));
  return difference === 0 ? "match" : difference === 1 ? "close" : "miss";
}

export function titleLengthLabel(movie: Movie) {
  const words = movieTitleWords(movie);
  return `${words} ${words === 1 ? "word" : "words"}`;
}

export type GuessCell = {
  field: ClueField;
  label: string;
  value: string;
  note: string;
  result: Result;
  resultLabel: string;
};

export function guessCells(guess: Movie, answer: Movie): GuessCell[] {
  const result = (field: ClueField) => getResult(field, guess, answer);
  const cells: Omit<GuessCell, "result" | "resultLabel">[] = [
    { field: "year", label: "Year", value: String(guess.year), note: guess.year === answer.year ? "Same year" : guess.year < answer.year ? "Answer is later ↑" : "Answer is earlier ↓" },
    { field: "hero", label: "Lead", value: guess.hero, note: result("hero") === "close" ? "Related film family" : "Lead actor" },
    { field: "director", label: "Director", value: guess.director, note: "Filmmaker" },
    { field: "genres", label: "Genre", value: guess.genres.join(" / "), note: result("genres") === "close" ? "Some overlap" : "Genre" },
    { field: "lane", label: "Movie type", value: movieLane(guess), note: "Release lane" },
    { field: "words", label: "Title length", value: titleLengthLabel(guess), note: result("words") === "close" ? "Off by one" : "Word count" },
  ];

  return cells.map((cell) => {
    const cellResult = result(cell.field);
    const exactLabel = cell.field === "year" && answer.release !== "Regular" ? `${answer.release} release` : "Exact match";
    return { ...cell, result: cellResult, resultLabel: cellResult === "match" ? exactLabel : cellResult === "close" ? "Close" : "No match" };
  });
}

const EMOJI: Record<Result, string> = { match: "🟩", close: "🟨", miss: "⬛" };

export function emojiRow(results: Result[]) {
  return results.map((result) => EMOJI[result]).join("");
}

export function scoreFor(guesses: number, cluesUsed: number) {
  return Math.max(100, GAME_RULES.baseScore - Math.max(0, guesses - 1) * GAME_RULES.guessPenalty - cluesUsed * GAME_RULES.cluePenalty);
}

export function gameStatus(guesses: Movie[], answer: Movie): GameStatus {
  if (guesses.some((guess) => guess.id === answer.id)) return "won";
  return guesses.length >= GAME_RULES.maxGuesses ? "lost" : "playing";
}

// ---------------------------------------------------------------------------
// Evaluating a whole board

export function cluesFor(answer: Movie): Clue[] {
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

// Everything a player may see about a board. The answer is withheld until the
// game is over, so the puzzle API can return this verbatim.
export type Verdict = {
  cells: GuessCell[][];
  status: GameStatus;
  answer: Movie | null;
  clues: Clue[];
  nextClueLabel: string | null;
  score: number;
};

// An untouched board reveals nothing about the answer, so the client can show
// it without asking the server.
export const OPENING_VERDICT: Verdict = { cells: [], status: "playing", answer: null, clues: [], nextClueLabel: "Release year", score: 0 };

export function evaluateBoard(answer: Movie, board: Board): Verdict {
  const guesses = board.guessIds.map((id) => MOVIE_BY_ID.get(id)).filter((movie): movie is Movie => Boolean(movie));
  const status = gameStatus(guesses, answer);
  const allClues = cluesFor(answer);
  const knownFields = new Set(CLUE_FIELDS.filter((field) => guesses.some((guess) => getResult(field, guess, answer) === "match")));
  const available = allClues.filter((clue) => !board.clueLabels.includes(clue.label) && (!clue.field || !knownFields.has(clue.field)));

  return {
    cells: guesses.map((guess) => guessCells(guess, answer)),
    status,
    answer: status === "playing" ? null : answer,
    clues: allClues.filter((clue) => board.clueLabels.includes(clue.label)),
    nextClueLabel: available[0]?.label ?? null,
    score: status === "won" ? scoreFor(guesses.length, board.clueLabels.length) : 0,
  };
}

// ---------------------------------------------------------------------------
// Streaks and countdown

export type StreakState = { streak: number; lastWinDate?: string };

// The streak counts consecutive IST days with a daily win. Several eras won on the
// same day count once, and practice and archive games never touch it.
export function nextStreak(current: StreakState, mode: Mode, won: boolean, date: string): StreakState {
  const { streak, lastWinDate } = current;
  if (mode !== "daily" || lastWinDate === date) return { streak, lastWinDate };
  if (!won) return { streak: 0, lastWinDate };
  const continues = !lastWinDate || lastWinDate === shiftDate(date, -1);
  return { streak: continues ? streak + 1 : 1, lastWinDate: date };
}

// A stored streak lapses once a full IST day passes without a daily win.
export function displayedStreak(current: StreakState, date: string) {
  return !current.lastWinDate || current.lastWinDate >= shiftDate(date, -1) ? current.streak : 0;
}

export function nextPuzzleCountdown(now = new Date()) {
  const indiaNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const next = new Date(indiaNow);
  next.setHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((next.getTime() - indiaNow.getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
