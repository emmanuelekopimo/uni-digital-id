import Link from "next/link";

export default function NotFound() {
  return (
    <main className="cert" style={{ textAlign: "center", paddingTop: 100 }}>
      <img src="/logo.svg" alt="" style={{ width: 52, margin: "0 auto 16px" }} />
      <h1 style={{ fontSize: 24 }}>Page not found</h1>
      <p className="muted" style={{ margin: "8px 0 20px" }}>The course or page does not exist, or you do not have access to it.</p>
      <Link href="/" className="btn btn-brand">Go home</Link>
    </main>
  );
}
