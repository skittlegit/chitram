# Chitram

A premium Telugu cinema guessing game built with the Next.js App Router.

## Game features

- Three formats: Classic Cut, Spotlight, and First Day First Show.
- Daily challenge, unlimited practice, and a seven-day archive.
- Play by decade or use All eras for the complete 2000s–2020s catalogue.
- Colour-coded year, lead, director, genre, film-lane, and title-size clues.
- Optional progressive hints with score penalties that skip facts already revealed by exact guesses.
- Local streaks, points, achievements, guess distribution, and best score.
- A device-local film vault for saving revealed movies.
- TMDB-backed poster art in search results, film reveals, and the vault, with a built-in fallback when no poster is available.
- 459 Telugu films from 2000 onward, spanning major-star filmographies, breakout hits, cult favourites, and recognizable high-profile flops.

## Local development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable real poster art, copy `.env.example` to `.env.local` and add a TMDB API Read Access Token. Without a token, the app automatically serves branded Chitram poster placeholders.

## Scripts

- `npm run dev` starts the local Next.js server.
- `npm run build` creates a production build.
- `npm start` serves the production build.
- `npm run lint` checks the source.
- `npm test` runs lint and a production build.

## Deploy on Vercel

Import this repository into Vercel. It detects Next.js automatically, so no framework override or custom build command is required.

Set `TMDB_API_TOKEN` in the Vercel project environment to enable posters. Optionally set `NEXT_PUBLIC_SITE_URL` to the canonical production URL (for example, `https://chitram.example.com`). Production deployments also use Vercel's provided production URL automatically.
