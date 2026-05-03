"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  _count: { members: number; tasks: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  function loadProjects() {
    setLoading(true);
    api
      .get<{ projects: Project[] }>("/projects")
      .then((d) => setProjects(d.projects))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadProjects(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      await api.post("/projects", { name: newName, description: newDesc || undefined });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      loadProjects();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">All your projects in one place</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Project
        </button>
      </div>

      {loading && <div className="page-loading"><span className="spinner large" /></div>}
      {error && <div className="page-error">{error}</div>}

      {!loading && !error && projects.length === 0 && (
        <div className="empty-full">
          <div className="empty-icon">📂</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Create project
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="projects-grid">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="project-card">
              <div className="project-card-header">
                <div className="project-card-icon">{p.name[0].toUpperCase()}</div>
                <div className="project-card-meta">
                  <div className="project-card-owner">by {p.owner.name}</div>
                </div>
              </div>
              <h3 className="project-card-name">{p.name}</h3>
              {p.description && (
                <p className="project-card-desc">{p.description}</p>
              )}
              <div className="project-card-stats">
                <span>👥 {p._count.members} member{p._count.members !== 1 ? "s" : ""}</span>
                <span>✓ {p._count.tasks} task{p._count.tasks !== 1 ? "s" : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              {createError && <div className="auth-error">{createError}</div>}
              <div className="field-group">
                <label>Project name</label>
                <input
                  type="text"
                  placeholder="e.g. Marketing Website"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className="field-group">
                <label>Description (optional)</label>
                <textarea
                  placeholder="What is this project about?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <span className="spinner" /> : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
