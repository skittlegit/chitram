import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_MOVIES, GAME_RULES, MOVIES, type Movie } from "../app/game-data";
import { dailyAnswer as dailyMovie } from "../app/daily-answer";
import {
  displayedStreak,
  emojiRow,
  gameHistoryKey,
  gameStatus,
  getResult,
  guessCells,
  normalize,
  nextStreak,
  puzzleNumber,
  scoreFor,
  shiftDate,
} from "../app/game-logic";

function movie(overrides: Partial<Movie>): Movie {
  return {
    id: "test",
    title: "Test Film",
    year: 2010,
    hero: "Nani",
    family: "Independent",
    director: "Someone",
    genres: ["Drama"],
    banner: "Breakout hit",
    release: "Regular",
    difficulty: "Fan favourite",
    storyClue: "",
    lane: "Breakout hit",
    ...overrides,
  };
}

describe("dates", () => {
  it("numbers puzzles from 1 Jan 2026 IST", () => {
    assert.equal(puzzleNumber("2026-01-01"), 1);
    assert.equal(puzzleNumber("2026-10-16"), 289);
  });

  it("shifts across month and year boundaries", () => {
    assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
    assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
    assert.equal(gameHistoryKey("2026-10-16", 2, "All"), "2026-10-14:All");
  });
});

describe("daily answer", () => {
  it("is deterministic", () => {
    assert.equal(dailyMovie("All", 289).id, dailyMovie("All", 289).id);
  });

  it("visits every film once per cycle", () => {
    const seen = new Set(ALL_MOVIES.map((_, index) => dailyMovie("All", index + 1).id));
    assert.equal(seen.size, ALL_MOVIES.length);
    assert.equal(dailyMovie("All", 1).id, dailyMovie("All", ALL_MOVIES.length + 1).id);
  });

  it("stays inside the chosen era", () => {
    for (let puzzle = 1; puzzle <= 50; puzzle += 1) assert.ok(MOVIES["2000s"].includes(dailyMovie("2000s", puzzle)));
  });

  it("does not walk the catalogue in order", () => {
    // The original bug: consecutive days were alphabetical neighbours from one year.
    let sameYear = 0;
    for (let puzzle = 1; puzzle < 200; puzzle += 1) {
      if (dailyMovie("All", puzzle).year === dailyMovie("All", puzzle + 1).year) sameYear += 1;
    }
    assert.ok(sameYear < 40, `${sameYear} of 199 consecutive days shared a release year`);
  });

  it("handles puzzles before the first day", () => {
    assert.ok(dailyMovie("All", -5));
  });
});

describe("guess comparison", () => {
  const answer = movie({ id: "a", year: 2012, hero: "Allu Arjun", director: "Sukumar", genres: ["Action", "Drama"], title: "One Two" });

  it("marks every field exact for the answer itself", () => {
    assert.equal(emojiRow(guessCells(answer, answer).map((cell) => cell.result)), "🟩🟩🟩🟩🟩🟩");
  });

  it("treats years within two as close", () => {
    assert.equal(getResult("year", movie({ year: 2014 }), answer), "close");
    assert.equal(getResult("year", movie({ year: 2015 }), answer), "miss");
  });

  it("treats a related film family as a close lead", () => {
    assert.equal(getResult("hero", movie({ hero: "Ram Charan" }), answer), "close");
    assert.equal(getResult("hero", movie({ hero: "Nani" }), answer), "miss");
    assert.equal(getResult("hero", movie({ hero: "Allu Arjun" }), answer), "match");
  });

  it("scores genre overlap and title length", () => {
    assert.equal(getResult("genres", movie({ genres: ["Action"] }), answer), "close");
    assert.equal(getResult("genres", movie({ genres: ["Drama", "Action"] }), answer), "match");
    assert.equal(getResult("words", movie({ title: "One" }), answer), "close");
    assert.equal(getResult("words", movie({ title: "A B C D" }), answer), "miss");
  });

  it("points the year note toward the answer", () => {
    assert.equal(guessCells(movie({ year: 2005 }), answer)[0].note, "Answer is later ↑");
    assert.equal(guessCells(movie({ year: 2020 }), answer)[0].note, "Answer is earlier ↓");
  });

  it("labels an exact year with the release window only when it is special", () => {
    const sankranti = movie({ id: "s", year: 2012, release: "Sankranti" });
    assert.equal(guessCells(movie({ year: 2012 }), answer)[0].resultLabel, "Exact match");
    assert.equal(guessCells(movie({ year: 2012 }), sankranti)[0].resultLabel, "Sankranti release");
  });
});

