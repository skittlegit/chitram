import { NextRequest, NextResponse } from "next/server";
import { GAME_RULES } from "../../game-data";
import { dailyAnswer } from "../../daily-answer";
import { ARCHIVE_DAYS, cluesFor, evaluateBoard, indiaDateKey, isEra, MOVIE_BY_ID, puzzleNumber, shiftDate } from "../../game-logic";

// Scores a daily or archive board on the server so the answer never ships to
// the browser. Stateless: the client sends its whole board and gets back what
// it may see (cells, revealed clues, and the answer only once the game is over).

const NO_STORE = { "Cache-Control": "no-store" };

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

function isStringArray(value: unknown, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maxLength && value.every((item) => typeof item === "string") && new Set(value).size === value.length;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  const { date, offset, era, guessIds, clueLabels } = body;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return badRequest("Invalid date.");
  if (!Number.isInteger(offset) || (offset as number) < 0 || (offset as number) > ARCHIVE_DAYS) return badRequest("Invalid archive offset.");
  if (!isEra(era)) return badRequest("Invalid era.");
  if (!isStringArray(guessIds, GAME_RULES.maxGuesses) || !guessIds.every((id) => MOVIE_BY_ID.has(id))) return badRequest("Invalid guesses.");
  if (!isStringArray(clueLabels, GAME_RULES.maxClues)) return badRequest("Invalid clues.");

  // A board may lag a day behind (a game started before midnight), but never
  // ask for a puzzle that has not been released yet or one beyond the archive.
  const today = indiaDateKey();
  const puzzleDate = shiftDate(date, -(offset as number));
  if (puzzleDate > today) return badRequest("That puzzle is not out yet.", 404);
  if (puzzleDate < shiftDate(today, -(ARCHIVE_DAYS + 1))) return badRequest("That puzzle has left the archive.", 404);

  const answer = dailyAnswer(era, puzzleNumber(puzzleDate));
  const validLabels = cluesFor(answer).map((clue) => clue.label);
  if (!clueLabels.every((label) => validLabels.includes(label))) return badRequest("Invalid clues.");

  return NextResponse.json(evaluateBoard(answer, { guessIds, clueLabels }), { headers: NO_STORE });
}
