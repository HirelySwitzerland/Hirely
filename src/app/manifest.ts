import type { MetadataRoute } from "next";

/** Lets HR put Recruit24 on the phone's home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recruit24",
    short_name: "Recruit24",
    description: "Recruiting rund um die Uhr – automatisiert. Bewerbungen, Vorabgespräche und Termine auch unterwegs im Blick.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#F5F6F8",
    theme_color: "#1D2130",
    lang: "de-CH",
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
