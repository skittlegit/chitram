import { CATALOG_ADDITIONS, type CatalogLane } from "./movie-catalog";

export type Decade = "2000s" | "2010s" | "2020s";
export type GameType = "classic" | "spotlight" | "rush";

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
  lane?: CatalogLane;
  aliases?: string[];
};

export const DECADES: Decade[] = ["2000s", "2010s", "2020s"];

export const GAME_TYPES: Array<{
  id: GameType;
  name: string;
  kicker: string;
  description: string;
  maxGuesses: number;
}> = [
  { id: "classic", name: "Classic Cut", kicker: "Compare every clue", description: "Six guesses. Every film reveals six colour-coded connections.", maxGuesses: 6 },
  { id: "spotlight", name: "Spotlight", kicker: "Clues enter the frame", description: "A new story clue rolls after every miss. Solve it in five.", maxGuesses: 5 },
  { id: "rush", name: "First Day First Show", kicker: "High stakes", description: "Two clues, three guesses and a bigger score. No interval.", maxGuesses: 3 },
];

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

function familyFor(lead: string) {
  if (["Chiranjeevi", "Pawan Kalyan", "Allu Arjun", "Ram Charan", "Varun Tej", "Sai Dharam Tej", "Vaisshnav Tej"].some((name) => lead.includes(name))) return "Mega";
  if (["Nandamuri Balakrishna", "Jr NTR", "Nandamuri Kalyan Ram"].some((name) => lead.includes(name))) return "Nandamuri";
  if (["Nagarjuna", "Naga Chaitanya", "Akhil Akkineni", "Akkineni family"].some((name) => lead.includes(name))) return "Akkineni";
  if (["Venkatesh", "Rana Daggubati"].some((name) => lead.includes(name))) return "Daggubati";
  if (lead.includes("Mahesh Babu")) return "Ghattamaneni";
  return "Other";
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
    storyClue: `A ${genres.toLowerCase().replace("/", " and ")} film in the ${lane.toLowerCase()} lane.`,
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

export const ALL_MOVIES = Object.values(MOVIES).flat();

export function gameConfig(gameType: GameType) {
  return GAME_TYPES.find((game) => game.id === gameType) ?? GAME_TYPES[0];
}
