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
  const target = normalize(movie.title);
  const releaseYear = Number(result.release_date?.slice(0, 4));
  const exactTitle = [result.title, result.original_title].some((title) => normalize(title) === target);

  return (
    Number(result.original_language === "te") * 100 +
    Number(releaseYear === movie.year) * 80 +
    Number(exactTitle) * 60 +
    Math.min(result.popularity || 0, 40)
  );
}

function fallbackPoster(movie: Movie) {
  const initial = movie.title.trim().charAt(0).toUpperCase().replace(/[<&>"']/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 342 513" role="img" aria-label="${movie.title.replace(/[<&>"']/g, "")} poster placeholder">
      <defs>
        <radialGradient id="glow" cx="50%" cy="35%" r="75%">
          <stop offset="0" stop-color="#6d3420"/>
          <stop offset="0.58" stop-color="#24130d"/>
          <stop offset="1" stop-color="#090706"/>
        </radialGradient>
      </defs>
      <rect width="342" height="513" fill="url(#glow)"/>
      <rect x="18" y="18" width="306" height="477" fill="none" stroke="#e7b457" stroke-opacity=".45"/>
      <g fill="#e7b457" fill-opacity=".62">
        <rect x="8" y="34" width="7" height="13"/><rect x="8" y="64" width="7" height="13"/><rect x="8" y="94" width="7" height="13"/>
        <rect x="327" y="34" width="7" height="13"/><rect x="327" y="64" width="7" height="13"/><rect x="327" y="94" width="7" height="13"/>
      </g>
      <text x="171" y="82" text-anchor="middle" fill="#e7b457" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="4">CHITRAM ARCHIVE</text>
      <circle cx="171" cy="238" r="82" fill="none" stroke="#e7b457" stroke-opacity=".2"/>
      <circle cx="171" cy="238" r="62" fill="#e7b457" fill-opacity=".08" stroke="#e7b457" stroke-opacity=".38"/>
      <text x="171" y="272" text-anchor="middle" fill="#f1eadc" font-family="Georgia, serif" font-size="104">${initial}</text>
      <text x="171" y="438" text-anchor="middle" fill="#f1eadc" font-family="Georgia, serif" font-size="32">${movie.year}</text>
      <text x="171" y="466" text-anchor="middle" fill="#9f978b" font-family="Arial, sans-serif" font-size="9" letter-spacing="3">TELUGU CINEMA</text>
    </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Poster-Source": "fallback",
    },
  });
}

async function searchTmdb(movie: Movie, token: string | undefined, apiKey: string | undefined) {
  const titles = [movie.title, ...(movie.aliases || [])].slice(0, 3);
  const results = new Map<number, TmdbMovie>();

  for (const title of titles) {
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", title);
    url.searchParams.set("primary_release_year", String(movie.year));
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");
    if (apiKey) url.searchParams.set("api_key", apiKey);

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" },
      next: { revalidate: MONTH },
    });

    if (!response.ok) continue;
    const data = (await response.json()) as TmdbSearchResponse;
    for (const result of data.results || []) {
      if (result.poster_path) results.set(result.id, result);
    }
    if (results.size) break;
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
