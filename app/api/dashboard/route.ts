import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/guards";

/** GET /api/dashboard — summary for the current user */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isResponse(auth)) return auth;

  const now = new Date();

  // Projects the user belongs to
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: auth.userId } } },
    select: { id: true, name: true },
  });

  const projectIds = projects.map((p: { id: string }) => p.id);

  const [totalTasks, todoTasks, inProgressTasks, doneTasks, overdueTasks, myTasks] =
    await Promise.all([
      // Total tasks across all user's projects
      prisma.task.count({ where: { projectId: { in: projectIds } } }),
      // By status
      prisma.task.count({
        where: { projectId: { in: projectIds }, status: "TODO" },
      }),
      prisma.task.count({
        where: { projectId: { in: projectIds }, status: "IN_PROGRESS" },
      }),
      prisma.task.count({
        where: { projectId: { in: projectIds }, status: "DONE" },
      }),
      // Overdue: dueDate in the past AND not DONE
      prisma.task.count({
        where: {
          projectId: { in: projectIds },
          dueDate: { lt: now },
          status: { not: "DONE" },
        },
      }),
      // Tasks assigned to current user (not done, for quick view)
      prisma.task.findMany({
        where: { assigneeId: auth.userId, status: { not: "DONE" } },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 10,
      }),
    ]);

  return Response.json({
    projects: { total: projects.length, list: projects },
    tasks: {
      total: totalTasks,
      byStatus: { TODO: todoTasks, IN_PROGRESS: inProgressTasks, DONE: doneTasks },
      overdue: overdueTasks,
    },
    myTasks,
  });
}
