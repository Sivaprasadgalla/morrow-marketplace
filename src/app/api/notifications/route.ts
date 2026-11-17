import { NextResponse } from "next/server";
import { handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";

export async function GET(request: Request) {
  try {
    const session = await requireRole();
    await connectDB();
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    const query: Record<string, unknown> = { recipient: session.user.id };
    if (unreadOnly) query.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ recipient: session.user.id, read: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole();
    const body = (await request.json()) as { ids?: string[]; markAllRead?: boolean };
    await connectDB();

    if (body.markAllRead) {
      await Notification.updateMany(
        { recipient: session.user.id, read: false },
        { $set: { read: true, readAt: new Date() } },
      );
    } else if (body.ids?.length) {
      await Notification.updateMany(
        { _id: { $in: body.ids }, recipient: session.user.id },
        { $set: { read: true, readAt: new Date() } },
      );
    }

    const unreadCount = await Notification.countDocuments({ recipient: session.user.id, read: false });
    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}
