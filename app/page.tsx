import GameExperience from "./game-client";

export const dynamic = "force-dynamic";

function indiaDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export default function Home() {
  return <GameExperience initialDate={indiaDateKey()} />;
}
