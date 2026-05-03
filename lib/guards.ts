import { NextRequest } from "next/server";
import { getAuthPayload, JwtPayload } from "./jwt";
import { prisma } from "./prisma";
import { Role } from "@/app/generated/prisma/client";

/** Require valid JWT. Returns payload or a 401 Response. */
export async function requireAuth(
  req: NextRequest
): Promise<JwtPayload | Response> {
  const payload = getAuthPayload(req);
  if (!payload) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return payload;
}

/** Require the current user to be a member of the given project.
 *  Returns the ProjectMember record or an error Response. */
export async function requireMember(
  projectId: string,
  userId: string,
  minRole?: Role
) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!member) {
    return Response.json(
      { error: "Not a member of this project" },
      { status: 403 }
    );
  }

  if (minRole === Role.ADMIN && member.role !== Role.ADMIN) {
    return Response.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  return member;
}

/** Convenience: check if a value is a Next.js Response (error) */
export function isResponse(val: unknown): val is Response {
  return val instanceof Response;
}
