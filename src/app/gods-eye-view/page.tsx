import Link from "next/link";

export default function GodsEyeViewPage() {
  return (
    <main className="fixed inset-0 bg-black">
      <iframe
        title="God's Eye View"
        src="/gods-eye-view/index.html"
        className="h-full w-full border-0"
        allow="fullscreen; microphone"
      />
      <Link
        href="/"
        className="fixed left-4 top-4 z-10 rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs text-white backdrop-blur hover:bg-black/90"
      >
        返回胜天半子
      </Link>
    </main>
  );
}
