import type { NormalizedProfileInput } from "@/lib/profile";
export type TarotCard = { name: string; number: number; orientation: "正位" | "逆位"; keyword: string; meaning: string };
export type TarotReading = { format: "qmdj-tarot-reading-v1"; input: { datetime: string; timeZone: string }; spread: string; cards: TarotCard[]; disclaimer: string };
export type TarotReadingInput = NormalizedProfileInput;
