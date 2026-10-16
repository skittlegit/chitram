import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { parseSharedResult, shareOutcome, shareTitle } from "../../share";

// Link-preview image for a shared result: the player's coloured grid on the
// Chitram poster palette. Built only from the share link, never the answer.

const COLORS = { match: "#3f8a67", close: "#efb52d", miss: "#5d5650" } as const;
const CACHE = "public, max-age=86400, s-maxage=31536000, immutable";

export async function GET(request: NextRequest) {
  const result = parseSharedResult(Object.fromEntries(request.nextUrl.searchParams));
  if (!result) return new Response("Invalid share link", { status: 400 });

  const cell = result.rows.length > 6 ? 46 : 56;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 90px", background: "#12100f", color: "#f4ead7", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 520 }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 900, color: "#b73527", letterSpacing: -3 }}>CHITRAM</div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 40, fontWeight: 800 }}>{shareTitle(result)}</div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 32, color: result.won ? "#efb52d" : "#bcae9d" }}>{shareOutcome(result)}</div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 26, color: "#bcae9d" }}>Can you name today&apos;s Telugu film?</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {result.rows.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex", gap: 10 }}>
              {row.map((value, cellIndex) => (
                <div key={cellIndex} style={{ width: cell, height: cell, borderRadius: 8, background: COLORS[value] }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": CACHE } },
  );
}
