import { ALL_MOVIES, DECADES, GAME_RULES, MOVIES, movieFamilies, movieLane, movieLeads, movieTitleWords, type Decade, type Movie } from "./game-data";

// Pure game rules shared by both game views and the unit tests. Nothing in this
// module touches React, the DOM, or storage.

export type Mode = "daily" | "practice" | "archive";
export type Result = "match" | "close" | "miss";
export type Era = Decade | "All";
export type ClueField = "year" | "hero" | "director" | "genres" | "lane" | "words";
export type GameStatus = "playing" | "won" | "lost";

export const ERAS: Era[] = ["All", ...DECADES];
export const CLUE_FIELDS: ClueField[] = ["year", "hero", "director", "genres", "lane", "words"];
export const ARCHIVE_DAYS = 7;
export const MOVIE_BY_ID = new Map(ALL_MOVIES.map((movie) => [movie.id, movie]));

const FIRST_PUZZLE_DATE = "2026-01-01";

export function indiaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

export function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/th/g, "t")
    .replace(/sh/g, "s");
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

// FNV-1a with a murmur3 finalizer: cheap, stable across browsers, and well mixed
// enough that neighbouring ids land far apart in the daily order.
export function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

// The catalogue is sorted by year and title, so indexing it by puzzle number made
// consecutive daily answers predictable. Each era instead gets a fixed scrambled
// order that every player shares and that never repeats within one full cycle.
const dailyOrders = new Map<Era, Movie[]>();

export function dailyMovie(era: Era, puzzle: number) {
  let order = dailyOrders.get(era);
  if (!order) {
    order = [...moviesForEra(era)].sort((a, b) => hashString(`${era}:${a.id}`) - hashString(`${era}:${b.id}`) || a.id.localeCompare(b.id));
    dailyOrders.set(era, order);
  }
  return order[(((puzzle - 1) % order.length) + order.length) % order.length];
}

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

export function resultEmoji(guess: Movie, answer: Movie) {
  return CLUE_FIELDS.map((field) => ({ match: "🟩", close: "🟨", miss: "⬛" })[getResult(field, guess, answer)]).join("");
}

export function scoreFor(guesses: number, cluesUsed: number) {
  return Math.max(100, GAME_RULES.baseScore - Math.max(0, guesses - 1) * GAME_RULES.guessPenalty - cluesUsed * GAME_RULES.cluePenalty);
}

export function gameStatus(guesses: Movie[], answer: Movie): GameStatus {
  if (guesses.some((guess) => guess.id === answer.id)) return "won";
  return guesses.length >= GAME_RULES.maxGuesses ? "lost" : "playing";
}

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
