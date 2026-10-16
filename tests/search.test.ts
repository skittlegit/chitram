import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_MOVIES } from "../app/game-data";
import { editDistance, exactMovie, normalize, searchMovies } from "../app/game-logic";

const titles = (query: string) => searchMovies(ALL_MOVIES, query).map((movie) => movie.title);

describe("search", () => {
  it("folds doubled letters and common romanisation variants", () => {
    assert.equal(normalize("Pokkiri"), normalize("Pokiri"));
    assert.equal(normalize("Seetha Ramam"), normalize("Sitha Ramam"));
    assert.equal(normalize("Bahubali"), normalize("Baahubali"));
    assert.equal(normalize("Jawaan"), normalize("Javan"));
  });

  it("measures edit distance with an early exit", () => {
    assert.equal(editDistance("kitten", "sitting"), 3);
    assert.equal(editDistance("abc", "abc"), 0);
    assert.ok(editDistance("abcdef", "uvwxyz", 1) > 1);
  });

  it("ranks prefix matches before substring matches", () => {
    assert.ok(titles("pushpa")[0].startsWith("Pushpa"));
  });

  it("finds films despite a typo", () => {
    assert.ok(titles("Pokkiri").includes("Pokiri"));
    assert.ok(titles("Magadheeraa").includes("Magadheera"));
    assert.ok(titles("Rangastalm").includes("Rangasthalam"));
  });

  it("matches a typo in a later word of the title", () => {
    assert.ok(titles("Vaikuntapuramlo").includes("Ala Vaikunthapurramuloo"));
  });

  it("does not match unrelated short queries fuzzily", () => {
    assert.deepEqual(titles("zqx"), []);
  });

  it("excludes films already guessed", () => {
    const pokiri = ALL_MOVIES.find((movie) => movie.title === "Pokiri")!;
    assert.ok(!searchMovies(ALL_MOVIES, "Pokiri", [pokiri.id]).includes(pokiri));
  });

  it("resolves an exact title or alias", () => {
    assert.equal(exactMovie(ALL_MOVIES, "AVPL")?.title, "Ala Vaikunthapurramuloo");
    assert.equal(exactMovie(ALL_MOVIES, "Pokir"), undefined);
  });
});
