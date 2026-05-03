# Team Task Manager

A full-stack REST API for team project and task management with role-based access control, built with **Next.js 16**, **Prisma 7**, and **PostgreSQL**.

---

## 🚀 Live URL

> _Add your Railway URL here after deployment_

---

## 📋 Features

- **Authentication** — Signup, Login with JWT (7-day expiry)
- **Projects** — Create, update, delete projects with team membership
- **Role-Based Access** — `ADMIN` (full control) / `MEMBER` (view + update own tasks)
- **Tasks** — Full CRUD, priority levels, due dates, status tracking
- **Dashboard** — Task counts by status, overdue tasks, personal task queue

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | — | Register (returns JWT) |
| `POST` | `/api/auth/login` | — | Login (returns JWT) |
| `GET` | `/api/auth/me` | ✅ | Get current user |

### Projects
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/projects` | Any | List my projects |
| `POST` | `/api/projects` | Any | Create project (auto ADMIN) |
| `GET` | `/api/projects/:id` | Member+ | Get project detail |
| `PUT` | `/api/projects/:id` | Admin | Update project |
| `DELETE` | `/api/projects/:id` | Owner | Delete project |

### Members
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/projects/:id/members` | Member+ | List members |
| `POST` | `/api/projects/:id/members` | Admin | Add member by email |
| `PATCH` | `/api/projects/:id/members/:userId` | Admin | Change role |
| `DELETE` | `/api/projects/:id/members/:userId` | Admin | Remove member |

### Tasks
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/projects/:id/tasks` | Member+ | List tasks (filter by `?status=TODO`) |
| `POST` | `/api/projects/:id/tasks` | Admin | Create task |
| `GET` | `/api/projects/:id/tasks/:taskId` | Member+ | Get task |
| `PUT` | `/api/projects/:id/tasks/:taskId` | Admin | Update task |
| `DELETE` | `/api/projects/:id/tasks/:taskId` | Admin | Delete task |
| `PATCH` | `/api/projects/:id/tasks/:taskId/status` | Assignee/Admin | Update status |
| `PATCH` | `/api/projects/:id/tasks/:taskId/assign` | Admin | Assign/unassign |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dashboard` | ✅ | Task summary, counts, overdue, my tasks |

---

## 🗄️ Database Schema

```
User          — id, name, email, password, createdAt
Project       — id, name, description, ownerId, createdAt
ProjectMember — id, projectId, userId, role (ADMIN|MEMBER), joinedAt
Task          — id, title, description, status, priority, dueDate, projectId, assigneeId, creatorId
```

**Enums:** `Role: ADMIN | MEMBER` · `TaskStatus: TODO | IN_PROGRESS | DONE` · `Priority: LOW | MEDIUM | HIGH`

---

## 🛠️ Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| ORM | Prisma 7 (WASM engine) |
| Database | PostgreSQL (Aiven / Railway) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Validation | Zod |

---

## ⚙️ Local Setup

```bash
# 1. Clone & install
git clone <your-repo>
cd ethara_ai
npm install

# 2. Set environment variables
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET

# 3. Run migrations
npx prisma migrate dev

# 4. Start dev server
npm run dev
```

Server runs at `http://localhost:3000`

---

## 🚀 Deploy to Railway

1. Push repo to GitHub
2. Create a new Railway project → **Add PostgreSQL** service
3. Copy the `DATABASE_URL` from Railway → paste into your Railway app's environment variables
4. Add `JWT_SECRET` env var (any long random string)
5. Add build command: `npx prisma migrate deploy && npm run build`
6. Add start command: `npm start`
7. Deploy — Railway auto-detects Next.js

---

## 🔐 Environment Variables

```env
DATABASE_URL="postgres://..."   # PostgreSQL connection string
JWT_SECRET="your-secret-here"  # Any long random string
```

---

## 📁 Project Structure

```
app/
├── api/
│   ├── auth/
│   │   ├── signup/route.ts
│   │   ├── login/route.ts
│   │   └── me/route.ts
│   ├── projects/
│   │   ├── route.ts               ← list + create
│   │   └── [id]/
│   │       ├── route.ts           ← get/update/delete
│   │       ├── members/
│   │       │   ├── route.ts
│   │       │   └── [userId]/route.ts
│   │       └── tasks/
│   │           ├── route.ts
│   │           └── [taskId]/
│   │               ├── route.ts
│   │               ├── status/route.ts
│   │               └── assign/route.ts
│   └── dashboard/route.ts
├── generated/prisma/             ← auto-generated Prisma client
lib/
├── prisma.ts    ← singleton client with PrismaPg adapter
├── jwt.ts       ← sign/verify helpers
└── guards.ts    ← requireAuth + requireMember RBAC guards
prisma/
└── schema.prisma
```
