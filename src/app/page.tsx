import { redirect } from "next/navigation";

export default function Home() {
  // qmdj is the standalone 知几 chart product. The product contract keeps
  // `/paipan` as its canonical entry, including local development.
  redirect("/paipan");
}
