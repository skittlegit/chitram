import { expect, test, type Page } from "@playwright/test";
import { dailyAnswer } from "../app/daily-answer";
import { ALL_MOVIES, type Movie } from "../app/game-data";
import { indiaDateKey, puzzleNumber, shiftDate } from "../app/game-logic";

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
    // Newest guess first, so the latest row sits right under the search box.
    await expect(page.locator(".play-guess").first()).toContainText(answer.title);
    await expect(page.locator(".play-stats")).toContainText("Played");
    await expect(page.locator(".play-stats .stats-distribution li.current")).toContainText("2");

    await page.reload();
    await expect(page.locator(".play-result")).toContainText(answer.title);
    await expect(page.locator("#film-search-focused")).toHaveCount(0);
    await expect(page.locator(".play-stats")).toContainText("Next film in");

    // The home page knows today's game is done.
    await page.goto("/");
    await expect(page.getByRole("link", { name: /See today's result/ })).toBeVisible();
    await expect(page.locator(".hero-status")).toContainText("Solved in 2");
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
    // The button names the clue and its price before you pay for it.
    await expect(page.getByRole("button", { name: /Reveal for 50 points/ })).toBeVisible();
    await page.getByRole("button", { name: /Next clue: Release year/ }).click();
    await expect(page.locator(".play-clue-stack article")).toHaveCount(1);
    await expect(page.locator(".play-clue-stack")).toContainText("Release year");
    await expect(page.locator(".play-score strong")).toHaveText("950");
    await expect(page.getByRole("button", { name: /Next clue: Genre signal/ })).toContainText("Reveal for 100 points");
  });

  test("forgives typos in search", async ({ page }) => {
    await page.goto("/game");
    await page.locator("#film-search-focused").fill("Pokkiri");
    await expect(page.getByRole("option").first()).toContainText("Pokiri");
  });
});

test.describe("home page", () => {
  test("is a landing page with no game on it", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /A movie is hiding/ })).toBeVisible();
    await expect(page.locator("#film-search-focused")).toHaveCount(0);
    await page.getByRole("link", { name: /Play today's game/ }).click();
    await expect(page).toHaveURL(/\/game$/);
    await expect(page.locator("#film-search-focused")).toBeFocused();
  });

  test("starts a practice game", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Try a practice film" }).click();
    await expect(page).toHaveURL(/\/game\?mode=practice$/);
    await expect(page.locator(".play-settings-trigger")).toContainText("Practice");
    await expect(page.locator("#film-search-focused")).toBeVisible();
  });

  test("opens an archive puzzle that survives a refresh", async ({ page }) => {
    const yesterday = shiftDate(indiaDateKey(), -1);
    const puzzle = puzzleNumber(yesterday);

    await page.goto("/");
    await page.locator(".archive-list a").first().click();
    await expect(page).toHaveURL(new RegExp(`/game\\?day=${yesterday}$`));
    await expect(page.locator(".play-kicker")).toContainText(`Archive puzzle #${puzzle}`);

    await page.reload();
    await expect(page.locator(".play-kicker")).toContainText(`Archive puzzle #${puzzle}`);
  });

  test("switches games from the options panel and keeps the address in step", async ({ page }) => {
    await page.goto("/game");
    await page.locator(".play-settings-trigger").click();
    await page.locator(".play-option-row.days button").nth(1).click();
    await expect(page).toHaveURL(new RegExp(`/game\\?day=${shiftDate(indiaDateKey(), -2)}$`));
    await expect(page.locator(".play-kicker")).toContainText("Archive puzzle");

    await page.locator(".play-settings-trigger").click();
    await page.getByRole("button", { name: /^Daily/ }).click();
    await expect(page).toHaveURL(/\/game$/);
    await expect(page.locator(".play-kicker")).toContainText("Today's premiere");
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
