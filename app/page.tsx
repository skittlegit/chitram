"use client";

import { FormEvent, KeyboardEvent, useMemo, useState, useSyncExternalStore } from "react";

type Decade = "2000s" | "2010s" | "2020s";
type Mode = "daily" | "practice";
type Result = "match" | "close" | "miss";
type Stats = { played: number; wins: number; streak: number };

type Movie = {
  id: string;
  title: string;
  year: number;
  hero: string;
  family: string;
  director: string;
  genres: string[];
  banner: string;
  release: string;
  aliases?: string[];
};

const MOVIES: Record<Decade, Movie[]> = {
  "2000s": [
    { id: "manmadhudu", title: "Manmadhudu", year: 2002, hero: "Nagarjuna", family: "Akkineni", director: "K. Vijaya Bhaskar", genres: ["Romance", "Comedy"], banner: "Annapurna Studios", release: "Regular" },
    { id: "okkadu", title: "Okkadu", year: 2003, hero: "Mahesh Babu", family: "Ghattamaneni", director: "Gunasekhar", genres: ["Action", "Romance"], banner: "Sumanth Art", release: "Sankranti" },
    { id: "simhadri", title: "Simhadri", year: 2003, hero: "Jr NTR", family: "Nandamuri", director: "S. S. Rajamouli", genres: ["Action", "Drama"], banner: "VMC Productions", release: "Regular", aliases: ["Simhadri 2003"] },
    { id: "arya", title: "Arya", year: 2004, hero: "Allu Arjun", family: "Mega", director: "Sukumar", genres: ["Romance", "Drama"], banner: "Sri Venkateswara Creations", release: "Summer" },
    { id: "athadu", title: "Athadu", year: 2005, hero: "Mahesh Babu", family: "Ghattamaneni", director: "Trivikram Srinivas", genres: ["Action", "Thriller"], banner: "Jayabheri Arts", release: "Regular", aliases: ["Atadu"] },
    { id: "pokiri", title: "Pokiri", year: 2006, hero: "Mahesh Babu", family: "Ghattamaneni", director: "Puri Jagannadh", genres: ["Action", "Crime"], banner: "Vaishno Academy", release: "Summer" },
    { id: "bommarillu", title: "Bommarillu", year: 2006, hero: "Siddharth", family: "Other", director: "Bhaskar", genres: ["Romance", "Family"], banner: "Sri Venkateswara Creations", release: "Regular" },
    { id: "magadheera", title: "Magadheera", year: 2009, hero: "Ram Charan", family: "Mega", director: "S. S. Rajamouli", genres: ["Fantasy", "Action"], banner: "Geetha Arts", release: "Regular" },
  ],
  "2010s": [
    { id: "eega", title: "Eega", year: 2012, hero: "Nani", family: "Other", director: "S. S. Rajamouli", genres: ["Fantasy", "Action"], banner: "Vaaraahi Chalana Chitram", release: "Regular" },
    { id: "ad", title: "Attarintiki Daredi", year: 2013, hero: "Pawan Kalyan", family: "Mega", director: "Trivikram Srinivas", genres: ["Comedy", "Drama"], banner: "SVCC", release: "Regular", aliases: ["Atharintiki Daredi", "AD"] },
    { id: "baahubali", title: "Baahubali: The Beginning", year: 2015, hero: "Prabhas", family: "Other", director: "S. S. Rajamouli", genres: ["Epic", "Action"], banner: "Arka Media Works", release: "Regular", aliases: ["Bahubali", "Baahubali 1"] },
    { id: "pellichoopulu", title: "Pelli Choopulu", year: 2016, hero: "Vijay Deverakonda", family: "Other", director: "Tharun Bhascker", genres: ["Romance", "Comedy"], banner: "BigBen Cinemas", release: "Regular", aliases: ["Pellichoopulu"] },
    { id: "arjunreddy", title: "Arjun Reddy", year: 2017, hero: "Vijay Deverakonda", family: "Other", director: "Sandeep Reddy Vanga", genres: ["Drama", "Romance"], banner: "Bhadrakali Pictures", release: "Regular" },
    { id: "rangasthalam", title: "Rangasthalam", year: 2018, hero: "Ram Charan", family: "Mega", director: "Sukumar", genres: ["Period", "Drama"], banner: "Mythri Movie Makers", release: "Summer" },
    { id: "mahanati", title: "Mahanati", year: 2018, hero: "Keerthy Suresh", family: "Other", director: "Nag Ashwin", genres: ["Biography", "Drama"], banner: "Vyjayanthi Movies", release: "Summer" },
    { id: "jersey", title: "Jersey", year: 2019, hero: "Nani", family: "Other", director: "Gowtam Tinnanuri", genres: ["Sports", "Drama"], banner: "Sithara Entertainments", release: "Summer" },
  ],
  "2020s": [
    { id: "avpl", title: "Ala Vaikunthapurramuloo", year: 2020, hero: "Allu Arjun", family: "Mega", director: "Trivikram Srinivas", genres: ["Action", "Comedy"], banner: "Geetha Arts", release: "Sankranti", aliases: ["AVPL", "Ala Vaikuntapuramulo"] },
    { id: "pushpa", title: "Pushpa: The Rise", year: 2021, hero: "Allu Arjun", family: "Mega", director: "Sukumar", genres: ["Action", "Drama"], banner: "Mythri Movie Makers", release: "Regular", aliases: ["Pushpa", "Pushpa 1"] },
    { id: "rrr", title: "RRR", year: 2022, hero: "Ram Charan & Jr NTR", family: "Mega + Nandamuri", director: "S. S. Rajamouli", genres: ["Epic", "Action"], banner: "DVV Entertainment", release: "Summer" },
    { id: "sitaramam", title: "Sita Ramam", year: 2022, hero: "Dulquer Salmaan", family: "Other", director: "Hanu Raghavapudi", genres: ["Romance", "Period"], banner: "Vyjayanthi Movies", release: "Regular", aliases: ["Seetha Ramam"] },
    { id: "dasara", title: "Dasara", year: 2023, hero: "Nani", family: "Other", director: "Srikanth Odela", genres: ["Action", "Drama"], banner: "SLV Cinemas", release: "Summer" },
    { id: "hinanna", title: "Hi Nanna", year: 2023, hero: "Nani", family: "Other", director: "Shouryuv", genres: ["Romance", "Drama"], banner: "Vyra Entertainments", release: "Regular" },
    { id: "kalki", title: "Kalki 2898 AD", year: 2024, hero: "Prabhas", family: "Other", director: "Nag Ashwin", genres: ["Sci-Fi", "Epic"], banner: "Vyjayanthi Movies", release: "Summer", aliases: ["Kalki"] },
    { id: "luckybaskhar", title: "Lucky Baskhar", year: 2024, hero: "Dulquer Salmaan", family: "Other", director: "Venky Atluri", genres: ["Crime", "Drama"], banner: "Sithara Entertainments", release: "Regular", aliases: ["Lucky Bhaskar"] },
  ],
};

