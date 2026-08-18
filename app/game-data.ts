import { CATALOG_ADDITIONS, type CatalogLane } from "./movie-catalog";
import { bespokeStoryClueFor } from "./movie-story-clues";

export type Decade = "2000s" | "2010s" | "2020s";
export type Difficulty = "easy" | "medium" | "hard";
export type FilmFamily = "Mega" | "Nandamuri" | "Akkineni" | "Daggubati" | "Ghattamaneni" | "Uppalapati" | "Manchu" | "Deverakonda" | "Bellamkonda" | "EVV" | "Nara" | "Independent";

export type Movie = {
  id: string;
  title: string;
  year: number;
  hero: string;
  family: string;
  director: string;
  genres: string[];
  banner: string;
  release: string;
  difficulty: "Crowd pleaser" | "Fan favourite" | "Deep cut";
  storyClue: string;
  storyClueSource?: "hand-authored" | "generated";
  lane?: CatalogLane;
  aliases?: string[];
};

export const DECADES: Decade[] = ["2000s", "2010s", "2020s"];

export const DIFFICULTIES: Array<{
  id: Difficulty;
  name: string;
  description: string;
  maxClues: number;
  maxGuesses: number;
  baseScore: number;
  guessPenalty: number;
  cluePenalty: number;
}> = [
  { id: "easy", name: "Easy", description: "Request up to three clues whenever you need them. Eight guesses total.", maxClues: 3, maxGuesses: 8, baseScore: 600, guessPenalty: 50, cluePenalty: 50 },
  { id: "medium", name: "Medium", description: "Request up to two clues whenever you need them. Six guesses total.", maxClues: 2, maxGuesses: 6, baseScore: 900, guessPenalty: 75, cluePenalty: 100 },
  { id: "hard", name: "Hard", description: "No clues. Five guesses, so every comparison matters.", maxClues: 0, maxGuesses: 5, baseScore: 1200, guessPenalty: 100, cluePenalty: 0 },
];

