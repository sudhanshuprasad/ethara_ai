# TaskFlow — Team Task Manager

A full-stack project management web app where teams can create projects, assign tasks, and track progress with role-based access control. Built with **Next.js 16**, **Prisma 7**, and **PostgreSQL**.

---

## 🚀 Live URL

> [_TaskFlow - Live URL_](https://etharaai-production-9aad.up.railway.app/)

---

## ✨ Features

- **Authentication** — Email/password signup & login, plus Google OAuth (one-click sign-in)
- **Projects** — Create projects, invite teammates, manage membership
- **Role-Based Access** — `ADMIN` (full control) / `MEMBER` (view + update own tasks)
- **Task Board** — Kanban-style board with Todo / In Progress / Done columns
- **Task Management** — Priority levels (Low / Medium / High), due dates, assignees
- **Optimistic Updates** — Task status changes reflect instantly in the UI without waiting for the server
- **Dashboard** — Personal task queue, project list, and real-time status counters
- **Health Check** — `/api/health` endpoint for uptime monitoring

---

## 🖥️ How to Use the App

### 1. Sign In

Open the app and you'll see the **TaskFlow** login screen.

- **Email/Password:** Click **Sign up** to create an account, then log in with your email and password.
- **Google OAuth:** Click **Continue with Google** for one-click sign-in. If you've previously signed up with the same email, your accounts are automatically linked.

Your session is stored as a JWT token in `localStorage`. It expires after 7 days, after which you'll be redirected back to the login screen.

---

### 2. Dashboard

After logging in you land on the **Dashboard**, which gives you a full workspace overview:

| Section | What it shows |
|---|---|
| **Stat cards** | Total projects, tasks by status (Todo / In Progress / Done), overdue count |
| **My Tasks** | All tasks assigned to you across every project |
| **Projects** | A quick list of your projects with a link to each |

---

### 3. Projects

Click **Projects** in the navbar to see all your projects.

#### Create a project
Click **+ New Project**, enter a name and optional description. You become the **Admin** (owner) automatically.

#### Open a project
Click any project card to open its detail page.

---

### 4. Project Detail — Task Board

The project page has two tabs:

#### Task Board
A three-column Kanban board: **To Do → In Progress → Done**.

Each task card shows:
- Priority badge (Low / Medium / High)
- Title and description
- Assignee avatar + name (or "Unassigned")
- Due date (highlighted red if overdue)

**Moving tasks:**
- Click **→ Start** / **→ Done** / **→ Reopen** on any task card to cycle its status.
- The card moves to the new column **instantly** (optimistic update), even before the server responds.
- If the server request fails, the card automatically reverts to its previous column.

> Only Admins and the assigned member can change a task's status.

#### Members Tab
Shows all project members with their roles. Admins can:
- **Add Member** — invite by email address, choose Admin or Member role
- **Remove Member** — click the ✕ button next to any non-owner member

---

### 5. Creating Tasks (Admins only)

Click **+ New Task** on the project detail page. Fill in:

| Field | Required | Notes |
|---|---|---|
| Title | ✅ | Up to 200 characters |
| Description | ✗ | Optional details |
| Priority | ✅ | Low / Medium / High |
| Due date | ✗ | Highlights red when overdue |
| Assignee | ✗ | Pick from project members |

---

### 6. Signing Out

Click your name in the top-right navbar → **Sign out**.

---

## ⚙️ How the App Works

### Architecture

```
Browser (Next.js Client Components)
        │  fetch + JWT Authorization header
        ▼
Next.js App Router (API Routes)
        │  Prisma ORM
        ▼
PostgreSQL (Aiven)
```

The app is a **monorepo** — the frontend and backend live in the same Next.js project.

- **Frontend** — React client components under `app/(app)/`
- **Backend** — REST API routes under `app/api/`
- **Database** — PostgreSQL via Prisma 7 with the PrismaPg WASM adapter

---

### Authentication Flow

```
Email/Password                    Google OAuth
─────────────                     ────────────
POST /api/auth/signup             GET /api/auth/google
POST /api/auth/login                  │ redirect to Google consent screen
        │                             │
        └──────── JWT (7 days) ───────┘ (via /api/v1/auth/google/callback)
                      │
               localStorage
                      │
           Authorization: Bearer <token>
           (attached to every API request by lib/api-client.ts)
```

**Google OAuth account linking:** If you sign up with email first, then sign in with Google using the same address, the accounts are automatically merged — no duplicate user is created.

---

### Role-Based Access Control

| Action | ADMIN | MEMBER |
|---|---|---|
| View project & tasks | ✅ | ✅ |
| Create / edit tasks | ✅ | ✗ |
| Update own task status | ✅ | ✅ |
| Add / remove members | ✅ | ✗ |
| Delete project | ✅ (owner only) | ✗ |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Aiven) |
| ORM | Prisma 7 (WASM / PrismaPg adapter) |
| Auth | JWT (jsonwebtoken) + Google OAuth 2.0 |
| Validation | Zod |
| Styling | Vanilla CSS (custom dark design system) |
| Deployment | Railway (Nixpacks / Node 22) |


