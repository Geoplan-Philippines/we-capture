/**
 * Event branding. Everything that changes from one event to the next lives
 * here: logos, frame backgrounds, the theme line, and colors. For a new event,
 * drop its files in `public/events/<slug>/` and swap this object.
 *
 * The booth UI, the composed photo frame, and the download page all read from
 * this config, so nothing else needs editing.
 */

export type EventLogo = {
  src: string;
  alt: string;
  /** Intrinsic pixel size of the file, used for aspect ratio. */
  width: number;
  height: number;
};

export type EventConfig = {
  slug: string;
  name: string;
  /** Printed on the frame under the logos. */
  theme: string;
  colors: {
    /** Deep background behind the booth and download page. */
    night: string;
    /** Theme text on the frame, primary buttons, links. */
    primary: string;
    /** Viewfinder corners, countdown ring, highlights. */
    accent: string;
    /** Logo panel fill. The logos ship on white, so keep this white unless they change. */
    panel: string;
    /** Hairline between the logos inside the panel. */
    panelRule: string;
    /** Mat around each photo on the frame. */
    mat: string;
  };
  /** Shown left to right on the logo panel. */
  logos: readonly EventLogo[];
  /** Full-bleed frame backgrounds. Tall frames use `portrait`, wide frames use `landscape`. */
  backgrounds: {
    portrait: string;
    landscape: string;
  };
  /** Line under the lead form on the download page. */
  privacyNote: string;
};

export const event: EventConfig = {
  slug: "mia-2026",
  name: "MIA 2026",
  theme: "Transcending Excellence Through Innovation",
  colors: {
    night: "#060E2A",
    primary: "#0D57A6",
    accent: "#F47920",
    panel: "#FFFFFF",
    panelRule: "#D4DCE8",
    mat: "#FFFFFF",
  },
  logos: [
    { src: "/events/mia-2026/geoplan.png", alt: "Geoplan", width: 730, height: 224 },
    { src: "/events/mia-2026/meralco.png", alt: "Meralco", width: 878, height: 727 },
  ],
  backgrounds: {
    portrait: "/events/mia-2026/bg-portrait.jpg",
    landscape: "/events/mia-2026/bg-landscape.jpg",
  },
  privacyNote: "Your name and email go to the Geoplan team at MIA 2026. Your photo downloads right after.",
};