// These are the hand-authored showcase records with bespoke story clues. The
// complete playable catalogue is assembled with CATALOG_ADDITIONS below; use
// MOVIES after module initialization or ALL_MOVIES when reading the full reel.
export const MOVIES: Record<Decade, Movie[]> = {
  "2000s": [
    { id: "nuvvunaku", title: "Nuvvu Naaku Nachav", year: 2001, hero: "Venkatesh", family: "Daggubati", director: "K. Vijaya Bhaskar", genres: ["Romance", "Comedy"], banner: "Sri Sravanthi Movies", release: "Regular", difficulty: "Fan favourite", storyClue: "A wedding house becomes the setting for an impossible romance.", aliases: ["Nuvvu Naku Nachav"] },
    { id: "manmadhudu", title: "Manmadhudu", year: 2002, hero: "Nagarjuna", family: "Akkineni", director: "K. Vijaya Bhaskar", genres: ["Romance", "Comedy"], banner: "Annapurna Studios", release: "Regular", difficulty: "Crowd pleaser", storyClue: "An office romance challenges a man who has sworn off love." },
    { id: "okkadu", title: "Okkadu", year: 2003, hero: "Mahesh Babu", family: "Ghattamaneni", director: "Gunasekhar", genres: ["Action", "Romance"], banner: "Sumanth Art", release: "Sankranti", difficulty: "Crowd pleaser", storyClue: "A kabaddi player becomes a protector on the road from Kurnool." },
    { id: "tagore", title: "Tagore", year: 2003, hero: "Chiranjeevi", family: "Mega", director: "V. V. Vinayak", genres: ["Action", "Drama"], banner: "Leo Projects", release: "Regular", difficulty: "Fan favourite", storyClue: "A professor builds a secret movement against corruption." },
    { id: "simhadri", title: "Simhadri", year: 2003, hero: "Jr NTR", family: "Nandamuri", director: "S. S. Rajamouli", genres: ["Action", "Drama"], banner: "VMC Productions", release: "Regular", difficulty: "Fan favourite", storyClue: "A loyal servant carries a fearsome past across two states.", aliases: ["Simhadri 2003"] },
    { id: "arya", title: "Arya", year: 2004, hero: "Allu Arjun", family: "Mega", director: "Sukumar", genres: ["Romance", "Drama"], banner: "Sri Venkateswara Creations", release: "Summer", difficulty: "Crowd pleaser", storyClue: "An eternal optimist insists that one-sided love can still win." },
    { id: "athadu", title: "Athadu", year: 2005, hero: "Mahesh Babu", family: "Ghattamaneni", director: "Trivikram Srinivas", genres: ["Action", "Thriller"], banner: "Jayabheri Arts", release: "Regular", difficulty: "Fan favourite", storyClue: "A professional killer hides inside a family after a job goes wrong.", aliases: ["Atadu"] },
    { id: "pokiri", title: "Pokiri", year: 2006, hero: "Mahesh Babu", family: "Ghattamaneni", director: "Puri Jagannadh", genres: ["Action", "Crime"], banner: "Vaishno Academy", release: "Summer", difficulty: "Crowd pleaser", storyClue: "A street enforcer's real identity changes the entire operation." },
    { id: "bommarillu", title: "Bommarillu", year: 2006, hero: "Siddharth", family: "Other", director: "Bhaskar", genres: ["Romance", "Family"], banner: "Sri Venkateswara Creations", release: "Regular", difficulty: "Crowd pleaser", storyClue: "A son tries to find his own voice under a loving, controlling father." },
    { id: "happydays", title: "Happy Days", year: 2007, hero: "Varun Sandesh", family: "Other", director: "Sekhar Kammula", genres: ["Coming-of-age", "Drama"], banner: "Amigos Creations", release: "Regular", difficulty: "Fan favourite", storyClue: "Four years on a campus turn strangers into lifelong friends." },
    { id: "jalsa", title: "Jalsa", year: 2008, hero: "Pawan Kalyan", family: "Mega", director: "Trivikram Srinivas", genres: ["Action", "Comedy"], banner: "Geetha Arts", release: "Summer", difficulty: "Deep cut", storyClue: "A sharp-witted man with a radical past falls into a complicated romance." },
    { id: "magadheera", title: "Magadheera", year: 2009, hero: "Ram Charan", family: "Mega", director: "S. S. Rajamouli", genres: ["Fantasy", "Action"], banner: "Geetha Arts", release: "Regular", difficulty: "Crowd pleaser", storyClue: "A love and a betrayal return after four centuries." },
  ],
  "2010s": [
    { id: "dookudu", title: "Dookudu", year: 2011, hero: "Mahesh Babu", family: "Ghattamaneni", director: "Srinu Vaitla", genres: ["Action", "Comedy"], banner: "14 Reels Entertainment", release: "Regular", difficulty: "Crowd pleaser", storyClue: "A police officer stages an elaborate illusion for his recovering father." },
    { id: "eega", title: "Eega", year: 2012, hero: "Nani", family: "Other", director: "S. S. Rajamouli", genres: ["Fantasy", "Action"], banner: "Vaaraahi Chalana Chitram", release: "Regular", difficulty: "Crowd pleaser", storyClue: "Revenge arrives in the smallest, most unexpected form." },
    { id: "gabbarsingh", title: "Gabbar Singh", year: 2012, hero: "Pawan Kalyan", family: "Mega", director: "Harish Shankar", genres: ["Action", "Comedy"], banner: "Parameswara Art Productions", release: "Summer", difficulty: "Fan favourite", storyClue: "A flamboyant police officer runs his station by his own rules." },
    { id: "ad", title: "Attarintiki Daredi", year: 2013, hero: "Pawan Kalyan", family: "Mega", director: "Trivikram Srinivas", genres: ["Comedy", "Drama"], banner: "SVCC", release: "Regular", difficulty: "Crowd pleaser", storyClue: "An heir enters a divided family home under a false identity.", aliases: ["Atharintiki Daredi", "AD"] },
    { id: "drushyam", title: "Drushyam", year: 2014, hero: "Venkatesh", family: "Daggubati", director: "Sripriya", genres: ["Thriller", "Drama"], banner: "Suresh Productions", release: "Regular", difficulty: "Fan favourite", storyClue: "A film-loving father constructs the perfect alibi for his family." },
    { id: "baahubali", title: "Baahubali: The Beginning", year: 2015, hero: "Prabhas", family: "Other", director: "S. S. Rajamouli", genres: ["Epic", "Action"], banner: "Arka Media Works", release: "Regular", difficulty: "Crowd pleaser", storyClue: "A young man climbs a waterfall and discovers a kingdom in conflict.", aliases: ["Bahubali", "Baahubali 1"] },
    { id: "pellichoopulu", title: "Pelli Choopulu", year: 2016, hero: "Vijay Deverakonda", family: "Other", director: "Tharun Bhascker", genres: ["Romance", "Comedy"], banner: "BigBen Cinemas", release: "Regular", difficulty: "Fan favourite", storyClue: "A failed matchmaking meeting becomes an unlikely food-truck partnership.", aliases: ["Pellichoopulu"] },
    { id: "kshanam", title: "Kshanam", year: 2016, hero: "Adivi Sesh", family: "Other", director: "Ravikanth Perepu", genres: ["Thriller", "Mystery"], banner: "PVP Cinema", release: "Regular", difficulty: "Deep cut", storyClue: "A man returns from abroad to search for a child everyone denies existed." },
    { id: "arjunreddy", title: "Arjun Reddy", year: 2017, hero: "Vijay Deverakonda", family: "Other", director: "Sandeep Reddy Vanga", genres: ["Drama", "Romance"], banner: "Bhadrakali Pictures", release: "Regular", difficulty: "Fan favourite", storyClue: "A brilliant surgeon spirals after losing the woman he loves." },
    { id: "rangasthalam", title: "Rangasthalam", year: 2018, hero: "Ram Charan", family: "Mega", director: "Sukumar", genres: ["Period", "Drama"], banner: "Mythri Movie Makers", release: "Summer", difficulty: "Crowd pleaser", storyClue: "A hearing-impaired villager takes on a ruthless local order." },
    { id: "mahanati", title: "Mahanati", year: 2018, hero: "Keerthy Suresh", family: "Other", director: "Nag Ashwin", genres: ["Biography", "Drama"], banner: "Vyjayanthi Movies", release: "Summer", difficulty: "Fan favourite", storyClue: "A journalist traces the dazzling, turbulent life of a screen legend." },
    { id: "jersey", title: "Jersey", year: 2019, hero: "Nani", family: "Other", director: "Gowtam Tinnanuri", genres: ["Sports", "Drama"], banner: "Sithara Entertainments", release: "Summer", difficulty: "Fan favourite", storyClue: "A father returns to cricket long after the world says his innings is over." },
  ],
  "2020s": [
    { id: "avpl", title: "Ala Vaikunthapurramuloo", year: 2020, hero: "Allu Arjun", family: "Mega", director: "Trivikram Srinivas", genres: ["Action", "Comedy"], banner: "Geetha Arts", release: "Sankranti", difficulty: "Crowd pleaser", storyClue: "A hospital swap hides an heir from the family he belongs to.", aliases: ["AVPL", "Ala Vaikuntapuramulo"] },
    { id: "jathiratnalu", title: "Jathi Ratnalu", year: 2021, hero: "Naveen Polishetty", family: "Other", director: "Anudeep K. V.", genres: ["Comedy", "Drama"], banner: "Swapna Cinema", release: "Regular", difficulty: "Crowd pleaser", storyClue: "Three lovable misfits leave their hometown and land in a political mess." },
    { id: "pushpa", title: "Pushpa: The Rise", year: 2021, hero: "Allu Arjun", family: "Mega", director: "Sukumar", genres: ["Action", "Drama"], banner: "Mythri Movie Makers", release: "Regular", difficulty: "Crowd pleaser", storyClue: "A daily-wage worker rises through a red-sanders syndicate.", aliases: ["Pushpa", "Pushpa 1"] },
    { id: "rrr", title: "RRR", year: 2022, hero: "Ram Charan & Jr NTR", family: "Mega + Nandamuri", director: "S. S. Rajamouli", genres: ["Epic", "Action"], banner: "DVV Entertainment", release: "Summer", difficulty: "Crowd pleaser", storyClue: "Two revolutionaries form a friendship built on hidden missions." },
    { id: "sitaramam", title: "Sita Ramam", year: 2022, hero: "Dulquer Salmaan", family: "Other", director: "Hanu Raghavapudi", genres: ["Romance", "Period"], banner: "Vyjayanthi Movies", release: "Regular", difficulty: "Fan favourite", storyClue: "An anonymous letter gives an orphaned soldier a family and a love story.", aliases: ["Seetha Ramam"] },
    { id: "major", title: "Major", year: 2022, hero: "Adivi Sesh", family: "Other", director: "Sashi Kiran Tikka", genres: ["Biography", "Action"], banner: "GMB Entertainment", release: "Summer", difficulty: "Fan favourite", storyClue: "A soldier's journey leads to an extraordinary final stand." },
    { id: "dasara", title: "Dasara", year: 2023, hero: "Nani", family: "Other", director: "Srikanth Odela", genres: ["Action", "Drama"], banner: "SLV Cinemas", release: "Summer", difficulty: "Fan favourite", storyClue: "Friendship and vengeance collide in a coal-covered village." },
    { id: "balagam", title: "Balagam", year: 2023, hero: "Priyadarshi", family: "Other", director: "Venu Yeldandi", genres: ["Family", "Drama"], banner: "Dil Raju Productions", release: "Regular", difficulty: "Deep cut", storyClue: "A death brings a fractured Telangana family back beneath one roof." },
    { id: "hinanna", title: "Hi Nanna", year: 2023, hero: "Nani", family: "Other", director: "Shouryuv", genres: ["Romance", "Drama"], banner: "Vyra Entertainments", release: "Regular", difficulty: "Fan favourite", storyClue: "A father, daughter and stranger reconstruct a missing love story." },
    { id: "kalki", title: "Kalki 2898 AD", year: 2024, hero: "Prabhas", family: "Other", director: "Nag Ashwin", genres: ["Sci-Fi", "Epic"], banner: "Vyjayanthi Movies", release: "Summer", difficulty: "Crowd pleaser", storyClue: "A bounty hunter crosses paths with a prophecy at the end of an age.", aliases: ["Kalki"] },
    { id: "hanuman", title: "Hanu-Man", year: 2024, hero: "Teja Sajja", family: "Other", director: "Prasanth Varma", genres: ["Superhero", "Fantasy"], banner: "Primeshow Entertainment", release: "Sankranti", difficulty: "Fan favourite", storyClue: "A small-time thief discovers an ancient power in his village.", aliases: ["Hanuman"] },
    { id: "luckybaskhar", title: "Lucky Baskhar", year: 2024, hero: "Dulquer Salmaan", family: "Other", director: "Venky Atluri", genres: ["Crime", "Drama"], banner: "Sithara Entertainments", release: "Regular", difficulty: "Deep cut", storyClue: "A bank cashier discovers how quickly money can rewrite morality.", aliases: ["Lucky Bhaskar"] },
  ],
};