const DECADES: Decade[] = ["2000s", "2010s", "2020s"];
const MAX_GUESSES = 6;
const EMPTY_STATS: Stats = { played: 0, wins: 0, streak: 0 };
const STATS_KEY = "chitram-stats";
const STATS_EVENT = "chitram-stats-change";

let cachedStatsJson: string | null = null;
let cachedStats: Stats = EMPTY_STATS;

function subscribeToStats(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STATS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STATS_EVENT, callback);
  };
}

function getStatsSnapshot(): Stats {
  const statsJson = localStorage.getItem(STATS_KEY);
  if (statsJson === cachedStatsJson) return cachedStats;

  cachedStatsJson = statsJson;
  try {
    cachedStats = statsJson ? JSON.parse(statsJson) : EMPTY_STATS;
  } catch {
    cachedStats = EMPTY_STATS;
  }

  return cachedStats;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/aa/g, "a").replace(/ee/g, "i").replace(/oo/g, "u").replace(/th/g, "t").replace(/sh/g, "s");
}

function dateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function puzzleNumber() {
  return Math.floor((new Date(`${dateKey()}T00:00:00+05:30`).getTime() - new Date("2026-01-01T00:00:00+05:30").getTime()) / 86400000) + 1;
}

function dailyMovie(decade: Decade) {
  const seed = puzzleNumber() + DECADES.indexOf(decade) * 17;
  return MOVIES[decade][Math.abs(seed) % MOVIES[decade].length];
}

function getResult(field: string, guess: Movie, answer: Movie): Result {
  if (guess.id === answer.id) return "match";
  if (field === "year") return guess.year === answer.year ? "match" : Math.abs(guess.year - answer.year) <= 2 ? "close" : "miss";
  if (field === "hero") return guess.hero === answer.hero ? "match" : guess.family !== "Other" && (answer.family.includes(guess.family) || guess.family.includes(answer.family)) ? "close" : "miss";
  if (field === "director") return guess.director === answer.director ? "match" : "miss";
  if (field === "genres") return guess.genres.join() === answer.genres.join() ? "match" : guess.genres.some((genre) => answer.genres.includes(genre)) ? "close" : "miss";
  if (field === "banner") return guess.banner === answer.banner ? "match" : "miss";
  return guess.release === answer.release ? "match" : "miss";
}

function resultEmoji(guess: Movie, answer: Movie) {
  return ["year", "hero", "director", "genres", "banner", "release"].map((field) => ({ match: "🟩", close: "🟨", miss: "⬛" })[getResult(field, guess, answer)]).join("");
}

