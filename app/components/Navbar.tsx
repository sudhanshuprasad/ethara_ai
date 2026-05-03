"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api
      .get<{ user: User }>("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link href="/dashboard" className="navbar-brand">
          <div className="navbar-logo">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <path d="M8 22L14 10L20 18L24 14L28 22H8Z" fill="white" />
            </svg>
          </div>
          TaskFlow
        </Link>

        {/* Nav links */}
        <div className="navbar-links">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${pathname.startsWith(l.href) ? "active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* User menu */}
        <div className="navbar-user" onClick={() => setMenuOpen((o) => !o)}>
          <div className="user-avatar">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" />
            ) : (
              <span>{user?.name?.[0]?.toUpperCase() ?? "?"}</span>
            )}
          </div>
          <span className="user-name">{user?.name ?? "…"}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>

          {menuOpen && (
            <div className="user-dropdown">
              <div className="dropdown-info">
                <div className="dropdown-name">{user?.name}</div>
                <div className="dropdown-email">{user?.email}</div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={logout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