const FILM_FAMILY_RULES: Array<{ family: Exclude<FilmFamily, "Independent">; matches: (lead: string) => boolean }> = [
  { family: "Mega", matches: (lead) => ["Chiranjeevi", "Pawan Kalyan", "Allu Arjun", "Allu Sirish", "Ram Charan", "Varun Tej", "Sai Dharam Tej", "Panja Vaisshnav Tej", "Vaisshnav Tej"].includes(lead) },
  { family: "Nandamuri", matches: (lead) => ["Nandamuri Balakrishna", "Jr NTR", "Nandamuri Kalyan Ram", "Nandamuri Taraka Ratna", "Taraka Ratna"].includes(lead) },
  { family: "Akkineni", matches: (lead) => ["Nagarjuna", "Naga Chaitanya", "Akhil Akkineni", "Sumanth", "Sushanth", "Akkineni family"].includes(lead) },
  { family: "Daggubati", matches: (lead) => ["Venkatesh", "Rana Daggubati"].includes(lead) },
  { family: "Ghattamaneni", matches: (lead) => ["Mahesh Babu", "Sudheer Babu", "Ashok Galla"].includes(lead) || lead.includes("Ghattamaneni") },
  { family: "Uppalapati", matches: (lead) => lead === "Prabhas" },
  { family: "Manchu", matches: (lead) => lead === "Mohan Babu" || lead.includes("Manchu") },
  { family: "Deverakonda", matches: (lead) => ["Vijay Deverakonda", "Anand Deverakonda"].includes(lead) },
  { family: "Bellamkonda", matches: (lead) => lead.includes("Bellamkonda") },
  { family: "EVV", matches: (lead) => ["Allari Naresh", "Aryan Rajesh"].includes(lead) },
  { family: "Nara", matches: (lead) => lead === "Nara Rohit" },
];

