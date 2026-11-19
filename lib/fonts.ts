import { Archivo } from "next/font/google";

/**
 * Archivo with its width axis: normal width for interface text, expanded
 * (font-stretch 125%) for display type and the countdown. The frame
 * compositor draws the theme line with the same family.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
