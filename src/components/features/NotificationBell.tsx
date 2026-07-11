import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell, BellRing, X, Gift, MessageSquare,
  FileText, Info, Check, Trash2, Loader2
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  Timestamp
} from "firebase/firestore";
import { toast } from "sonner";

interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  expires_at?: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  quotation_update: { icon: FileText,     color: "text-blue-400",   bg: "bg-blue-400/10" },
  loyalty_points:  { icon: Gift,          color: "text-yellow-400", bg: "bg-yellow-400/10" },
  message:         { icon: MessageSquare, color: "text-[#39FF14]",  bg: "bg-[#39FF14]/10" },
  info:            { icon: Info,          color: "text-gray-400",   bg: "bg-white/5" },
};

interface NotificationBellProps {
  isAdmin?: boolean;
}

export default function NotificationBell({ isAdmin = false }: NotificationBellProps) {
  const { customer } = useCustomerAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (isAdmin) {
      try {
        const querySnapshot = await getDocs(
          query(collection(db, "notifications"), orderBy("created_at", "desc"))
        );
        setNotifications(querySnapshot.docs.map((docSnap) => {
          const n = docSnap.data();
          return {
            id: docSnap.id,
            type: n.type || "info",
            title: n.title || "Notification",
            body: n.message || n.body || "",
            read: !!n.read,
            metadata: n.metadata || {},
            created_at: n.created_at instanceof Timestamp ? n.created_at.toDate().toISOString() : n.created_at,
          };
        }));
      } catch (e) {
        console.warn("Failed to fetch admin notifications:", e);
      }
    } else {
      // Fetch customer notifications from API (which queries Firestore under the hood)
      if (!customer) return;
      const { data } = await apiClient.get(`/notifications.php?email=${customer.email}`);
      if (data && Array.isArray(data)) {
        setNotifications(data.map((n: any) => ({
          id: String(n.id),
          type: n.type || "info",
          title: n.title || "Notification",
          body: n.message || n.body || "",
          read: !!n.read,
          metadata: n.metadata || {},
          created_at: n.created_at,
          expires_at: n.expires_at,
        })));
      }
    }
  }, [customer, isAdmin]);

  // Set up realtime notification listener for Admin
  useEffect(() => {
    if (!isAdmin) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }

    const q = query(collection(db, "notifications"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((docSnap) => {
        const n = docSnap.data();
        return {
          id: docSnap.id,
          type: n.type || "info",
          title: n.title || "Notification",
          body: n.message || n.body || "",
          read: !!n.read,
          metadata: n.metadata || {},
          created_at: n.created_at instanceof Timestamp ? n.created_at.toDate().toISOString() : n.created_at,
        };
      });
      
      // Toast on new unread notifications
      if (notifications.length > 0 && notifs.length > notifications.length) {
        const newNotif = notifs[0];
        if (!newNotif.read) {
          toast.info(`New Alert: ${newNotif.title || "New notification"}`);
        }
      }
      setNotifications(notifs);
    }, (err) => {
      console.warn("Notifications snapshot error:", err);
    });

    return () => unsubscribe();
  }, [isAdmin, fetchNotifications, notifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    try {
      if (isAdmin) {
        await updateDoc(doc(db, "notifications", id), { read: true });
      } else {
        await apiClient.put(`/notifications.php?id=${id}`, { read: true });
      }
    } catch (e) {
      console.warn("Failed to mark read:", e);
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    setLoading(true);
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      try {
        if (isAdmin) {
          const batch = writeBatch(db);
          unreadIds.forEach((id) => {
            batch.update(doc(db, "notifications", id), { read: true });
          });
          await batch.commit();
        } else if (customer) {
          await apiClient.post("/notifications.php?action=mark_all_read", { email: customer.email });
        }
      } catch (e) {
        console.warn("Failed to mark all read:", e);
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setLoading(false);
  };

  const deleteNotification = async (id: string) => {
    try {
      if (isAdmin) {
        await deleteDoc(doc(db, "notifications", id));
      } else {
        await apiClient.delete(`/notifications.php?id=${id}`);
      }
    } catch (e) {
      console.warn("Failed to delete notification:", e);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  // If not admin and no customer session, don't render
  if (!isAdmin && !customer) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-[#39FF14]/30 hover:bg-white/5 transition-all"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-[#39FF14] animate-[wiggle_1s_ease-in-out_infinite]" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] px-1 bg-[#39FF14] rounded-full flex items-center justify-center text-[#0A0A0A] text-[9px] font-black leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 z-[200] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: "#0D0D0D" }}
        >
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#39FF14] to-[#00FFFF]" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#39FF14]" />
              <p className="font-semibold text-white text-sm">Notifications</p>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#39FF14]/20 text-[#39FF14] text-[10px] font-bold rounded-full border border-[#39FF14]/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-[10px] text-gray-500 hover:text-[#39FF14] transition-colors flex items-center gap-1"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-600 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-600 mt-1">We'll notify you when updates occur</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && markRead(notif.id)}
                    className={`flex items-start gap-3 px-4 py-3.5 border-b border-white/5 cursor-pointer transition-all hover:bg-white/3 group ${
                      !notif.read ? "bg-white/2" : ""
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold ${notif.read ? "text-gray-400" : "text-white"}`}>
                          {notif.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className={`text-xs mt-0.5 leading-relaxed ${notif.read ? "text-gray-600" : "text-gray-400"}`}>
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1.5">{formatTime(notif.created_at)}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-[#39FF14] mt-1.5 shrink-0 shadow-[0_0_6px_rgba(57,255,20,0.6)]" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-white/8 text-center">
            <p className="text-[10px] text-gray-600">Real-time alerts active</p>
          </div>
        </div>
      )}
    </div>
  );
}
