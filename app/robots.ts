import type { MetadataRoute } from "next";

/** Booth and photo pages are private to visitors who scan a QR code. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
