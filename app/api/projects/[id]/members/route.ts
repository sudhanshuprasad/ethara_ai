import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireMember, isResponse } from "@/lib/guards";
import { Role } from "@/app/generated/prisma/client";

const addMemberSchema = z.object({
  email: z.email("Invalid email"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id]/members */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const membership = await requireMember(id, auth.userId);
  if (isResponse(membership)) return membership;

  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return Response.json({ members });
}

/** POST /api/projects/[id]/members — Admin only, add member by email */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const membership = await requireMember(id, auth.userId, Role.ADMIN);
  if (isResponse(membership)) return membership;

  const body = await req.json();
  const result = addMemberSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: result.data.email },
  });
  if (!targetUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId: targetUser.id } },
  });
  if (existing) {
    return Response.json({ error: "User is already a member" }, { status: 409 });
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId: id,
      userId: targetUser.id,
      role: result.data.role as Role,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return Response.json({ member }, { status: 201 });
}
