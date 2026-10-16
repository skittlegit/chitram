import type { Metadata } from "next";
import FocusedGame from "../focused-game";
import { indiaDateKey } from "../game-logic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play",
  description: "Play today's Chitram Telugu movie guessing game.",
  alternates: { canonical: "/game" },
};

export default function GamePage() {
  return <FocusedGame initialDate={indiaDateKey()} />;
}
