import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireMember, isResponse } from "@/lib/guards";
import { Role } from "@/app/generated/prisma/client";

const assignSchema = z.object({
  assigneeId: z.string().nullable(),
});

type Params = { params: Promise<{ id: string; taskId: string }> };

/** PATCH /api/projects/[id]/tasks/[taskId]/assign — Admin only */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id, taskId } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const task = await prisma.task.findFirst({ where: { id: taskId, projectId: id } });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const body = await req.json();
  const result = assignSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (result.data.assigneeId) {
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: id, userId: result.data.assigneeId },
      },
    });
    if (!isMember) {
      return Response.json(
        { error: "Assignee is not a project member" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: result.data.assigneeId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return Response.json({ task: updated });
}
