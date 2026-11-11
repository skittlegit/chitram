import type { Metadata } from "next";
import FocusedGame from "../focused-game";
import { indiaDateKey, parseGameSelection } from "../game-logic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play",
  description: "Play today's Chitram Telugu movie guessing game.",
  alternates: { canonical: "/game" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// The query string picks the game: ?mode=practice, ?day=2026-11-07 for an
// archive puzzle, and ?era=2010s. With none of them it is today's daily game.
export default async function GamePage({ searchParams }: Props) {
  const today = indiaDateKey();
  return <FocusedGame initialDate={today} initialGame={parseGameSelection(await searchParams, today)} />;
}
