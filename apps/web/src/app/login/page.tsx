"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("admin");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login" ? { email, password } : { email, password, handle, display_name: handle };
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.errors?.[0]?.message ?? "Auth failed");
      return;
    }
    router.push("/moderate");
  }

  return (
    <main className="page" style={{ maxWidth: 420 }}>
      <Link href="/" className="wordmark">
        PRECEPT
      </Link>
      <h1>{mode === "login" ? "Login" : "Register"}</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Email
          <input className="search-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode === "register" ? (
          <label>
            Handle
            <input className="search-input" value={handle} onChange={(e) => setHandle(e.target.value)} />
          </label>
        ) : null}
        <label>
          Password
          <input
            className="search-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="button" type="submit">
          {mode === "login" ? "Login" : "Create account"}
        </button>
      </form>
      <button type="button" className="button ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        Switch to {mode === "login" ? "register" : "login"}
      </button>
      <p className="muted">
        First admin: <code>npm run admin:create -- --email=... --password=...</code>
      </p>
    </main>
  );
}
