import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireMember, isResponse } from "@/lib/guards";
import { Role } from "@/app/generated/prisma/client";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.iso.datetime().nullable().optional(),
});

type Params = { params: Promise<{ id: string; taskId: string }> };

async function getTask(taskId: string, projectId: string) {
  return prisma.task.findFirst({ where: { id: taskId, projectId } });
}

/** GET /api/projects/[id]/tasks/[taskId] */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id, taskId } = await params;
  const membership = await requireMember(id, auth.userId);
  if (isResponse(membership)) return membership;

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId: id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  return Response.json({ task });
}

/** PUT /api/projects/[id]/tasks/[taskId] — Admin only */
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id, taskId } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const task = await getTask(taskId, id);
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const body = await req.json();
  const result = updateTaskSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...result.data,
      dueDate:
        result.data.dueDate === null
          ? null
          : result.data.dueDate
          ? new Date(result.data.dueDate)
          : undefined,
      priority: result.data.priority as never,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return Response.json({ task: updated });
}

/** DELETE /api/projects/[id]/tasks/[taskId] — Admin only */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id, taskId } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const task = await getTask(taskId, id);
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  await prisma.task.delete({ where: { id: taskId } });
  return Response.json({ message: "Task deleted" });
}
