import { useSyncExternalStore } from "react";
import { ARCHIVE_DAYS, shiftDate } from "./game-logic";

// Device-local player data, kept in localStorage and read through
// useSyncExternalStore so every mounted view and other tabs stay in sync.

export type PlayerStats = {
  played: number;
  wins: number;
  streak: number;
  bestScore: number;
  points: number;
  distribution: number[];
  lastWinDate?: string;
};

export type CompletedGame = {
  result: "won" | "lost";
  score: number;
  guesses: number;
};

export type Board = {
  guessIds: string[];
  clueLabels: string[];
};

export type PlayerData = {
  stats: PlayerStats;
  watchlist: string[];
  completedGames: Record<string, CompletedGame>;
  boards: Record<string, Board>;
};

const DEFAULT_STATS: PlayerStats = {
  played: 0,
  wins: 0,
  streak: 0,
  bestScore: 0,
  points: 0,
  distribution: [0, 0, 0, 0, 0, 0, 0, 0],
};
export const DEFAULT_PLAYER: PlayerData = { stats: DEFAULT_STATS, watchlist: [], completedGames: {}, boards: {} };
export const EMPTY_BOARD: Board = { guessIds: [], clueLabels: [] };

const PLAYER_KEY = "chitram-player-v2";
const LEGACY_STATS_KEY = "chitram-stats";
const PLAYER_EVENT = "chitram-player-change";

let cachedPlayerJson: string | null = null;
let cachedPlayer = DEFAULT_PLAYER;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STATS_KEY) || "null");
    cachedPlayer = {
      stats: { ...DEFAULT_STATS, ...(legacy || {}), ...(parsed?.stats || {}) },
      watchlist: Array.isArray(parsed?.watchlist) ? parsed.watchlist : [],
      completedGames: isRecord(parsed?.completedGames) ? (parsed.completedGames as PlayerData["completedGames"]) : {},
      boards: isRecord(parsed?.boards) ? (parsed.boards as PlayerData["boards"]) : {},
    };
  } catch {
    cachedPlayer = DEFAULT_PLAYER;
  }
  return cachedPlayer;
}

export function savePlayer(next: PlayerData) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(PLAYER_EVENT));
}

export function usePlayer() {
  return useSyncExternalStore(subscribeToPlayer, getPlayerSnapshot, () => DEFAULT_PLAYER);
}

// Boards older than the archive window can never be shown again, so drop them
// whenever a board is written to keep localStorage small.
export function boardsWith(boards: PlayerData["boards"], key: string, board: Board, today: string) {
  const oldestKept = shiftDate(today, -(ARCHIVE_DAYS + 1));
  const kept = Object.fromEntries(Object.entries(boards).filter(([boardKey]) => boardKey.slice(0, 10) >= oldestKept));
  return { ...kept, [key]: board };
}