describe("scoring and status", () => {
  it("charges extra guesses and clues, with a floor", () => {
    assert.equal(scoreFor(1, 0), GAME_RULES.baseScore);
    assert.equal(scoreFor(3, 1), GAME_RULES.baseScore - 2 * GAME_RULES.guessPenalty - GAME_RULES.cluePenalty);
    assert.equal(scoreFor(8, 3), 175);
    assert.equal(scoreFor(20, 20), 100);
  });

  it("derives won, lost and playing", () => {
    const answer = movie({ id: "a" });
    const misses = Array.from({ length: GAME_RULES.maxGuesses }, (_, index) => movie({ id: `m${index}` }));
    assert.equal(gameStatus([], answer), "playing");
    assert.equal(gameStatus([misses[0], answer], answer), "won");
    assert.equal(gameStatus(misses, answer), "lost");
  });
});

describe("streak", () => {
  const today = "2026-10-16";
  const yesterday = "2026-10-15";

  it("extends a streak won yesterday", () => {
    assert.deepEqual(nextStreak({ streak: 4, lastWinDate: yesterday }, "daily", true, today), { streak: 5, lastWinDate: today });
  });

  it("restarts after a missed day", () => {
    assert.deepEqual(nextStreak({ streak: 4, lastWinDate: "2026-10-10" }, "daily", true, today), { streak: 1, lastWinDate: today });
  });

  it("counts several eras won on one day once", () => {
    assert.deepEqual(nextStreak({ streak: 5, lastWinDate: today }, "daily", true, today), { streak: 5, lastWinDate: today });
    assert.deepEqual(nextStreak({ streak: 5, lastWinDate: today }, "daily", false, today), { streak: 5, lastWinDate: today });
  });

  it("resets on a daily loss", () => {
    assert.deepEqual(nextStreak({ streak: 5, lastWinDate: yesterday }, "daily", false, today), { streak: 0, lastWinDate: yesterday });
  });

  it("ignores practice and archive games", () => {
    for (const mode of ["practice", "archive"] as const) {
      assert.deepEqual(nextStreak({ streak: 2, lastWinDate: yesterday }, mode, true, today), { streak: 2, lastWinDate: yesterday });
      assert.deepEqual(nextStreak({ streak: 2, lastWinDate: yesterday }, mode, false, today), { streak: 2, lastWinDate: yesterday });
    }
  });

  it("grandfathers streaks saved before win dates were tracked", () => {
    assert.deepEqual(nextStreak({ streak: 3 }, "daily", true, today), { streak: 4, lastWinDate: today });
  });

  it("shows a lapsed streak as zero", () => {
    assert.equal(displayedStreak({ streak: 6, lastWinDate: yesterday }, today), 6);
    assert.equal(displayedStreak({ streak: 6, lastWinDate: "2026-10-14" }, today), 0);
    assert.equal(displayedStreak({ streak: 6 }, today), 6);
  });
});

describe("search normalisation", () => {
  it("folds common Telugu transliteration variants", () => {
    assert.equal(normalize("Seetha Ramam"), normalize("Sitha Ramam"));
    assert.equal(normalize("Bahubali"), normalize("Baahubali"));
  });
});
