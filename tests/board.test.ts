import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_MOVIES, GAME_RULES } from "../app/game-data";
import { evaluateBoard, OPENING_VERDICT } from "../app/game-logic";
import { DEFAULT_PLAYER, recordResult, withBoard } from "../app/player-store";
import { parseSharedResult, shareQuery, sharedResultFrom, shareText } from "../app/share";

const answer = ALL_MOVIES.find((movie) => movie.title === "Pokiri")!;
const others = ALL_MOVIES.filter((movie) => movie.id !== answer.id);

describe("evaluateBoard", () => {
  it("withholds the answer while the game is in progress", () => {
    const verdict = evaluateBoard(answer, { guessIds: [others[0].id], clueLabels: [] });
    assert.equal(verdict.status, "playing");
    assert.equal(verdict.answer, null);
    assert.equal(verdict.cells.length, 1);
  });

  it("reveals the answer and score once solved", () => {
    const verdict = evaluateBoard(answer, { guessIds: [others[0].id, answer.id], clueLabels: ["Release year"] });
    assert.equal(verdict.status, "won");
    assert.equal(verdict.answer?.id, answer.id);
    assert.equal(verdict.score, GAME_RULES.baseScore - GAME_RULES.guessPenalty - GAME_RULES.cluePenalty);
    assert.deepEqual(verdict.clues.map((clue) => clue.label), ["Release year"]);
  });

  it("reveals the answer after the last miss", () => {
    const verdict = evaluateBoard(answer, { guessIds: others.slice(0, GAME_RULES.maxGuesses).map((movie) => movie.id), clueLabels: [] });
    assert.equal(verdict.status, "lost");
    assert.equal(verdict.answer?.id, answer.id);
    assert.equal(verdict.score, 0);
  });

  it("skips clues a guess already confirmed", () => {
    const sameYear = others.find((movie) => movie.year === answer.year)!;
    const verdict = evaluateBoard(answer, { guessIds: [sameYear.id], clueLabels: [] });
    assert.notEqual(verdict.nextClueLabel, "Release year");
  });

  it("matches the opening verdict for any answer", () => {
    for (const movie of ALL_MOVIES.slice(0, 50)) assert.deepEqual(evaluateBoard(movie, { guessIds: [], clueLabels: [] }), OPENING_VERDICT);
  });
});

describe("recordResult", () => {
  const game = { mode: "daily" as const, historyKey: "2026-10-16:All", date: "2026-10-16", won: true, guesses: 3, score: 850 };

  it("records a daily win once", () => {
    const once = recordResult(DEFAULT_PLAYER, game);
    const twice = recordResult(once, game);
    assert.equal(once.stats.played, 1);
    assert.equal(once.stats.distribution[2], 1);
    assert.equal(once.stats.streak, 1);
    assert.deepEqual(twice, once);
  });

  it("keeps archive games out of the stats", () => {
    const archived = recordResult(DEFAULT_PLAYER, { ...game, mode: "archive" });
    assert.equal(archived.stats.played, 0);
    assert.equal(archived.completedGames[game.historyKey].score, 850);
  });

  it("counts practice games but not toward the streak", () => {
    const practiced = recordResult(DEFAULT_PLAYER, { ...game, mode: "practice" });
    assert.equal(practiced.stats.played, 1);
    assert.equal(practiced.stats.streak, 0);
    assert.deepEqual(practiced.completedGames, {});
  });

  it("drops boards that left the archive", () => {
    const board = { guessIds: ["x"], clueLabels: [] };
    const old = withBoard(DEFAULT_PLAYER, "2026-09-01:All", board, "2026-09-01");
    const fresh = withBoard(old, "2026-10-16:All", board, "2026-10-16");
    assert.deepEqual(Object.keys(fresh.boards), ["2026-10-16:All"]);
  });
});

describe("share links", () => {
  const verdict = evaluateBoard(answer, { guessIds: [others[0].id, others[1].id, answer.id], clueLabels: ["Release year"] });

  it("round-trips through the query string", () => {
    const shared = sharedResultFrom(verdict.cells, 289, "All", 1, verdict.score);
    const params = Object.fromEntries(new URLSearchParams(shareQuery(shared)));
    assert.deepEqual(parseSharedResult(params), shared);
  });

  it("writes a share message with the grid and link", () => {
    const text = shareText(sharedResultFrom(verdict.cells, 289, "All", 1, verdict.score), "https://example.test/s?x");
    assert.match(text, /^Chitram #289 · All eras\n/);
    assert.match(text, /3\/8 · 1 clue · \d+ pts\nhttps:\/\/example\.test\/s\?x$/);
  });

  it("rejects malformed links", () => {
    assert.equal(parseSharedResult({ e: "All", g: "2223", c: "0", s: "100" }), null);
    assert.equal(parseSharedResult({ e: "1990s", g: "222222", c: "0", s: "100" }), null);
    assert.equal(parseSharedResult({ e: "All", g: "222222", c: "9", s: "100" }), null);
    assert.equal(parseSharedResult({ e: "All", g: Array(9).fill("000000").join("-"), c: "0", s: "0" }), null);
  });

  it("never claims points for a lost game", () => {
    assert.equal(parseSharedResult({ e: "All", g: "000000", c: "0", s: "900" })?.score, 0);
  });
});
