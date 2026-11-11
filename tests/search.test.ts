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

  it("finds films by lead actor or director, newest first, after any title matches", () => {
    const sukumar = searchMovies(ALL_MOVIES, "sukumar");
    assert.ok(sukumar.length >= 5);
    assert.ok(sukumar.every((movie) => movie.director === "Sukumar"));
    assert.deepEqual(sukumar.map((movie) => movie.year), sukumar.map((movie) => movie.year).sort((a, b) => b - a));

    assert.ok(searchMovies(ALL_MOVIES, "mahesh babu").filter((movie) => movie.hero === "Mahesh Babu").length >= 20);
    assert.ok(searchMovies(ALL_MOVIES, "rajamouli").some((movie) => movie.title === "Eega"));
    // A title match still leads, and two letters are too few to search people.
    assert.equal(searchMovies(ALL_MOVIES, "arya")[0].title, "Arya");
    assert.ok(searchMovies(ALL_MOVIES, "na").length <= 5);
  });

  it("offers five title suggestions and puts the shortest matching title first", () => {
    const results = searchMovies(ALL_MOVIES, "nuvv");
    assert.equal(results.length, 5);
    const lengths = results.map((movie) => normalize(movie.title).length);
    assert.deepEqual(lengths, [...lengths].sort((a, b) => a - b));
  });
});
