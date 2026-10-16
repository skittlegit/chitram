import { GAME_RULES } from "./game-data";
import { CLUE_FIELDS, emojiRow, eraLabel, isEra, type Era, type GuessCell, type Result } from "./game-logic";

// A shared result travels entirely in the /s link's query string, so the share
// page and its preview image need no storage. Nothing in it reveals the answer.

export type SharedResult = {
  puzzle: number | null;
  era: Era;
  rows: Result[][];
  clues: number;
  score: number;
  won: boolean;
};

const RESULT_DIGIT: Record<Result, string> = { miss: "0", close: "1", match: "2" };
const DIGIT_RESULT: Record<string, Result> = { 0: "miss", 1: "close", 2: "match" };

export function sharedResultFrom(cells: GuessCell[][], puzzle: number | null, era: Era, clues: number, score: number): SharedResult {
  const rows = cells.map((row) => row.map((cell) => cell.result));
  return { puzzle, era, rows, clues, score, won: rows.at(-1)?.every((result) => result === "match") ?? false };
}

export function shareQuery(result: SharedResult) {
  const params = new URLSearchParams();
  if (result.puzzle !== null) params.set("n", String(result.puzzle));
  params.set("e", result.era);
  params.set("g", result.rows.map((row) => row.map((value) => RESULT_DIGIT[value]).join("")).join("-"));
  params.set("c", String(result.clues));
  params.set("s", String(result.score));
  return params.toString();
}

type Params = Record<string, string | string[] | undefined>;

function intParam(params: Params, key: string, min: number, max: number) {
  const raw = params[key];
  if (typeof raw !== "string" || !/^\d{1,6}$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}

export function parseSharedResult(params: Params): SharedResult | null {
  const era = params.e;
  const grid = params.g;
  if (!isEra(era) || typeof grid !== "string") return null;

  const rowPattern = new RegExp(`^[012]{${CLUE_FIELDS.length}}$`);
  const rowStrings = grid.split("-");
  if (rowStrings.length < 1 || rowStrings.length > GAME_RULES.maxGuesses || !rowStrings.every((row) => rowPattern.test(row))) return null;
  const rows = rowStrings.map((row) => [...row].map((digit) => DIGIT_RESULT[digit]));

  const clues = intParam(params, "c", 0, GAME_RULES.maxClues);
  const score = intParam(params, "s", 0, GAME_RULES.baseScore);
  if (clues === null || score === null) return null;
  const puzzle = params.n === undefined ? null : intParam(params, "n", 1, 99999);
  if (params.n !== undefined && puzzle === null) return null;

  const won = rows.at(-1)!.every((result) => result === "match");
  return { puzzle, era, rows, clues, score: won ? score : 0, won };
}

export function shareTitle(result: SharedResult) {
  return result.puzzle === null ? `Chitram practice · ${eraLabel(result.era)}` : `Chitram #${result.puzzle} · ${eraLabel(result.era)}`;
}

export function shareOutcome(result: SharedResult) {
  const clueCount = `${result.clues} ${result.clues === 1 ? "clue" : "clues"}`;
  return result.won
    ? `${result.rows.length}/${GAME_RULES.maxGuesses} · ${clueCount} · ${result.score} pts`
    : `X/${GAME_RULES.maxGuesses} · ${clueCount}`;
}

export function shareText(result: SharedResult, url: string) {
  const grid = result.rows.map(emojiRow).join("\n");
  return `${shareTitle(result)}\n${grid}\n${shareOutcome(result)}\n${url}`;
}
