"use client";

import dynamic from "next/dynamic";

/**
 * The booth needs the camera, canvas, and localStorage, so it only renders in
 * the browser.
 */
const Booth = dynamic(() => import("./booth"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-night" />,
});

export function BoothLoader() {
  return <Booth />;
}
