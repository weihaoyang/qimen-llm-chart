import Link from "next/link";

export default function GodsEyeViewPage() {
  return (
    <main
      className="gods-eye-page"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        background: "#05090d",
      }}
    >
      <iframe
        title="Eyes of God"
        src="/gods-eye-view/index.html"
        className="gods-eye-frame"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          minWidth: "100%",
          minHeight: "100%",
          border: 0,
          background: "#05090d",
        }}
        allow="fullscreen; microphone"
      />
      <Link
        href="/"
        className="gods-eye-back"
      >
        返回胜天半子
      </Link>
    </main>
  );
}
