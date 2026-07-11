import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, Send, RefreshCw, Search, Loader2,
  X, Zap, Archive, MessageCircle, Bell, BellOff
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

interface ChatSession {
  id: string;
  customer_name: string;
  customer_email: string | null;
  status: string;
  assigned_agent: string | null;
  last_message_at: string;
  created_at: string;
  unread_count?: number;
  last_message?: string;
}

interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: "customer" | "agent" | "bot";
  sender_name: string;
  message: string;
  read: boolean;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  open:     { label: "Open",     color: "text-[#39FF14]", dot: "bg-[#39FF14]" },
  waiting:  { label: "Waiting",  color: "text-yellow-400", dot: "bg-yellow-400" },
  closed:   { label: "Closed",   color: "text-gray-500",   dot: "bg-gray-500" },
  archived: { label: "Archived", color: "text-gray-600",   dot: "bg-gray-600" },
};

const QUICK_REPLIES = [
  "Thank you for contacting TRIP Mobility! How can I help you today?",
  "I'd be happy to provide more information about our e-bike models. Which one are you interested in?",
  "Our team will prepare a customized quotation for you within 24 hours.",
  "You can visit our showroom at 123 Electric Avenue, Mandaluyong City. Would you like to schedule a test ride?",
  "For fleet inquiries, we offer special pricing and dedicated support. Can I get your company details?",
];

