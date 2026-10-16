import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/puzzle/route";
import { dailyAnswer } from "../app/daily-answer";
import { ALL_MOVIES } from "../app/game-data";
import { indiaDateKey, puzzleNumber, shiftDate } from "../app/game-logic";

const today = indiaDateKey();
const answer = dailyAnswer("All", puzzleNumber(today));
const wrong = ALL_MOVIES.find((movie) => movie.id !== answer.id && movie.title !== answer.title)!;

function call(body: unknown) {
  return POST(new NextRequest("http://localhost/api/puzzle", { method: "POST", body: JSON.stringify(body) }));
}

describe("POST /api/puzzle", () => {
  it("scores a guess without revealing the answer", async () => {
    const response = await call({ date: today, offset: 0, era: "All", guessIds: [wrong.id], clueLabels: [] });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const verdict = await response.json();
    assert.equal(verdict.status, "playing");
    assert.equal(verdict.answer, null);
    assert.equal(verdict.cells.length, 1);
    assert.ok(!JSON.stringify(verdict).includes(answer.id));
  });

  it("reveals the answer once it is guessed", async () => {
    const verdict = await (await call({ date: today, offset: 0, era: "All", guessIds: [answer.id], clueLabels: [] })).json();
    assert.equal(verdict.status, "won");
    assert.equal(verdict.answer.id, answer.id);
  });

  it("serves archive days by offset", async () => {
    const response = await call({ date: today, offset: 3, era: "2010s", guessIds: [wrong.id], clueLabels: [] });
    assert.equal(response.status, 200);
  });

  it("refuses future puzzles and days beyond the archive", async () => {
    assert.equal((await call({ date: shiftDate(today, 1), offset: 0, era: "All", guessIds: [], clueLabels: [] })).status, 404);
    assert.equal((await call({ date: shiftDate(today, -20), offset: 0, era: "All", guessIds: [], clueLabels: [] })).status, 404);
  });

  it("rejects malformed boards", async () => {
    const base = { date: today, offset: 0, era: "All", guessIds: [], clueLabels: [] };
    assert.equal((await call({ ...base, era: "1990s" })).status, 400);
    assert.equal((await call({ ...base, offset: 99 })).status, 400);
    assert.equal((await call({ ...base, guessIds: ["not-a-film"] })).status, 400);
    assert.equal((await call({ ...base, guessIds: [wrong.id, wrong.id] })).status, 400);
    assert.equal((await call({ ...base, clueLabels: ["The answer"] })).status, 400);
  });
});
