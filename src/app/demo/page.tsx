import type { Metadata } from "next";
import { Demo } from "@/components/Demo";

export const metadata: Metadata = {
  title: "Try it",
  description:
    "Record or upload audio and watch WisprFree's two-stage pipeline turn it into clean, polished text.",
};

export default function DemoPage() {
  return <Demo />;
}