function familiesForLead(lead: string): FilmFamily[] {
  const billedLeads = lead.split(/\s*&\s*/);
  const families = FILM_FAMILY_RULES
    .filter((rule) => billedLeads.some((billedLead) => rule.matches(billedLead)))
    .map((rule) => rule.family);
  return families.length ? families : ["Independent"];
}

function familyFor(lead: string) {
  return familiesForLead(lead).join(" + ");
}

function slugFor(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function decadeFor(year: number): Decade {
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s";
}

const existingMovies = new Set(Object.values(MOVIES).flat().map((movie) => `${normalizeTitle(movie.title)}-${movie.year}`));

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

for (const [title, year, hero, director, genres, lane] of CATALOG_ADDITIONS) {
  const key = `${normalizeTitle(title)}-${year}`;
  if (existingMovies.has(key)) continue;
  const bespokeStoryClue = bespokeStoryClueFor(title, year);
  MOVIES[decadeFor(year)].push({
    id: `${slugFor(title)}-${year}`,
    title,
    year,
    hero,
    family: familyFor(hero),
    director,
    genres: genres.split("/"),
    banner: lane,
    release: "Regular",
    difficulty: lane === "Star vehicle" ? "Crowd pleaser" : lane === "Breakout hit" ? "Fan favourite" : "Deep cut",
    storyClue: bespokeStoryClue ?? `A ${genres.toLowerCase().replace("/", " and ")} film in the ${lane.toLowerCase()} lane.`,
    storyClueSource: bespokeStoryClue ? "hand-authored" : "generated",
    lane,
  });
  existingMovies.add(key);
}

for (const decade of DECADES) MOVIES[decade].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));

