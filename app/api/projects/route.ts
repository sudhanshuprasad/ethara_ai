import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/guards";
import { Role } from "@/app/generated/prisma/client";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

/** GET /api/projects — list all projects the current user is a member of */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId: auth.userId } },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ projects });
}

/** POST /api/projects — create project, auto-add creator as ADMIN */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      name: result.data.name,
      description: result.data.description,
      ownerId: auth.userId,
      members: {
        create: { userId: auth.userId, role: Role.ADMIN },
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return Response.json({ project }, { status: 201 });
}