export default function Home() {
  const [decade, setDecade] = useState<Decade>("2010s");
  const [mode, setMode] = useState<Mode>("daily");
  const [practiceIndex, setPracticeIndex] = useState(3);
  const [query, setQuery] = useState("");
  const [guesses, setGuesses] = useState<Movie[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [highlight, setHighlight] = useState(0);
  const [modal, setModal] = useState<"help" | "stats" | null>(null);
  const [toast, setToast] = useState("");
  const stats = useSyncExternalStore(subscribeToStats, getStatsSnapshot, () => EMPTY_STATS);

  const pool = MOVIES[decade];
  const answer = mode === "daily" ? dailyMovie(decade) : pool[practiceIndex % pool.length];
  const normalizedQuery = normalize(query);
  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return pool
      .filter((movie) => !guesses.some((guess) => guess.id === movie.id))
      .filter((movie) => [movie.title, ...(movie.aliases || [])].some((name) => normalize(name).includes(normalizedQuery)))
      .sort((a, b) => Number(normalize(b.title).startsWith(normalizedQuery)) - Number(normalize(a.title).startsWith(normalizedQuery)))
      .slice(0, 5);
  }, [pool, guesses, normalizedQuery]);

  function reset(nextDecade = decade, nextMode = mode) {
    setDecade(nextDecade);
    setMode(nextMode);
    setQuery("");
    setGuesses([]);
    setStatus("playing");
    setHighlight(0);
    setToast("");
    if (nextMode === "practice") setPracticeIndex(Math.floor(Math.random() * MOVIES[nextDecade].length));
  }

  function saveStats(won: boolean) {
    const next = { played: stats.played + 1, wins: stats.wins + Number(won), streak: won ? stats.streak + 1 : 0 };
    localStorage.setItem(STATS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(STATS_EVENT));
  }

  function submit(event?: FormEvent, picked?: Movie) {
    event?.preventDefault();
    if (status !== "playing") return;
    const exact = pool.find((movie) => [movie.title, ...(movie.aliases || [])].some((name) => normalize(name) === normalizedQuery));
    const movie = picked || exact || suggestions[highlight] || suggestions[0];
    if (!movie) { setToast("Pick a film from the suggestions, boss."); return; }
    const nextGuesses = [...guesses, movie];
    setGuesses(nextGuesses);
    setQuery("");
    setHighlight(0);
    setToast("");
    if (movie.id === answer.id) { setStatus("won"); saveStats(true); }
    else if (nextGuesses.length >= MAX_GUESSES) { setStatus("lost"); saveStats(false); }
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setHighlight((value) => Math.min(value + 1, suggestions.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setHighlight((value) => Math.max(value - 1, 0)); }
    if (event.key === "Escape") { setQuery(""); setHighlight(0); }
  }

  async function share() {
    const text = `Chitram #${puzzleNumber()} · ${decade}\n${guesses.map((guess) => resultEmoji(guess, answer)).join("\n")}\n${status === "won" ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`} · chitram.game`;
    try { await navigator.clipboard.writeText(text); setToast("Result copied — share the mass!"); }
    catch { setToast("Could not copy. Try again."); }
  }

  return (
    <main className={`app era-${decade}`}>
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <button className="brand" onClick={() => reset()} aria-label="Restart Chitram">
          <span className="brand-mark">చి</span><span>CHITRAM</span>
        </button>
        <div className="mode-toggle" aria-label="Game mode">
          <button className={mode === "daily" ? "active" : ""} onClick={() => reset(decade, "daily")}>DAILY</button>
          <button className={mode === "practice" ? "active" : ""} onClick={() => reset(decade, "practice")}>PRACTICE</button>
        </div>
        <nav className="header-actions" aria-label="Game controls">
          <button className="icon-button" onClick={() => setModal("help")} aria-label="How to play">?</button>
          <button className="icon-button" onClick={() => setModal("stats")} aria-label="Statistics">▥</button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span /> {mode === "daily" ? "DAILY TELUGU CINEMA RIDDLE" : "UNLIMITED PRACTICE MODE"} <span /></div>
        <h1>Guess the <em>చిత్రం.</em></h1>
        <p>Every guess reveals a clue. How well do you know Tollywood?</p>
        <div className="stats-strip" aria-label="Current game stats">
          <div><strong>{String(stats.streak).padStart(2, "0")}</strong><span>DAY STREAK</span></div><i />
          <div><strong>{MAX_GUESSES - guesses.length}</strong><span>GUESSES LEFT</span></div><i />
          <div><strong>#{puzzleNumber()}</strong><span>{mode === "daily" ? "TODAY'S FILM" : "PRACTICE"}</span></div>
        </div>
      </section>

      <section className="game-card" aria-label="Telugu movie guessing game">
        <div className="mode-row">
          <div>
            <span className="section-label">CHOOSE YOUR ERA</span>
            <div className="decade-tabs">
              {DECADES.map((item) => <button key={item} className={decade === item ? "active" : ""} onClick={() => reset(item, mode)}>{item}</button>)}
            </div>
          </div>
          <div className="difficulty"><span>FILM POOL</span><b>●●●○○</b><small>FAN FAVOURITES</small></div>
        </div>

        {status === "playing" ? (
          <form className="search-area" onSubmit={(event) => submit(event)}>
            <div className="search-wrap">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => { setQuery(event.target.value); setHighlight(0); setToast(""); }} onKeyDown={onSearchKeyDown} aria-label="Search for a Telugu film" aria-autocomplete="list" aria-controls="film-suggestions" autoComplete="off" placeholder="Type a Telugu film name..." />
              <button type="submit">GUESS <span>→</span></button>
            </div>
            {suggestions.length > 0 && (
              <div className="suggestions" id="film-suggestions" role="listbox">
                {suggestions.map((movie, index) => <button type="button" role="option" aria-selected={index === highlight} className={index === highlight ? "highlight" : ""} key={movie.id} onMouseDown={() => submit(undefined, movie)}><span>{movie.title}</span><small>{movie.year} · {movie.hero}</small></button>)}
              </div>
            )}
            {toast && <div className="toast" role="status">{toast}</div>}
          </form>
        ) : (
          <div className={`result-banner ${status}`}>
            <div><span>{status === "won" ? "BOMMA BLOCKBUSTER!" : "CUT! THAT'S SIX."}</span><strong>{answer.title}</strong><small>{answer.year} · {answer.hero} · {answer.director}</small></div>
            <div className="result-actions"><button onClick={share}>SHARE RESULT</button>{mode === "practice" && <button className="secondary" onClick={() => reset(decade, "practice")}>NEXT FILM</button>}</div>
            {toast && <div className="toast inline" role="status">{toast}</div>}
          </div>
        )}

        <div className="grid-wrap">
          <div className="grid-head">{["YEAR", "HERO", "DIRECTOR", "GENRE", "BANNER", "RELEASE"].map((column) => <span key={column}>{column}</span>)}</div>
          {guesses.length === 0 ? (
            <div className="empty-board"><div className="projector">◉</div><strong>Your clues will appear here</strong><span>Start with any film. We&apos;ll point you closer.</span></div>
          ) : (
            <div className="guess-list">
              {guesses.map((guess, row) => {
                const cells = [
                  { field: "year", value: String(guess.year), sub: guess.year < answer.year ? "↑ LATER" : guess.year > answer.year ? "↓ EARLIER" : "EXACT" },
                  { field: "hero", value: guess.hero, sub: getResult("hero", guess, answer) === "close" ? "SAME FILM FAMILY" : "LEAD" },
                  { field: "director", value: guess.director, sub: "DIRECTOR" },
                  { field: "genres", value: guess.genres.join(" / "), sub: getResult("genres", guess, answer) === "close" ? "1 GENRE MATCH" : "GENRE" },
                  { field: "banner", value: guess.banner, sub: "PRODUCTION" },
                  { field: "release", value: guess.release, sub: "RELEASE SLOT" },
                ];
                return <div className="guess-row" key={guess.id}><div className="guess-title"><span>GUESS {row + 1}</span><strong>{guess.title}</strong></div><div className="cells">{cells.map((cell, index) => <div className={`cell ${getResult(cell.field, guess, answer)}`} style={{ animationDelay: `${index * 90}ms` }} key={cell.field}><strong>{cell.value}</strong><small>{cell.sub}</small></div>)}</div></div>;
              })}
            </div>
          )}
        </div>
      </section>

      <footer><span>GREEN = MATCH</span><span>AMBER = CLOSE</span><span>GRAY = NO MATCH</span></footer>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Close">×</button>{modal === "help" ? <><span className="modal-kicker">HOW TO PLAY</span><h2 id="modal-title">Find the mystery film.</h2><p>You get six guesses. Each row compares your film with the answer.</p><ul><li><i className="dot green" /> Green is an exact match.</li><li><i className="dot amber" /> Amber means close: a nearby year, shared genre, or star family.</li><li><i className="dot gray" /> Gray means try another direction.</li></ul><p className="tip">Year arrows tell you whether the answer released earlier or later.</p></> : <><span className="modal-kicker">YOUR RECORD</span><h2 id="modal-title">Tollywood credentials.</h2><div className="big-stats"><div><strong>{stats.played}</strong><span>PLAYED</span></div><div><strong>{stats.played ? Math.round(stats.wins / stats.played * 100) : 0}%</strong><span>WIN RATE</span></div><div><strong>{stats.streak}</strong><span>STREAK</span></div></div><p className="tip">Your record is saved on this device.</p></>}</section></div>}
    </main>
  );
}
