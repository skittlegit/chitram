import type { Metadata } from "next";
import GameExperience from "../game-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play",
  description: "Play today's Chitram Telugu movie guessing game.",
  alternates: { canonical: "/game" },
};

function indiaDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export default function GamePage() {
  return <GameExperience initialDate={indiaDateKey()} focused />;
}
