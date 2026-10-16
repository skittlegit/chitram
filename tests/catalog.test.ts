import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_MOVIES, movieLane, type Movie } from "../app/game-data";

// Keep the catalogue honest. These floors were runtime checks in game-data.ts,
// which shipped them to every browser; they now run before every build instead
// (see the prebuild script), so a regression still fails deploys.

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasBilledActor(movie: Movie, actor: string) {
  return movie.hero.split(/\s*&\s*/).includes(actor);
}

const MAINSTREAM_ACTOR_MINIMUMS: Record<string, number> = {
  Chiranjeevi: 18,
  "Pawan Kalyan": 23,
  "Mahesh Babu": 27,
  "Jr NTR": 30,
  Prabhas: 23,
  "Allu Arjun": 20,
  "Ram Charan": 15,
  "Nandamuri Balakrishna": 34,
  Nagarjuna: 39,
  Venkatesh: 34,
  "Ravi Teja": 49,
  Nani: 31,
  Gopichand: 27,
  Nithiin: 31,
  "Ram Pothineni": 22,
  "Naga Chaitanya": 22,
  "Nandamuri Kalyan Ram": 19,
  "Sai Dharam Tej": 15,
  "Varun Tej": 14,
  Sharwanand: 19,
};

describe("movie catalogue", () => {
  it("keeps its coverage floors", () => {
    const byLane = (lane: string) => ALL_MOVIES.filter((movie) => movieLane(movie) === lane).length;
    assert.ok(ALL_MOVIES.length >= 730, `total ${ALL_MOVIES.length}`);
    assert.ok(byLane("Breakout hit") >= 185, `breakout hits ${byLane("Breakout hit")}`);
    assert.ok(byLane("Cult favourite") >= 50, `cult favourites ${byLane("Cult favourite")}`);
    assert.ok(ALL_MOVIES.filter((movie) => movie.year === 2026).length >= 30, "2026 releases");
    assert.ok(ALL_MOVIES.filter((movie) => movie.storyClueSource !== "generated").length >= 550, "bespoke story clues");
  });

  it("covers the promised mainstream filmographies", () => {
    const deficits = Object.entries(MAINSTREAM_ACTOR_MINIMUMS)
      .map(([actor, minimum]) => ({ actor, minimum, count: ALL_MOVIES.filter((movie) => hasBilledActor(movie, actor)).length }))
      .filter(({ count, minimum }) => count < minimum)
      .map(({ actor, count, minimum }) => `${actor} (${count}/${minimum})`);
    assert.deepEqual(deficits, []);
  });

  it("never names the title inside its story clue", () => {
    const revealing = ALL_MOVIES.filter(
      (movie) =>
        movie.storyClueSource !== "generated" &&
        normalizeTitle(movie.title).length >= 5 &&
        normalizeTitle(movie.storyClue).includes(normalizeTitle(movie.title)),
    );
    assert.deepEqual(revealing.map((movie) => movie.title), []);
  });

  it("has unique ids", () => {
    const ids = ALL_MOVIES.map((movie) => movie.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual(duplicates, []);
  });
});
