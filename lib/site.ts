export const site = {
  name: "We-Capture",
  url: process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "") || "http://localhost:3000",
  description: "Geoplan's event photo booth. Take a photo at the booth, then scan the QR code to keep it.",
} as const;

export type Site = typeof site;
