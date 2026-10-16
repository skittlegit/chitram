import { useSyncExternalStore } from "react";
import { GAME_RULES } from "./game-data";
import { ARCHIVE_DAYS, nextStreak, shiftDate, type Board, type Mode } from "./game-logic";

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
  distribution: Array.from({ length: GAME_RULES.maxGuesses }, () => 0),
};
export const DEFAULT_PLAYER: PlayerData = { stats: DEFAULT_STATS, watchlist: [], completedGames: {}, boards: {} };

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

// Always derive the next state from what is stored right now, not from a value
// captured before an await, so concurrent updates (another tab, a vault toggle
// while a guess is being checked) are never overwritten.
export function updatePlayer(update: (current: PlayerData) => PlayerData) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(update(getPlayerSnapshot())));
  window.dispatchEvent(new Event(PLAYER_EVENT));
}

export function usePlayer() {
  return useSyncExternalStore(subscribeToPlayer, getPlayerSnapshot, () => DEFAULT_PLAYER);
}

// Boards older than the archive window can never be shown again, so drop them
// whenever a board is written to keep localStorage small.
export function withBoard(player: PlayerData, key: string, board: Board, today: string): PlayerData {
  const oldestKept = shiftDate(today, -(ARCHIVE_DAYS + 1));
  const kept = Object.fromEntries(Object.entries(player.boards).filter(([boardKey]) => boardKey.slice(0, 10) >= oldestKept));
  return { ...player, boards: { ...kept, [key]: board } };
}

export type FinishedGame = {
  mode: Mode;
  historyKey: string;
  date: string;
  won: boolean;
  guesses: number;
  score: number;
};

export function recordResult(player: PlayerData, game: FinishedGame): PlayerData {
  if (game.mode !== "practice" && player.completedGames[game.historyKey]) return player;

  const completedGames = game.mode === "practice" ? player.completedGames : {
    ...player.completedGames,
    [game.historyKey]: { result: game.won ? "won" : "lost", score: game.score, guesses: game.guesses } satisfies CompletedGame,
  };
  if (game.mode === "archive") return { ...player, completedGames };

  const distribution = Array.from({ length: GAME_RULES.maxGuesses }, (_, index) => player.stats.distribution[index] || 0);
  if (game.won && game.guesses > 0 && game.guesses <= distribution.length) distribution[game.guesses - 1] += 1;

  return {
    ...player,
    completedGames,
    stats: {
      played: player.stats.played + 1,
      wins: player.stats.wins + Number(game.won),
      bestScore: Math.max(player.stats.bestScore, game.score),
      points: player.stats.points + game.score,
      distribution,
      ...nextStreak(player.stats, game.mode, game.won, game.date),
    },
  };
}
