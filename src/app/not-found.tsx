import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 500 }}>Page not found</h1>
        <p className="muted" style={{ margin: "8px 0 20px" }}>The course or page does not exist, or you do not have access to it.</p>
        <Link href="/" className="btn btn-dark">Go home</Link>
      </div>
    </main>
  );
}
