"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";

interface DashboardData {
  projects: { total: number; list: { id: string; name: string }[] };
  tasks: {
    total: number;
    byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
    overdue: number;
  };
  myTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    project: { id: string; name: string };
  }[];
}

const STATUS_COLOR: Record<string, string> = {
  TODO: "badge-todo",
  IN_PROGRESS: "badge-progress",
  DONE: "badge-done",
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW: "priority-low",
  MEDIUM: "priority-medium",
  HIGH: "priority-high",
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={`stat-card ${accent ?? ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="page-loading">
        <span className="spinner large" />
      </div>
    );
  if (error) return <div className="page-error">{error}</div>;
  if (!data) return null;

  const { projects, tasks, myTasks } = data;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your workspace at a glance</p>
        </div>
        <Link href="/projects" className="btn-primary">
          + New Project
        </Link>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard label="Total Projects" value={projects.total} />
        <StatCard label="Total Tasks" value={tasks.total} />
        <StatCard label="In Progress" value={tasks.byStatus.IN_PROGRESS} accent="accent-progress" />
        <StatCard label="Done" value={tasks.byStatus.DONE} accent="accent-done" />
        <StatCard label="To Do" value={tasks.byStatus.TODO} />
        <StatCard
          label="Overdue"
          value={tasks.overdue}
          accent={tasks.overdue > 0 ? "accent-danger" : ""}
        />
      </div>

      {/* Two-column: my tasks + projects */}
      <div className="dash-grid">
        {/* My Tasks */}
        <section className="dash-section">
          <h2 className="section-title">My Tasks</h2>
          {myTasks.length === 0 ? (
            <div className="empty-state">No pending tasks assigned to you 🎉</div>
          ) : (
            <div className="task-list">
              {myTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.project.id}`}
                  className="task-row"
                >
                  <div className="task-row-left">
                    <span className={`badge ${STATUS_COLOR[t.status]}`}>
                      {t.status.replace("_", " ")}
                    </span>
                    <div>
                      <div className="task-row-title">{t.title}</div>
                      <div className="task-row-project">{t.project.name}</div>
                    </div>
                  </div>
                  <div className="task-row-right">
                    <span className={`priority-dot ${PRIORITY_COLOR[t.priority]}`} />
                    {t.dueDate && (
                      <span className="task-due">
                        {new Date(t.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Projects list */}
        <section className="dash-section">
          <div className="section-header-row">
            <h2 className="section-title">Projects</h2>
            <Link href="/projects" className="link-subtle">View all →</Link>
          </div>
          {projects.list.length === 0 ? (
            <div className="empty-state">
              No projects yet.{" "}
              <Link href="/projects" className="link-accent">
                Create one
              </Link>
            </div>
          ) : (
            <div className="project-list">
              {projects.list.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="project-row">
                  <div className="project-row-icon">{p.name[0].toUpperCase()}</div>
                  <span className="project-row-name">{p.name}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
