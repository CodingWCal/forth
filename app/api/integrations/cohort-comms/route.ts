import { createHash } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { getAdminServices } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const MAX_ID_LENGTH = 160;
const MAX_TITLE_LENGTH = 240;
const MAX_ASSIGNEE_LENGTH = 120;
const DEFAULT_CHANNEL = "general";

type RequestBody = { workspaceId?: unknown; taskId?: unknown };

function clamp(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function eventId(workspaceId: string, taskId: string, completedAt: string) {
  const source = ["ticket.shipped", workspaceId, taskId, "done", completedAt].join("\n");
  return `forth-ticket-shipped-${createHash("sha256").update(source).digest("hex").slice(0, 32)}`;
}

export async function POST(request: Request) {
  const secret = process.env.COHORT_COMMS_WEBHOOK_SECRET;
  const webhookUrl = process.env.COHORT_COMMS_WEBHOOK_URL;
  if (!secret || !webhookUrl) return errorResponse(503, "Cohort Comms delivery is not configured.");
  if (!webhookUrl.startsWith("https://") && process.env.NODE_ENV !== "development") {
    return errorResponse(503, "Cohort Comms delivery requires an HTTPS endpoint.");
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return errorResponse(401, "Authentication is required.");

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }
  const workspaceId = clamp(body.workspaceId, MAX_ID_LENGTH);
  const taskId = clamp(body.taskId, MAX_ID_LENGTH);
  if (!workspaceId || !taskId) return errorResponse(400, "workspaceId and taskId are required.");

  try {
    const { auth, db } = getAdminServices();
    let verified: DecodedIdToken;
    try {
      verified = await auth.verifyIdToken(token);
    } catch {
      return errorResponse(401, "Authentication could not be verified.");
    }
    const workspaceRef = db.doc(`workspaces/${workspaceId}`);
    const workspace = await workspaceRef.get();
    if (!workspace.exists) return errorResponse(404, "Workspace not found.");
    const ownerId = workspace.data()?.ownerId;
    const member = await workspaceRef.collection("members").doc(verified.uid).get();
    if (ownerId !== verified.uid && !member.exists) return errorResponse(403, "You cannot use this workspace.");

    const task = await workspaceRef.collection("tasks").doc(taskId).get();
    if (!task.exists) return errorResponse(404, "Ticket not found.");
    const data = task.data() ?? {};
    const completedAt = clamp(data.completedAt, 80);
    if (data.status !== "done") return errorResponse(409, "Only shipped tickets can be announced.");
    if (!completedAt || Number.isNaN(Date.parse(completedAt))) return errorResponse(409, "The ticket has no valid completion time.");

    const payload = {
      version: 1,
      id: eventId(workspaceId, taskId, completedAt),
      event: "ticket.shipped",
      sentAt: new Date().toISOString(),
      channel: clamp(process.env.COHORT_COMMS_CHANNEL || DEFAULT_CHANNEL, 80) || DEFAULT_CHANNEL,
      workspace: { id: workspaceId },
      ticket: {
        id: taskId,
        title: clamp(data.title, MAX_TITLE_LENGTH),
        status: "Shipped",
        statusCode: "done",
        assignee: clamp(data.assignee, MAX_ASSIGNEE_LENGTH),
        projectId: clamp(data.projectId, MAX_ID_LENGTH),
        completedAt,
        url: `${process.env.FORTH_CANONICAL_URL || "https://forth-bice.vercel.app"}/#proof`,
      },
    };
    if (!payload.ticket.title || !payload.ticket.projectId) return errorResponse(409, "The ticket is missing canonical data.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forth-secret": secret },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok && response.status !== 200 && response.status !== 201) {
        return errorResponse(502, "The ticket was saved, but Cohort Comms did not accept the update.");
      }
      return NextResponse.json({ delivered: true, eventId: payload.id }, { status: response.status === 201 ? 201 : 200 });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return errorResponse(504, "Cohort Comms did not respond in time.");
    if (error instanceof Error && error.message === "Forth server integration is not configured.") return errorResponse(503, error.message);
    return errorResponse(500, "Forth could not prepare the chat update.");
  }
}
