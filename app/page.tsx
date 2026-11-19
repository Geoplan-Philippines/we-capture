import type { Metadata } from "next";
import { BoothLoader } from "@/components/booth/booth-loader";

export const metadata: Metadata = {
  title: "Booth",
};

export default function BoothPage() {
  return <BoothLoader />;
}