export function movieLane(movie: Movie): CatalogLane {
  if (movie.lane) return movie.lane;
  if (movie.difficulty === "Crowd pleaser") return "Star vehicle";
  if (movie.difficulty === "Fan favourite") return "Breakout hit";
  return "Cult favourite";
}

export function movieTitleWords(movie: Movie) {
  return movie.title.trim().split(/\s+/).length;
}

export function movieLeads(movie: Movie) {
  return movie.hero.split(/\s*&\s*/).map((lead) => lead.trim());
}

export function movieFamilies(movie: Movie) {
  return familiesForLead(movie.hero);
}

export function movieFamilyLabel(movie: Movie) {
  const families = movieFamilies(movie);
  return families[0] === "Independent" ? "Independent" : `${families.join(" + ")} family`;
}

export const ALL_MOVIES = Object.values(MOVIES).flat();

export const CATALOG_STATS = {
  total: ALL_MOVIES.length,
  byLane: {
    "Star vehicle": ALL_MOVIES.filter((movie) => movieLane(movie) === "Star vehicle").length,
    "Breakout hit": ALL_MOVIES.filter((movie) => movieLane(movie) === "Breakout hit").length,
    "Cult favourite": ALL_MOVIES.filter((movie) => movieLane(movie) === "Cult favourite").length,
  },
  releases2026: ALL_MOVIES.filter((movie) => movie.year === 2026).length,
  bespokeStoryClues: ALL_MOVIES.filter((movie) => movie.storyClueSource !== "generated").length,
} as const;

if (
  CATALOG_STATS.total < 730 ||
  CATALOG_STATS.byLane["Breakout hit"] < 185 ||
  CATALOG_STATS.byLane["Cult favourite"] < 50 ||
  CATALOG_STATS.releases2026 < 30 ||
  CATALOG_STATS.bespokeStoryClues < 550
) {
  throw new Error(`Movie catalogue coverage regressed: ${JSON.stringify(CATALOG_STATS)}`);
}

const revealingStoryClues = ALL_MOVIES.filter(
  (movie) =>
    movie.storyClueSource !== "generated" &&
    normalizeTitle(movie.title).length >= 5 &&
    normalizeTitle(movie.storyClue).includes(normalizeTitle(movie.title)),
);

if (revealingStoryClues.length) {
  throw new Error(`Story clues reveal their titles: ${revealingStoryClues.map((movie) => movie.title).join(", ")}`);
}

// Keep the catalogue honest: these floors represent the established leads whose
// starring filmographies the game promises to cover. A future accidental trim or
// malformed billing fails loudly during development/build instead of reaching users.
export const MAINSTREAM_ACTOR_MINIMUMS = {
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
} as const;

function hasBilledActor(movie: Movie, actor: string) {
  return movie.hero.split(/\s*&\s*/).includes(actor);
}

export const MAINSTREAM_ACTOR_COVERAGE = Object.fromEntries(
  Object.keys(MAINSTREAM_ACTOR_MINIMUMS).map((actor) => [
    actor,
    ALL_MOVIES.filter((movie) => hasBilledActor(movie, actor)).length,
  ]),
) as Record<keyof typeof MAINSTREAM_ACTOR_MINIMUMS, number>;

const coverageDeficits = Object.entries(MAINSTREAM_ACTOR_MINIMUMS)
  .filter(([actor, minimum]) => MAINSTREAM_ACTOR_COVERAGE[actor as keyof typeof MAINSTREAM_ACTOR_MINIMUMS] < minimum)
  .map(([actor, minimum]) => `${actor} (${MAINSTREAM_ACTOR_COVERAGE[actor as keyof typeof MAINSTREAM_ACTOR_MINIMUMS]}/${minimum})`);

if (coverageDeficits.length) {
  throw new Error(`Mainstream actor catalogue coverage regressed: ${coverageDeficits.join(", ")}`);
}

export function difficultyConfig(difficulty: Difficulty) {
  return DIFFICULTIES.find((item) => item.id === difficulty) ?? DIFFICULTIES[1];
}