export default function AdminChat() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<Record<string, number>>({});
  const notifEnabledRef = useRef(false);

  // ── Desktop notification setup ──
  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
      notifEnabledRef.current = Notification.permission === "granted";
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Your browser doesn't support desktop notifications");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    notifEnabledRef.current = perm === "granted";
    if (perm === "granted") {
      toast.success("Desktop notifications enabled!");
      new Notification("TRIP Admin Chat", {
        body: "You'll now receive notifications for new customer messages.",
        icon: "/favicon.svg",
      });
    } else {
      toast.error("Notification permission denied. Check your browser settings.");
    }
  };

  const sendDesktopNotification = useCallback((customerName: string, message: string) => {
    if (!notifEnabledRef.current || document.visibilityState === "visible") return;
    try {
      const notif = new Notification(`💬 ${customerName}`, {
        body: message.slice(0, 100) + (message.length > 100 ? "…" : ""),
        icon: "/favicon.svg",
        tag: "trip-chat",
        requireInteraction: false,
      });
      notif.onclick = () => { window.focus(); notif.close(); };
    } catch (e) {
      console.warn("Desktop notification failed:", e);
    }
  }, []);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const sessionsQuery = query(collection(db, "chat_sessions"), orderBy("updated_at", "desc"));
      const sessionsSnap = await getDocs(sessionsQuery);
      const enriched = [];
      for (const sessionDoc of sessionsSnap.docs) {
        const s = sessionDoc.data();
        
        // Fetch all messages for this session
        const msgsSnap = await getDocs(
          query(collection(db, "chat_messages"), where("session_id", "==", sessionDoc.id), orderBy("created_at", "asc"))
        );
        const msgs = msgsSnap.docs.map(doc => doc.data());
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const unreadCount = msgs.filter((m: any) => m.sender !== "agent" && !m.read).length;

        enriched.push({
          id: sessionDoc.id,
          customer_name: s.user_name || "Visitor",
          customer_email: s.user_email || "",
          status: s.status || "open",
          assigned_agent: s.assigned_agent || null,
          last_message_at: lastMsg ? (lastMsg.created_at instanceof Timestamp ? lastMsg.created_at.toDate().toISOString() : lastMsg.created_at) : (s.updated_at instanceof Timestamp ? s.updated_at.toDate().toISOString() : s.updated_at),
          created_at: s.created_at instanceof Timestamp ? s.created_at.toDate().toISOString() : s.created_at,
          unread_count: unreadCount,
          last_message: lastMsg ? lastMsg.message : "",
        });
      }
      
      // Fire notifications
      enriched.forEach((sess: any) => {
        const prevCount = prevUnreadRef.current[sess.id] || 0;
        const newCount = sess.unread_count || 0;
        if (newCount > prevCount && newCount > 0) {
          sendDesktopNotification(sess.customer_name, sess.last_message || "New message");
        }
      });
      prevUnreadRef.current = Object.fromEntries(enriched.map((s: any) => [s.id, s.unread_count || 0]));

      setSessions(enriched);
    } catch (e: any) {
      console.warn("fetchSessions failed:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sendDesktopNotification]);

  const fetchMessages = useCallback(async () => {
    if (!selected) return;
    try {
      const q = query(
        collection(db, "chat_messages"),
        where("session_id", "==", selected.id),
        orderBy("created_at", "asc")
      );
      const msgsSnap = await getDocs(q);
      const mapped = msgsSnap.docs.map((docSnap) => {
        const m = docSnap.data();
        return {
          id: docSnap.id,
          session_id: m.session_id,
          sender_type: m.sender === "user" ? "customer" : m.sender,
          sender_name: m.sender === "user" ? "You" : (m.sender === "bot" ? "TRIP AI" : "Agent"),
          message: m.message,
          read: m.read === 1 || m.read === true,
          created_at: m.created_at instanceof Timestamp ? m.created_at.toDate().toISOString() : m.created_at,
        };
      });
      setMessages(mapped);

      // Mark messages as read
      for (const docSnap of msgsSnap.docs) {
        const m = docSnap.data();
        if (m.sender !== "agent" && !m.read) {
          await updateDoc(docSnap.ref, { read: true });
        }
      }
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      console.warn("fetchMessages failed:", e);
    }
  }, [selected]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => fetchSessions(true), 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  useEffect(() => {
    if (!selected) return;
    setMsgLoading(true);
    fetchMessages().then(() => setMsgLoading(false));
  }, [selected, fetchMessages]);

  useEffect(() => {
    if (!selected) return;
    // Subscribe to messages changes
    const q = query(
      collection(db, "chat_messages"),
      where("session_id", "==", selected.id),
      orderBy("created_at", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map((docSnap) => {
        const m = docSnap.data();
        return {
          id: docSnap.id,
          session_id: m.session_id,
          sender_type: m.sender === "user" ? "customer" : m.sender,
          sender_name: m.sender === "user" ? "You" : (m.sender === "bot" ? "TRIP AI" : "Agent"),
          message: m.message,
          read: m.read === 1 || m.read === true,
          created_at: m.created_at instanceof Timestamp ? m.created_at.toDate().toISOString() : m.created_at,
        };
      });
      setMessages(mapped);
      fetchSessions(true);
    });

    return () => unsubscribe();
  }, [selected, fetchSessions]);

  const sendMessage = async () => {
    if (!input.trim() || !selected || sending) return;
    const msg = input.trim();
    setInput("");
    setSending(true);
    try {
      await addDoc(collection(db, "chat_messages"), {
        session_id: selected.id,
        sender: "agent",
        message: msg,
        read: true,
        created_at: Timestamp.now()
      });
      await updateDoc(doc(db, "chat_sessions", selected.id), {
        assigned_agent: user?.username || "Agent",
        updated_at: Timestamp.now()
      });
      await fetchMessages();
    } catch (e) {
      console.warn("sendMessage failed:", e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const updateStatus = async (sessionId: string, status: string) => {
    try {
      await updateDoc(doc(db, "chat_sessions", sessionId), {
        status,
        updated_at: Timestamp.now()
      });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s));
      if (selected?.id === sessionId) setSelected(s => s ? { ...s, status } : null);
      toast.success(`Chat marked as ${status}`);
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  };

  const filtered = sessions.filter(s => {
    const matchSearch = !search || s.customer_name.toLowerCase().includes(search.toLowerCase()) || s.customer_email?.toLowerCase().includes(search.toLowerCase()) || false;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalUnread = sessions.reduce((s, sess) => s + (sess.unread_count || 0), 0);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };

  const formatMsgTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white flex items-center gap-3">
            Live Chat Inbox
            {totalUnread > 0 && (
              <span className="px-2.5 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-black rounded-full animate-pulse">
                {totalUnread} new
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{sessions.filter(s => s.status === "open").length} open · {sessions.length} total conversations</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Desktop Notification Toggle */}
          {"Notification" in window && (
            <button
              onClick={notifPermission === "granted" ? undefined : requestNotificationPermission}
              className={`flex items-center gap-2 px-4 py-2.5 glass rounded-xl border text-xs font-semibold transition-all ${
                notifPermission === "granted"
                  ? "border-[#39FF14]/30 text-[#39FF14] cursor-default"
                  : notifPermission === "denied"
                  ? "border-red-500/30 text-red-400 cursor-not-allowed"
                  : "border-white/10 text-gray-400 hover:text-white cursor-pointer"
              }`}
              title={notifPermission === "denied" ? "Notification permission blocked in browser settings" : ""}
            >
              {notifPermission === "granted"
                ? <><Bell className="w-3.5 h-3.5" />Notifications On</>
                : notifPermission === "denied"
                ? <><BellOff className="w-3.5 h-3.5" />Notifications Blocked</>
                : <><Bell className="w-3.5 h-3.5" />Enable Notifications</>
              }
            </button>
          )}
          <button onClick={() => fetchSessions()} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>
      </div>

      {/* Notification Banner (if not set) */}
      {notifPermission === "default" && (
        <div className="flex items-center gap-3 px-4 py-3 glass rounded-xl border border-yellow-500/20 bg-yellow-500/5 mb-4">
          <Bell className="w-4 h-4 text-yellow-400 shrink-0" />
          <p className="text-xs text-gray-300 flex-1">Enable desktop notifications to get alerted when customers send new messages, even when this tab is in the background.</p>
          <button onClick={requestNotificationPermission} className="shrink-0 px-3 py-1.5 bg-yellow-500 text-[#0A0A0A] rounded-lg text-xs font-bold hover:bg-yellow-400 transition-all">
            Enable
          </button>
        </div>
      )}

      <div className="flex gap-5 flex-1 overflow-hidden">
        {/* Sessions Panel */}
        <div className="w-80 shrink-0 flex flex-col">
          <div className="flex flex-col gap-2 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/30 transition-all" style={{ background: "#111" }} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {["all", "open", "waiting", "closed"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all capitalize ${filterStatus === s ? "bg-[#39FF14]/20 border border-[#39FF14]/40 text-[#39FF14]" : "bg-white/3 border border-white/8 text-gray-500 hover:text-white"}`}>
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loading && sessions.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No conversations</p>
              </div>
            ) : filtered.map(s => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.open;
              const isSelected = selected?.id === s.id;
              return (
                <div key={s.id} onClick={() => setSelected(s)}
                  className={`glass rounded-xl border p-4 cursor-pointer transition-all ${isSelected ? "border-[#39FF14]/40 bg-[#39FF14]/5" : "border-white/5 hover:border-white/10"}`}>
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-bold text-white text-sm">
                        {(s.customer_name || "?")[0]?.toUpperCase()}
                      </div>
                      {(s.unread_count || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#39FF14] text-[#0A0A0A] text-[9px] font-black flex items-center justify-center">{s.unread_count}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="font-semibold text-white text-sm truncate">{s.customer_name}</p>
                        <span className="text-[10px] text-gray-600 shrink-0">{formatTime(s.last_message_at)}</span>
                      </div>
                      {s.customer_email && <p className="text-[10px] text-gray-500 truncate mb-1">{s.customer_email}</p>}
                      <p className="text-xs text-gray-500 line-clamp-1">{s.last_message || "No messages yet"}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col glass rounded-xl border border-white/5 overflow-hidden min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-[#39FF14]/8 border border-[#39FF14]/15 flex items-center justify-center mb-5">
                <MessageSquare className="w-10 h-10 text-[#39FF14]/40" />
              </div>
              <h3 className="font-orbitron font-bold text-xl text-white mb-2">Select a Conversation</h3>
              <p className="text-gray-500 text-sm max-w-xs mb-6">Choose a chat session from the left panel to view messages and reply to customers in real-time.</p>
              {notifPermission !== "granted" && "Notification" in window && (
                <button onClick={requestNotificationPermission} className="flex items-center gap-2 px-5 py-3 glass rounded-xl border border-yellow-500/30 text-yellow-400 text-sm hover:bg-yellow-500/10 transition-all">
                  <Bell className="w-4 h-4" />Enable Desktop Notifications
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-white/8 bg-white/2 shrink-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-bold text-white text-sm">
                    {(selected.customer_name || "?")[0]?.toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0D0D0D] ${STATUS_CONFIG[selected.status]?.dot || "bg-gray-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{selected.customer_name}</p>
                  <p className="text-xs text-gray-500">{selected.customer_email || "Guest visitor"} · Started {formatTime(selected.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {["open", "waiting", "closed"].filter(s => s !== selected.status).map(s => (
                    <button key={s} onClick={() => updateStatus(selected.id, s)}
                      className="px-3 py-1.5 glass rounded-lg border border-white/10 text-xs font-semibold text-gray-400 hover:text-white transition-all capitalize">
                      Mark {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {msgLoading && messages.length === 0 ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" /></div>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.sender_type === "agent" ? "flex-row-reverse" : "flex-row"}`}>
                    {msg.sender_type !== "agent" && (
                      <div className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-auto">
                        {msg.sender_type === "bot" ? "🤖" : (msg.sender_name || "?")[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className={`max-w-[70%] rounded-xl px-4 py-3 ${
                      msg.sender_type === "agent"
                        ? "bg-[#39FF14] text-[#0A0A0A] rounded-br-sm"
                        : msg.sender_type === "bot"
                        ? "bg-white/5 border border-white/8 text-gray-300 rounded-bl-sm"
                        : "bg-white/8 border border-white/10 text-white rounded-bl-sm"
                    }`}>
                      {msg.sender_type !== "agent" && (
                        <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${msg.sender_type === "bot" ? "text-gray-400" : "text-[#39FF14]"}`}>
                          {msg.sender_name}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1.5 ${msg.sender_type === "agent" ? "text-[#0A0A0A]/60 text-right" : "text-gray-500"}`}>
                        {formatMsgTime(msg.created_at)}
                        {msg.sender_type === "agent" && msg.read && <span className="ml-1">✓✓</span>}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              <div className="px-4 py-2 border-t border-white/5 overflow-x-auto scrollbar-none">
                <div className="flex gap-2">
                  {QUICK_REPLIES.map((qr, i) => (
                    <button key={i} onClick={() => setInput(qr)}
                      className="shrink-0 px-3 py-1.5 bg-white/4 border border-white/8 rounded-lg text-xs text-gray-400 hover:text-white hover:border-[#39FF14]/30 transition-all max-w-48 truncate">
                      {qr.slice(0, 40)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              {selected.status !== "closed" && (
                <div className="px-4 py-4 border-t border-white/8 shrink-0">
                  <div className="flex gap-3 items-end">
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your reply... (Enter to send)"
                      rows={2}
                      className="flex-1 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/50 resize-none transition-all"
                      style={{ background: "#1A1A1A" }}
                    />
                    <button onClick={sendMessage} disabled={!input.trim() || sending}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#39FF14] text-[#0A0A0A] hover:bg-[#4FFF2A] disabled:opacity-40 transition-all shrink-0">
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
