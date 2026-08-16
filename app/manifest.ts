import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chitram — Telugu Movie Guessing Game",
    short_name: "Chitram",
    description: "A daily Telugu cinema guessing game with optional clues and three difficulty levels.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3e6c8",
    theme_color: "#b73527",
    orientation: "any",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
