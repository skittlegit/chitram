import { expect, test, type Page } from "@playwright/test";
import { dailyAnswer } from "../app/daily-answer";
import { ALL_MOVIES, type Movie } from "../app/game-data";
import { indiaDateKey, puzzleNumber } from "../app/game-logic";

const answer = dailyAnswer("All", puzzleNumber(indiaDateKey()));
// A wrong guess whose title is unique, so typing it puts it first in the list.
const wrong = ALL_MOVIES.find((movie) =>
  movie.id !== answer.id && ALL_MOVIES.filter((other) => other.title === movie.title).length === 1 && movie.title.length > 4,
)!;

async function guess(page: Page, movie: Movie) {
  const search = page.locator("#film-search-focused");
  await search.fill(movie.title);
  await page.locator(`#focused-film-option-${movie.id}`).click();
}

test.describe("daily game on /game", () => {
  test("resumes after a refresh and stays finished once solved", async ({ page }) => {
    await page.goto("/game");
    await expect(page.locator("#film-search-focused")).toBeVisible();

    await guess(page, wrong);
    await expect(page.locator(".play-guess")).toHaveCount(1);
    await expect(page.locator(".play-guess").first()).toContainText(wrong.title);
    await expect(page.locator(".play-result")).toHaveCount(0);

    await page.reload();
    await expect(page.locator(".play-guess")).toHaveCount(1);
    await expect(page.locator(".play-guess").first()).toContainText(wrong.title);

    await guess(page, answer);
    await expect(page.locator(".play-result")).toContainText(answer.title);
    await expect(page.locator(".play-result")).toContainText("That's the one");
    await expect(page.locator(".play-stats")).toContainText("Played");
    await expect(page.locator(".play-stats .stats-distribution li.current")).toContainText("2");

    await page.reload();
    await expect(page.locator(".play-result")).toContainText(answer.title);
    await expect(page.locator("#film-search-focused")).toHaveCount(0);
  });

  test("keeps the answer out of the page until the game ends", async ({ page }) => {
    const verdicts: string[] = [];
    page.on("response", async (response) => {
      if (response.url().endsWith("/api/puzzle")) verdicts.push(await response.text());
    });

    await page.goto("/game");
    await guess(page, wrong);
    await expect(page.locator(".play-guess")).toHaveCount(1);
    expect(verdicts.length).toBeGreaterThan(0);
    for (const body of verdicts) expect(body).not.toContain(answer.id);
  });

  test("reveals a clue and charges for it", async ({ page }) => {
    await page.goto("/game");
    await page.getByRole("button", { name: /Reveal next clue/ }).click();
    await expect(page.locator(".play-clue-stack article")).toHaveCount(1);
    await expect(page.locator(".play-clue-stack")).toContainText("Release year");
    await expect(page.locator(".play-score strong")).toHaveText("900");
  });

  test("forgives typos in search", async ({ page }) => {
    await page.goto("/game");
    await page.locator("#film-search-focused").fill("Pokkiri");
    await expect(page.getByRole("option").first()).toContainText("Pokiri");
  });
});

test.describe("home page", () => {
  test("starts a practice game", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try a practice film" }).click();
    await expect(page.locator(".settings-summary")).toContainText("Practice");
    await expect(page.locator("#film-search")).toBeVisible();
  });

  test("serves the TMDB credit logo from this site under a strict CSP", async ({ page, request }) => {
    const response = await page.goto("/");
    const csp = response!.headers()["content-security-policy"];
    expect(csp).toContain("img-src 'self' data: blob: https://image.tmdb.org");
    expect(csp).not.toContain("www.themoviedb.org");

    const logo = await request.get("/tmdb-logo.svg");
    expect(logo.status()).toBe(200);
    expect(logo.headers()["content-type"]).toContain("image/svg+xml");
  });
});

test.describe("shared results", () => {
  const query = "n=289&e=All&g=012210-222222&c=1&s=825";

  test("render a landing page with a preview image", async ({ page, request }) => {
    await page.goto(`/s?${query}`);
    await expect(page.getByRole("heading", { name: "Chitram #289 · All eras" })).toBeVisible();
    await expect(page.locator(".share-grid i")).toHaveCount(12);

    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toContain("/s/og?");
    const response = await request.get(new URL(image!).pathname + new URL(image!).search);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("fall back gracefully for a broken link", async ({ page }) => {
    await page.goto("/s?e=All&g=nonsense");
    await expect(page.getByRole("heading", { name: "Name the Telugu movie." })).toBeVisible();
  });
});
