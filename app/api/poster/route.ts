import { NextRequest, NextResponse } from "next/server";
import { ALL_MOVIES, type Movie } from "../../game-data";

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

const MONTH = 60 * 60 * 24 * 30;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function movieScore(result: TmdbMovie, movie: Movie) {
  const targets = [movie.title, ...(movie.aliases || [])].map(normalize);
  const releaseYear = Number(result.release_date?.slice(0, 4));
  const exactTitle = [result.title, result.original_title].some((title) => targets.includes(normalize(title)));

  return (
    Number(result.original_language === "te") * 80 +
    Number(releaseYear === movie.year) * 120 +
    Number(Math.abs(releaseYear - movie.year) === 1) * 50 +
    Number(exactTitle) * 140 +
    Math.min(result.popularity || 0, 40)
  );
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function posterTitleLines(title: string) {
  const lines: string[] = [];
  for (const word of title.trim().split(/\s+/)) {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > 19) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }

  if (lines.length <= 4) return lines;
  return [...lines.slice(0, 3), `${lines.slice(3).join(" ").slice(0, 17)}…`];
}

function fallbackPoster(movie: Movie) {
  const hash = [...movie.id].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  const hue = hash % 360;
  const accentHue = (hue + 38) % 360;
  const titleLines = posterTitleLines(movie.title);
  const titleStart = 260 - (titleLines.length - 1) * 24;
  const titleMarkup = titleLines
    .map((line, index) => `<text x="171" y="${titleStart + index * 48}" text-anchor="middle">${escapeXml(line)}</text>`)
    .join("");
  const safeTitle = escapeXml(movie.title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 342 513" role="img" aria-label="${safeTitle} poster">
      <defs>
        <radialGradient id="glow" cx="50%" cy="35%" r="75%">
          <stop offset="0" stop-color="hsl(${accentHue} 64% 34%)"/>
          <stop offset="0.58" stop-color="hsl(${hue} 52% 17%)"/>
          <stop offset="1" stop-color="#090706"/>
        </radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f2cf88" stop-opacity=".34"/>
          <stop offset="1" stop-color="#f2cf88" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="342" height="513" fill="url(#glow)"/>
      <path d="M-30 370 L250 -20 L365 -20 L85 370 Z" fill="url(#beam)" opacity=".32"/>
      <circle cx="278" cy="104" r="92" fill="none" stroke="#f2cf88" stroke-opacity=".16" stroke-width="18"/>
      <rect x="18" y="18" width="306" height="477" fill="none" stroke="#e7b457" stroke-opacity=".45"/>
      <g fill="#e7b457" fill-opacity=".62">
        <rect x="8" y="34" width="7" height="13"/><rect x="8" y="64" width="7" height="13"/><rect x="8" y="94" width="7" height="13"/>
        <rect x="327" y="34" width="7" height="13"/><rect x="327" y="64" width="7" height="13"/><rect x="327" y="94" width="7" height="13"/>
      </g>
      <text x="171" y="82" text-anchor="middle" fill="#e7b457" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="4">CHITRAM ARCHIVE</text>
      <g fill="#f8f0e2" font-family="Georgia, serif" font-size="35" font-weight="700">${titleMarkup}</g>
      <path d="M88 402 H254" stroke="#e7b457" stroke-opacity=".55"/>
      <text x="171" y="438" text-anchor="middle" fill="#f1eadc" font-family="Georgia, serif" font-size="32">${movie.year}</text>
      <text x="171" y="466" text-anchor="middle" fill="#c8bda9" font-family="Arial, sans-serif" font-size="9" letter-spacing="3">TELUGU CINEMA</text>
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

  async function search(title: string, includeYear: boolean) {
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", title);
    if (includeYear) url.searchParams.set("primary_release_year", String(movie.year));
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");
    if (apiKey) url.searchParams.set("api_key", apiKey);

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" },
      next: { revalidate: MONTH },
    });

    if (!response.ok) return undefined;
    const data = (await response.json()) as TmdbSearchResponse;
    for (const result of data.results || []) {
      if (result.poster_path) results.set(result.id, result);
    }

    return [...results.values()].sort((a, b) => movieScore(b, movie) - movieScore(a, movie))[0];
  }

  for (const title of titles) {
    const best = await search(title, true);
    if (best && movieScore(best, movie) >= 300) return best;
  }

  for (const title of titles) {
    const best = await search(title, false);
    if (best && movieScore(best, movie) >= 300) return best;
  }

  return [...results.values()].sort((a, b) => movieScore(b, movie) - movieScore(a, movie))[0];
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
    return response;
  } catch {
    return fallbackPoster(movie);
  }
}
