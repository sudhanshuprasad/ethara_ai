"use client";

import { useEffect, useState, useCallback, use } from "react";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────── */
interface User { id: string; name: string; email: string; }
interface Member { id: string; userId: string; role: "ADMIN" | "MEMBER"; joinedAt: string; user: User; }
interface Task {
  id: string; title: string; description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  projectId: string;
  assignee: User | null;
  creator: { id: string; name: string };
}
interface Project {
  id: string; name: string; description: string | null;
  ownerId: string;
  owner: User;
  members: Member[];
  _count: { tasks: number };
}

const STATUS_COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
];
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "priority-low", MEDIUM: "priority-medium", HIGH: "priority-high",
};

/* ─── Task Card ──────────────────────────────── */
function TaskCard({
  task, isAdmin, myId, onStatusChange,
}: {
  task: Task;
  isAdmin: boolean;
  myId: string;
  onStatusChange: (taskId: string, newStatus: Task["status"], prevStatus: Task["status"]) => void;
}) {
  const canUpdateStatus = isAdmin || task.assignee?.id === myId;
  const [pending, setPending] = useState(false);

  const NEXT_STATUS: Record<Task["status"], Task["status"]> = {
    TODO: "IN_PROGRESS",
    IN_PROGRESS: "DONE",
    DONE: "TODO",
  };
  const NEXT_LABEL: Record<Task["status"], string> = {
    TODO: "Start",
    IN_PROGRESS: "Done",
    DONE: "Reopen",
  };

  async function cycleStatus() {
    if (!canUpdateStatus || pending) return;
    const nextStatus = NEXT_STATUS[task.status];
    // 1. Optimistic update — move card instantly
    onStatusChange(task.id, nextStatus, task.status);
    setPending(true);
    try {
      await api.patch(`/projects/${task.projectId}/tasks/${task.id}/status`, {
        status: nextStatus,
      });
    } catch (e) {
      // 2. Revert on failure
      console.error(e);
      onStatusChange(task.id, task.status, nextStatus);
    } finally {
      setPending(false);
    }
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div className="task-card">
      <div className="task-card-top">
        <span className={`priority-badge ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        {isOverdue && <span className="overdue-tag">Overdue</span>}
      </div>
      <div className="task-card-title">{task.title}</div>
      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}
      <div className="task-card-footer">
        <div className="task-assignee">
          {task.assignee ? (
            <><span className="avatar-mini">{task.assignee.name[0]}</span> {task.assignee.name}</>
          ) : (
            <span className="unassigned">Unassigned</span>
          )}
        </div>
        {task.dueDate && (
          <span className={`task-due-small ${isOverdue ? "text-danger" : ""}`}>
            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
      {canUpdateStatus && (
        <button
          className={`task-cycle-btn ${pending ? "pending" : ""}`}
          onClick={cycleStatus}
          disabled={pending}
          title={`Move to ${NEXT_STATUS[task.status].replace("_", " ")}`}
        >
          {pending ? (
            <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
          ) : (
            `→ ${NEXT_LABEL[task.status]}`
          )}
        </button>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────── */
export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState("");
  const [activeTab, setActiveTab] = useState<"board" | "members">("board");

  // Create task modal
  const [showTask, setShowTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("MEDIUM");
  const [taskDue, setTaskDue] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskError, setTaskError] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);

  // Add member modal
  const [showMember, setShowMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberError, setMemberError] = useState("");
  const [memberSaving, setMemberSaving] = useState(false);

  const isAdmin = project?.members.some(
    (m) => m.userId === myId && m.role === "ADMIN"
  ) ?? false;

  const loadData = useCallback(async () => {
    try {
      const [meRes, projRes, tasksRes] = await Promise.all([
        api.get<{ user: { id: string } }>("/auth/me"),
        api.get<{ project: Project }>(`/projects/${id}`),
        api.get<{ tasks: Task[] }>(`/projects/${id}/tasks`),
      ]);
      setMyId(meRes.user.id);
      setProject(projRes.project);
      setTasks(tasksRes.tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setTaskSaving(true);
    setTaskError("");
    try {
      await api.post(`/projects/${id}/tasks`, {
        title: taskTitle,
        description: taskDesc || undefined,
        priority: taskPriority,
        dueDate: taskDue ? new Date(taskDue).toISOString() : undefined,
        assigneeId: taskAssignee || undefined,
      });
      setShowTask(false);
      setTaskTitle(""); setTaskDesc(""); setTaskPriority("MEDIUM");
      setTaskDue(""); setTaskAssignee("");
      loadData();
    } catch (err: unknown) {
      setTaskError(err instanceof Error ? err.message : "Failed");
    } finally {
      setTaskSaving(false);
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberSaving(true);
    setMemberError("");
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail, role: memberRole });
      setShowMember(false);
      setMemberEmail("");
      loadData();
    } catch (err: unknown) {
      setMemberError(err instanceof Error ? err.message : "Failed");
    } finally {
      setMemberSaving(false);
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member?")) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function deleteProject() {
    if (!confirm("Delete this project and all its tasks? This cannot be undone.")) return;
    try {
      await api.delete(`/projects/${id}`);
      router.push("/projects");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) return <div className="page-loading"><span className="spinner large" /></div>;
  if (!project) return <div className="page-error">Project not found</div>;

  const tasksByStatus = STATUS_COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {});

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <a href="/projects" className="link-subtle">Projects</a> / {project.name}
          </div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div className="header-actions">
          {isAdmin && (
            <>
              <button className="btn-outline" onClick={() => setShowMember(true)}>
                + Add Member
              </button>
              <button className="btn-primary" onClick={() => setShowTask(true)}>
                + New Task
              </button>
              {project.ownerId === myId && (
                <button className="btn-danger" onClick={deleteProject}>
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === "board" ? "active" : ""}`}
          onClick={() => setActiveTab("board")}
        >
          Task Board ({tasks.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
        >
          Members ({project.members.length})
        </button>
      </div>

      {/* Task Board */}
      {activeTab === "board" && (
        <div className="kanban-board">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.key} className="kanban-column">
              <div className="kanban-col-header">
                <span className="kanban-col-title">{col.label}</span>
                <span className="kanban-col-count">{tasksByStatus[col.key].length}</span>
              </div>
              <div className="kanban-cards">
                {tasksByStatus[col.key].length === 0 ? (
                  <div className="kanban-empty">No tasks</div>
                ) : (
                  tasksByStatus[col.key].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAdmin={isAdmin}
                      myId={myId}
                      onStatusChange={(taskId, newStatus, prevStatus) => {
                        setTasks((prev) =>
                          prev.map((t) =>
                            t.id === taskId ? { ...t, status: newStatus } : t
                          )
                        );
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="members-list">
          {project.members.map((m) => (
            <div key={m.id} className="member-row">
              <div className="member-avatar">{m.user.name[0].toUpperCase()}</div>
              <div className="member-info">
                <div className="member-name">
                  {m.user.name}
                  {m.userId === project.ownerId && (
                    <span className="owner-tag">Owner</span>
                  )}
                </div>
                <div className="member-email">{m.user.email}</div>
              </div>
              <span className={`role-badge ${m.role === "ADMIN" ? "role-admin" : "role-member"}`}>
                {m.role}
              </span>
              {isAdmin && m.userId !== project.ownerId && m.userId !== myId && (
                <button
                  className="btn-icon-danger"
                  onClick={() => removeMember(m.userId)}
                  title="Remove member"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showTask && (
        <div className="modal-overlay" onClick={() => setShowTask(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Task</h2>
              <button className="modal-close" onClick={() => setShowTask(false)}>✕</button>
            </div>
            <form onSubmit={createTask} className="modal-form">
              {taskError && <div className="auth-error">{taskError}</div>}
              <div className="field-group">
                <label>Title</label>
                <input type="text" placeholder="Task title" value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)} required maxLength={200} autoFocus />
              </div>
              <div className="field-group">
                <label>Description (optional)</label>
                <textarea placeholder="Task details..." value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)} maxLength={1000} rows={3} />
              </div>
              <div className="modal-row">
                <div className="field-group">
                  <label>Priority</label>
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as Task["priority"])}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>Due date (optional)</label>
                  <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                </div>
              </div>
              <div className="field-group">
                <label>Assign to (optional)</label>
                <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {project.members.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user.name} ({m.user.email})</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowTask(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={taskSaving}>
                  {taskSaving ? <span className="spinner" /> : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMember && (
        <div className="modal-overlay" onClick={() => setShowMember(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Member</h2>
              <button className="modal-close" onClick={() => setShowMember(false)}>✕</button>
            </div>
            <form onSubmit={addMember} className="modal-form">
              {memberError && <div className="auth-error">{memberError}</div>}
              <div className="field-group">
                <label>Email address</label>
                <input type="email" placeholder="teammate@example.com" value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)} required autoFocus />
              </div>
              <div className="field-group">
                <label>Role</label>
                <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as "ADMIN" | "MEMBER")}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowMember(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={memberSaving}>
                  {memberSaving ? <span className="spinner" /> : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