### Data Model

```
User
 ├─ id, name, email, password?, googleId?, avatarUrl
 └─ owns many Projects, is member of many Projects, assigned many Tasks

Project
 ├─ id, name, description, ownerId
 ├─ members: [{ userId, role: ADMIN|MEMBER }]
 └─ tasks: [Task]

Task
 ├─ id, title, description, status, priority, dueDate
 ├─ projectId → Project
 ├─ creatorId → User
 └─ assigneeId? → User
```

---

### Optimistic Updates

The Kanban task cycle button uses **optimistic UI**:

1. The task's status is updated **immediately in React state** — the card animates to the new column before any network request.
2. A `PATCH /api/projects/:id/tasks/:taskId/status` request is sent in the background.
3. If the request **succeeds** — nothing more to do, the UI is already correct.
4. If the request **fails** — the state is reverted to the previous status and the card moves back.

This makes the board feel instant even on slow connections.

---

## 🛠️ Local Setup

### Prerequisites
- Node.js 22+
- PostgreSQL database (Aiven free tier works)

### 1. Clone and install
```bash
git clone <your-repo-url>
cd ethara_ai
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgres://..."          # your PostgreSQL connection string
JWT_SECRET="change-me-to-a-long-random-string"

GOOGLE_CLIENT_ID="..."                 # from Google Cloud Console
GOOGLE_CLIENT_SECRET="..."
# GOOGLE_REDIRECT_URI="..."            # optional override (for production)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Run database migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Start the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🚀 How to Deploy

You can deploy this Next.js app to platforms like Vercel, Railway, or Render. Here is the general flow:

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Connect to your hosting provider
Create a new project on your chosen platform (e.g., Vercel, Railway) and connect your GitHub repository.

### 3. Set Environment Variables
You will need to configure the following environment variables in your hosting provider's dashboard:

| Variable | Description / Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `JWT_SECRET` | A secure, long random string |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://your-app-domain.com/api/v1/auth/google/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app-domain.com` |

### 4. Add Google redirect URI
In Google Cloud Console → OAuth 2.0 Credentials, add the callback URL for your production domain:
```
https://your-app-domain.com/api/v1/auth/google/callback
```

### 5. Build and Run Commands
Ensure your platform runs the following steps (most platforms do this automatically for Next.js apps):
1. Install dependencies: `npm install`
2. Build the app: `npm run build` (this runs `prisma generate`)
3. Run migrations and start: `npx prisma migrate deploy && npm start`

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | — | Register — returns JWT |
| `POST` | `/api/auth/login` | — | Login — returns JWT |
| `GET` | `/api/auth/me` | ✅ | Get current user |
| `GET` | `/api/auth/google` | — | Redirect to Google consent |
| `GET` | `/api/v1/auth/google/callback` | — | Google OAuth callback |

### Projects
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | ✅ | List all projects for current user |
| `POST` | `/api/projects` | ✅ | Create a project |
| `GET` | `/api/projects/:id` | ✅ | Get project details + members |
| `PUT` | `/api/projects/:id` | ✅ Admin | Update project |
| `DELETE` | `/api/projects/:id` | ✅ Owner | Delete project |

### Members
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/projects/:id/members` | ✅ Admin | Add member by email |
| `DELETE` | `/api/projects/:id/members/:userId` | ✅ Admin | Remove member |

### Tasks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects/:id/tasks` | ✅ Member | List tasks |
| `POST` | `/api/projects/:id/tasks` | ✅ Admin | Create task |
| `GET` | `/api/projects/:id/tasks/:taskId` | ✅ Member | Get task |
| `PUT` | `/api/projects/:id/tasks/:taskId` | ✅ Admin | Update task |
| `DELETE` | `/api/projects/:id/tasks/:taskId` | ✅ Admin | Delete task |
| `PATCH` | `/api/projects/:id/tasks/:taskId/status` | ✅ Admin/Assignee | Update status |
| `PATCH` | `/api/projects/:id/tasks/:taskId/assign` | ✅ Admin | Assign task |

### Dashboard & Health
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | ✅ | Aggregated stats + personal task queue |
| `GET` | `/api/health` | — | App + DB liveness check |

---
