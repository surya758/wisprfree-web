import type { Metadata } from "next";
import { HistoryList } from "@/components/HistoryList";

export const metadata: Metadata = {
  title: "History",
  description:
    "Every dictation from this browser, stored locally — nothing is sent anywhere.",
};

export default function HistoryPage() {
  return <HistoryList />;
}
