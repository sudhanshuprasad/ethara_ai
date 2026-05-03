import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireMember, isResponse } from "@/lib/guards";
import { Role } from "@/app/generated/prisma/client";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id] */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const membership = await requireMember(id, auth.userId);
  if (isResponse(membership)) return membership;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project });
}

/** PUT /api/projects/[id] — Admin only */
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const project = await prisma.project.update({
    where: { id },
    data: result.data,
  });

  return Response.json({ project });
}

/** DELETE /api/projects/[id] — Owner only */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== auth.userId) {
    return Response.json(
      { error: "Only the project owner can delete it" },
      { status: 403 }
    );
  }

  await prisma.project.delete({ where: { id } });
  return Response.json({ message: "Project deleted" });
}
