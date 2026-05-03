import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireMember, isResponse } from "@/lib/guards";
import { Role } from "@/app/generated/prisma/client";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.iso.datetime().optional(),
  assigneeId: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id]/tasks */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const membership = await requireMember(id, auth.userId);
  if (isResponse(membership)) return membership;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const tasks = await prisma.task.findMany({
    where: {
      projectId: id,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ tasks });
}

/** POST /api/projects/[id]/tasks — Admin only */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const body = await req.json();
  const result = createTaskSchema.safeParse(body);
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

  const task = await prisma.task.create({
    data: {
      title: result.data.title,
      description: result.data.description,
      priority: result.data.priority as never,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
      projectId: id,
      assigneeId: result.data.assigneeId,
      creatorId: auth.userId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return Response.json({ task }, { status: 201 });
}
