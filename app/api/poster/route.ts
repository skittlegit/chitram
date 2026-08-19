import { NextRequest, NextResponse } from "next/server";
import { ALL_MOVIES, movieLeads, type Movie } from "../../game-data";

type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  poster_path: string | null;
  release_date?: string;
  popularity?: number;
};

type TmdbSearchResponse = {
  results?: TmdbMovie[];
};

type TmdbPerson = {
  name: string;
  original_name?: string;
  job?: string;
};

type TmdbCreditsResponse = {
  cast?: TmdbPerson[];
  crew?: TmdbPerson[];
};

const MONTH = 60 * 60 * 24 * 30;
const MAX_CREDIT_CHECKS = 8;

const PERSON_ALIASES: Record<string, string[]> = {
  jrntr: ["ntramaraojr", "ntaramaoraojr"],
  nandamuribalakrishna: ["balakrishna"],
  saidharamtej: ["saidurghatej"],
  vijaydeverakonda: ["vijaydevarakonda"],
  dulquersalmaan: ["dulquersalman"],
  keerthysuresh: ["keerthisuresh"],
  sreevishnu: ["srivishnu"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleMatches(result: TmdbMovie, movie: Movie) {
  const targets = [movie.title, ...(movie.aliases || [])].map(normalize);
  return [result.title, result.original_title].some((title) => targets.includes(normalize(title)));
}

function personMatches(expected: string, actual: string) {
  const expectedName = normalize(expected);
  const actualName = normalize(actual);
  const acceptedNames = [expectedName, ...(PERSON_ALIASES[expectedName] || [])];

  return acceptedNames.some((name) =>
    name === actualName ||
    (name.length >= 6 && actualName.length >= 6 && (name.includes(actualName) || actualName.includes(name))),
  );
}

function movieScore(result: TmdbMovie, movie: Movie) {
  const releaseYear = Number(result.release_date?.slice(0, 4));
  const exactTitle = titleMatches(result, movie);

  return (
    Number(result.original_language === "te") * 80 +
    Number(releaseYear === movie.year) * 120 +
    Number(Math.abs(releaseYear - movie.year) === 1) * 50 +
    Number(exactTitle) * 140 +
    Math.min(result.popularity || 0, 40)
  );
}

function plausibleCandidate(result: TmdbMovie, movie: Movie) {
  const releaseYear = Number(result.release_date?.slice(0, 4));
  return titleMatches(result, movie) || (Number.isFinite(releaseYear) && Math.abs(releaseYear - movie.year) <= 1);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function posterTitleLines(title: string) {
  const lines: string[] = [];
  for (const word of title.trim().split(/\s+/)) {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > 14) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }

  if (lines.length <= 4) return lines;
  return [...lines.slice(0, 3), `${lines.slice(3).join(" ").slice(0, 17)}…`];
}

function fallbackPoster(movie: Movie) {
  const titleLines = posterTitleLines(movie.title);
  const longestTitleLine = Math.max(...titleLines.map((line) => line.length));
  const titleFontSize = Math.max(22, Math.min(36, Math.floor(300 / Math.max(1, longestTitleLine * .66))));
  const titleStart = 250 - (titleLines.length - 1) * 23;
  const titleMarkup = titleLines
    .map((line, index) => `<text x="171" y="${titleStart + index * 46}" text-anchor="middle">${escapeXml(line)}</text>`)
    .join("");
  const safeTitle = escapeXml(movie.title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 342 513" role="img" aria-label="${safeTitle} poster">
      <rect width="342" height="513" fill="#b73527"/>
      <rect width="342" height="72" fill="#efb52d"/>
      <rect y="410" width="342" height="103" fill="#7f241c"/>
      <g fill="none" stroke="#7f241c" stroke-width="2" opacity=".58">
        <circle cx="171" cy="240" r="48"/><circle cx="171" cy="240" r="86"/><circle cx="171" cy="240" r="124"/><circle cx="171" cy="240" r="162"/>
      </g>
      <g fill="#12100f">
        ${Array.from({ length: 17 }, (_, index) => `<circle cx="${11 + index * 20}" cy="72" r="3"/>`).join("")}
        ${Array.from({ length: 17 }, (_, index) => `<circle cx="${11 + index * 20}" cy="410" r="3"/>`).join("")}
      </g>
      <text x="20" y="33" fill="#12100f" font-family="Arial, sans-serif" font-size="12" font-weight="900" letter-spacing="2">CHITRAM</text>
      <text x="322" y="33" text-anchor="end" fill="#12100f" font-family="Arial, sans-serif" font-size="9" font-weight="800" letter-spacing="1.5">BASE POSTER</text>
      <text x="171" y="54" text-anchor="middle" fill="#7f241c" font-family="Arial, sans-serif" font-size="8" font-weight="800" letter-spacing="2.5">TELUGU CINEMA</text>
      <g fill="#f4ead7" font-family="Arial Black, Arial, sans-serif" font-size="${titleFontSize}" font-weight="900">${titleMarkup}</g>
      <text x="171" y="461" text-anchor="middle" fill="#f4ead7" font-family="Arial Black, Arial, sans-serif" font-size="34" font-weight="900">${movie.year}</text>
      <text x="171" y="486" text-anchor="middle" fill="#efb52d" font-family="Arial, sans-serif" font-size="9" font-weight="800" letter-spacing="3">POSTER UNAVAILABLE</text>
    </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${MONTH}, stale-while-revalidate=86400`,
      "X-Poster-Source": "fallback",
    },
  });
}

async function searchTmdb(movie: Movie, token: string | undefined, apiKey: string | undefined) {
  const titleWithoutSubtitle = movie.title.split(/:\s|\s[-–—]\s/)[0];
  const titles = [...new Set([movie.title, ...(movie.aliases || []), titleWithoutSubtitle])].slice(0, 4);
  const results = new Map<number, TmdbMovie>();
  const creditRequests = new Map<number, Promise<TmdbCreditsResponse | undefined>>();

  function requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function creditsFor(result: TmdbMovie) {
    const existing = creditRequests.get(result.id);
    if (existing) return existing;

    const request = (async () => {
      try {
        const url = new URL(`https://api.themoviedb.org/3/movie/${result.id}/credits`);
        url.searchParams.set("language", "en-US");
        if (apiKey) url.searchParams.set("api_key", apiKey);

        const response = await fetch(url, {
          headers: requestHeaders(),
          next: { revalidate: MONTH },
        });
        if (!response.ok) return undefined;
        return (await response.json()) as TmdbCreditsResponse;
      } catch {
        return undefined;
      }
    })();

    creditRequests.set(result.id, request);
    return request;
  }

  async function bestCastVerifiedResult() {
    const candidates = [...results.values()]
      .filter((result) => result.poster_path && plausibleCandidate(result, movie))
      .sort((a, b) => movieScore(b, movie) - movieScore(a, movie))
      .slice(0, MAX_CREDIT_CHECKS);
    const expectedLeads = movieLeads(movie);

    const verified = await Promise.all(candidates.map(async (result) => {
      const credits = await creditsFor(result);
      if (!credits?.cast?.length) return undefined;

      const matchedLeads = expectedLeads.filter((lead) =>
        credits.cast!.some((person) =>
          [person.name, person.original_name].filter((name): name is string => Boolean(name)).some((name) => personMatches(lead, name)),
        ),
      );
      if (matchedLeads.length !== expectedLeads.length) return undefined;

      const directorMatch = (credits.crew || []).some((person) =>
        person.job === "Director" &&
        [person.name, person.original_name].filter((name): name is string => Boolean(name)).some((name) => personMatches(movie.director, name)),
      );

      return {
        result,
        score: movieScore(result, movie) + matchedLeads.length * 350 + Number(directorMatch) * 90,
      };
    }));

    return verified
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.score - a.score)[0]?.result;
  }

  async function search(title: string, includeYear: boolean) {
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", title);
    if (includeYear) url.searchParams.set("primary_release_year", String(movie.year));
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");
    if (apiKey) url.searchParams.set("api_key", apiKey);

    const response = await fetch(url, {
      headers: requestHeaders(),
      next: { revalidate: MONTH },
    });

    if (!response.ok) return;
    const data = (await response.json()) as TmdbSearchResponse;
    for (const result of data.results || []) {
      if (result.poster_path) results.set(result.id, result);
    }
  }

  for (const title of titles) {
    await search(title, true);
  }
  const yearMatched = await bestCastVerifiedResult();
  if (yearMatched) return yearMatched;

  for (const title of titles) {
    await search(title, false);
  }
  return bestCastVerifiedResult();
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const movie = ALL_MOVIES.find((item) => item.id === id);
  if (!movie) return new NextResponse("Unknown film", { status: 404 });

  const token = process.env.TMDB_API_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!token && !apiKey) return fallbackPoster(movie);

  try {
    const result = await searchTmdb(movie, token, apiKey);
    if (!result?.poster_path) return fallbackPoster(movie);

    const response = NextResponse.redirect(`https://image.tmdb.org/t/p/w342${result.poster_path}`, 307);
    response.headers.set("Cache-Control", `public, s-maxage=${MONTH}, stale-while-revalidate=86400`);
    response.headers.set("X-Poster-Source", "tmdb");
    response.headers.set("X-Poster-Verified", "cast");
    response.headers.set("X-TMDB-Movie-Id", String(result.id));
    return response;
  } catch {
    return fallbackPoster(movie);
  }
}
