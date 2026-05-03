"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";


/* ─── Types ─────────────────────────────────────────── */
type Tab = "login" | "signup";
type Status = "idle" | "loading" | "error" | "success";

/* ─── Main Page ──────────────────────────────────────── */
function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>("login");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  /** Save token and redirect to dashboard */
  const handleToken = useCallback((token: string) => {
    localStorage.setItem("token", token);
    router.push("/dashboard");
  }, [router]);

  /* Read ?token= or ?error= from Google OAuth redirect */
  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");
    if (token) {
      handleToken(token);
    } else if (error) {
      const messages: Record<string, string> = {
        oauth_denied: "Google sign-in was cancelled.",
        token_exchange_failed: "Failed to complete Google sign-in. Try again.",
        email_not_verified: "Your Google email is not verified.",
        server_error: "Something went wrong. Please try again.",
      };
      setErrorMsg(messages[error] ?? "Google sign-in failed.");
      setStatus("error");
    }
  }, [searchParams, handleToken]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      handleToken(data.token);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Login failed");
      setStatus("error");
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fieldErr = data.error;
        if (typeof fieldErr === "object") {
          const first = Object.values(fieldErr).flat()[0];
          throw new Error(String(first));
        }
        throw new Error(fieldErr ?? "Signup failed");
      }
      handleToken(data.token);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Signup failed");
      setStatus("error");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="auth-root">
      {/* Left panel — branding */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="brand-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.15" />
              <path d="M8 22L14 10L20 18L24 14L28 22H8Z" fill="white" />
            </svg>
          </div>
          <span className="brand-name">TaskFlow</span>
        </div>
        <div className="auth-headline">
          <h1>Manage projects.<br />Ship faster.</h1>
          <p>Assign tasks, track progress, and collaborate with your team — all in one place.</p>
        </div>
        <div className="auth-features">
          {[
            { icon: "◈", label: "Role-based access control" },
            { icon: "⬡", label: "Real-time task tracking" },
            { icon: "◉", label: "Dashboard & analytics" },
          ].map((f) => (
            <div key={f.label} className="feature-pill">
              <span className="feature-icon">{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
        {/* Decorative circles */}
        <div className="deco deco-1" />
        <div className="deco deco-2" />
      </div>

      {/* Right panel — auth form */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>{tab === "login" ? "Welcome back" : "Create account"}</h2>
            <p>{tab === "login" ? "Sign in to your workspace" : "Get started for free"}</p>
          </div>

          {/* Google OAuth button */}
          <a href="/api/auth/google" className="google-btn" id="google-oauth-btn">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.79h5.4a4.6 4.6 0 01-2 3.02v2.5h3.24C18.34 15.8 19.6 13.23 19.6 10.23z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.96-.9 6.62-2.46l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H1.08v2.58A10 10 0 0010 20z" fill="#34A853"/>
              <path d="M4.4 11.88A5.97 5.97 0 014.1 10c0-.65.11-1.28.3-1.88V5.54H1.08A10 10 0 000 10c0 1.64.39 3.18 1.08 4.46l3.32-2.58z" fill="#FBBC05"/>
              <path d="M10 3.96c1.47 0 2.8.5 3.84 1.5l2.88-2.88C14.96 1.0 12.7 0 10 0A10 10 0 001.08 5.54L4.4 8.12C5.2 5.76 7.4 3.96 10 3.96z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Tab switcher */}
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "login"}
              className={`auth-tab ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); setStatus("idle"); setErrorMsg(""); }}
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={tab === "signup"}
              className={`auth-tab ${tab === "signup" ? "active" : ""}`}
              onClick={() => { setTab("signup"); setStatus("idle"); setErrorMsg(""); }}
            >
              Sign up
            </button>
          </div>

          {/* Error message */}
          {status === "error" && (
            <div className="auth-error" role="alert">{errorMsg}</div>
          )}

          {/* Login form */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="auth-form" id="login-form">
              <div className="field-group">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                id="login-submit"
                type="submit"
                className="auth-submit"
                disabled={isLoading}
              >
                {isLoading ? <span className="spinner" /> : "Sign in"}
              </button>
            </form>
          )}

          {/* Signup form */}
          {tab === "signup" && (
            <form onSubmit={handleSignup} className="auth-form" id="signup-form">
              <div className="field-group">
                <label htmlFor="signup-name">Full name</label>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="field-group">
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <button
                id="signup-submit"
                type="submit"
                className="auth-submit"
                disabled={isLoading}
              >
                {isLoading ? <span className="spinner" /> : "Create account"}
              </button>
            </form>
          )}

          <p className="auth-footer">
            By continuing, you agree to our{" "}
            <a href="#">Terms of Service</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0d0f14" }} />}>
      <HomeInner />
    </Suspense>
  );
}
