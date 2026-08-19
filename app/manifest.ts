import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chitram — Telugu Movie Guessing Game",
    short_name: "Chitram",
    description: "A daily Telugu cinema guessing game where every guess and optional clue affects your score.",
    start_url: "/",
    display: "standalone",
    background_color: "#12100f",
    theme_color: "#12100f",
    orientation: "any",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
