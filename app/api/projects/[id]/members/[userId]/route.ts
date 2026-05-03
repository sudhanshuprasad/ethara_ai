import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireMember, isResponse } from "@/lib/guards";
import { Role } from "@/app/generated/prisma/client";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

type Params = { params: Promise<{ id: string; userId: string }> };

/** PATCH /api/projects/[id]/members/[userId] — change role (Admin only) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id, userId } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const body = await req.json();
  const result = updateRoleSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });
  if (!target) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId: id, userId } },
    data: { role: result.data.role as Role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return Response.json({ member: updated });
}

/** DELETE /api/projects/[id]/members/[userId] — remove member (Admin only) */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id, userId } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const project = await prisma.project.findUnique({ where: { id } });
  if (project?.ownerId === userId) {
    return Response.json(
      { error: "Cannot remove the project owner" },
      { status: 400 }
    );
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: id, userId } },
  });

  return Response.json({ message: "Member removed" });
}
