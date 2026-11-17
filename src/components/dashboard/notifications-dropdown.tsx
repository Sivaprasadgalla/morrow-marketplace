"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, Package, ShieldCheck, ShoppingBag, Tag, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useToast } from "@/components/ui/toast";

type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

const typeIcons: Record<string, typeof ShoppingBag> = {
  "order.placed": ShoppingBag,
  "order.paid": ShoppingBag,
  "order.cancelled": ShoppingBag,
  "order.shipped": Package,
  "order.delivered": Package,
  "product.submitted": Tag,
  "product.approved": Tag,
  "product.rejected": Tag,
  "user.registered": UserPlus,
  "user.role_changed": ShieldCheck,
  "stock.low": Package,
};

function timeAgo(dateString: string) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export function NotificationsDropdown() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=20");
      if (!response.ok) return;
      const data = (await response.json()) as { notifications: NotificationItem[]; unreadCount: number };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for unread count
  useEffect(() => {
    void fetch("/api/notifications?unread=true&limit=1")
      .then(async (response) => {
        if (!response.ok) return;
        return response.json() as Promise<{ unreadCount: number }>;
      })
      .then((data) => { if (data) setUnreadCount(data.unreadCount); })
      .catch(() => {});

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/notifications?unread=true&limit=1");
        if (!response.ok) return;
        const data = (await response.json()) as { unreadCount: number };
        setUnreadCount(data.unreadCount);
      } catch { /* silent */ }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void fetchNotifications();
  }

  async function markAllRead() {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { unreadCount: number };
      setUnreadCount(data.unreadCount);
      setNotifications((existing) => existing.map((n) => ({ ...n, read: true })));
      toast.info("All notifications marked as read.");
    } catch { /* silent */ }
  }

  async function markRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((existing) => existing.map((n) => n._id === id ? { ...n, read: true } : n));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch { /* silent */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="relative grid size-10 place-items-center"
        aria-label="Notifications"
        onClick={toggle}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden border border-stone-200 bg-[#fbf9f5] shadow-xl"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-[#91412e] hover:underline"
                >
                  <CheckCheck className="size-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <p className="p-8 text-center text-xs text-stone-500">Loading…</p>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto size-8 text-stone-300" />
                  <p className="mt-3 text-sm text-stone-500">No notifications yet</p>
                  <p className="mt-1 text-[11px] text-stone-400">We&apos;ll let you know when something happens.</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = typeIcons[notification.type] ?? Bell;
                  return (
                    <div
                      key={notification._id}
                      className={`flex gap-3 border-b border-stone-100 px-4 py-3 transition last:border-0 ${notification.read ? "opacity-60" : "bg-[#f8f3eb]"} hover:bg-[#f3eadc]`}
                      role="button"
                      tabIndex={0}
                      onClick={() => { if (!notification.read) void markRead(notification._id); }}
                      onKeyDown={(event) => { if (event.key === "Enter" && !notification.read) void markRead(notification._id); }}
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#e7ddcd] text-[#5a4e3e]">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-stone-900">{notification.title}</p>
                          <span className="shrink-0 text-[10px] text-stone-400">{timeAgo(notification.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-[1.5] text-stone-600">{notification.message}</p>
                        {notification.href && (
                          <Link
                            href={notification.href}
                            onClick={() => setOpen(false)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-[#91412e] hover:underline"
                          >
                            View details <ExternalLink className="size-2.5" />
                          </Link>
                        )}
                      </div>
                      {!notification.read && (
                        <span className="mt-2 size-2 shrink-0 rounded-full bg-[#91412e]" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
