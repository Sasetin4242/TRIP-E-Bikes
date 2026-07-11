import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, X, Send, Minimize2, Maximize2, Zap,
  Loader2, CheckCircle, Bot, User, Clock, Star
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, updateDoc, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

function getLocalBotResponse(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes("models") || msg.includes("offer") || msg.includes("catalog") || msg.includes("bikes") || msg.includes("bike") || msg.includes("product")) {
    if (msg.includes("cargo")) {
      return "The **TRIP Cargo Pro** (₱65,000) is built for delivery and last-mile logistics. It has a dual 48V 11.6Ah battery (100–120 km range), 500W motor, 45 km/h top speed, and can carry up to 180 kg. It comes with a heavy-duty rear rack.";
    }
    if (msg.includes("fold") || msg.includes("commuter") || msg.includes("urban")) {
      return "The **TRIP Fold X** (₱57,000) is our aerospace aluminum folding e-bike. It folds in 5 seconds, weighs 24 kg, offers a 40–50 km range, and reaches 40 km/h. Perfect for multi-modal transport and urban commuting!";
    }
    if (msg.includes("ranger") || msg.includes("mountain") || msg.includes("off-road")) {
      return "The **TRIP Ranger 750** (₱59,000) is our mountain/off-road fat-tire e-bike. It features a high-torque 750W motor, full suspension fork, hydraulic disc brakes, and reaches up to 50 km/h.";
    }
    return "We offer three premium e-bike models:\n\n1. **TRIP Cargo Pro** (₱65,000) - For delivery and last-mile courier services.\n2. **TRIP Fold X** (₱57,000) - Folding, lightweight urban commuter.\n3. **TRIP Ranger 750** (₱59,000) - All-terrain mountain e-bike.\n\nWhich one are you most interested in?";
  }

  if (msg.includes("quote") || msg.includes("quotation")) {
    return "You can request a custom quotation directly on our website! Just close this chat window and click the **Get a Quote** button in the header navigation or the products section to enter your specifications.";
  }

  if (msg.includes("service") || msg.includes("center") || msg.includes("repair") || msg.includes("mandaluyong") || msg.includes("location") || msg.includes("store")) {
    return "We have 6 nationwide service centers:\n\n* **Mandaluyong City**: 123 Electric Avenue\n* **Quezon City**: 456 E-Mobility Blvd\n* **Cebu City**: 789 Green Transport Hub\n* **Davao City**: 321 Clean Energy Park\n* **Iloilo City**: 654 Eco Transport Zone\n* **Pampanga (Clark)**: 987 Angeles City Tech Park\n\nYou can book a service appointment online on our Services page.";
  }

  if (msg.includes("warranty")) {
    return "TRIP E-Bikes come with a premium warranty:\n\n* **Frame**: 3 years\n* **Motor & Electrical**: 1 year\n* **Battery**: 1 year\n* **Components & Brakes**: 6 months";
  }

  if (msg.includes("fleet") || msg.includes("bulk") || msg.includes("business") || msg.includes("corporate")) {
    return "For fleet or corporate inquiries, we offer attractive volume discounts for 5+ units. Please send your requirements through our Quotation form or email us at **sales@tripmobility.ph**!";
  }

  if (msg.includes("financing") || msg.includes("payment") || msg.includes("installment")) {
    return "Yes, we support flexible financing options and payment plans for both retail and corporate customers. Please contact our sales team at **+63 2 8123 4567** or request a quote for more details.";
  }

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return "Hello! How can I help you today? Ask me about our e-bike models, service center locations, or warranty coverage.";
  }

  return "Thanks for your message! I'm here to help. You can ask me about e-bike specs (Cargo Pro, Fold X, Ranger 750), pricing, store locations, or how to get a custom quote.";
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

const BOT_WELCOME = "👋 Hi! Welcome to **TRIP Mobility** support. I'm your AI assistant — ask me anything about our e-bikes, pricing, or service!\n\n⚡ I can answer immediately, and a specialist can join if you need further help.";

const QUICK_ACTIONS = [
  { label: "🛵 View E-Bikes", message: "What e-bike models do you offer and what are the prices?" },
  { label: "💰 Get a Quote", message: "How do I request a custom quotation?" },
  { label: "🔧 Service Center", message: "Where are your service centers located?" },
  { label: "🏢 Fleet Inquiry", message: "I'm interested in bulk/fleet pricing for my business" },
];

// Conversation history for AI context (last N turns)
interface ConvTurn {
  role: "user" | "assistant";
  content: string;
}

export default function LiveChat() {
  const { customer } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [agentOnline] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [aiTyping, setAiTyping] = useState(false);
  const [convHistory, setConvHistory] = useState<ConvTurn[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check if chat is enabled
  useEffect(() => {
    getDoc(doc(db, "system_settings", "chat_enabled"))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const val = docSnap.data().value;
          setChatEnabled(val === "true" || val === true || val === "1");
        }
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { if (open && !minimized) scrollToBottom(); }, [messages, open, minimized]);

  // Realtime subscription setup
  useEffect(() => {
    if (!sessionId) return;

    const q = query(
      collection(db, "chat_messages"),
      where("session_id", "==", sessionId),
      orderBy("created_at", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((docSnap) => {
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
      setMessages(msgs);
      if (!open || minimized) {
        const unread = msgs.filter((m: any) => m.sender_type !== "customer" && !m.read).length;
        setUnreadCount(unread);
      }
    }, (err) => {
      console.warn("Messages snapshot error:", err);
    });

    return () => unsubscribe();
  }, [sessionId, open, minimized]);

  useEffect(() => {
    if (open && !minimized && sessionId) {
      setUnreadCount(0);
      // Mark messages as read by updating docs
      getDocs(
        query(
          collection(db, "chat_messages"),
          where("session_id", "==", sessionId),
          where("sender", "!=", "user")
        )
      ).then((snap) => {
        snap.forEach((docSnap) => {
          updateDoc(docSnap.ref, { read: true });
        });
      });
    }
  }, [open, minimized, sessionId]);

  const startSession = async () => {
    const name = customer?.username || guestName.trim() || "Visitor";
    const email = customer?.email || guestEmail.trim() || null;
    const generatedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    try {
      await setDoc(doc(db, "chat_sessions", generatedId), {
        user_name: name,
        user_email: email,
        status: "active",
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
      
      setSessionId(generatedId);
      setStarted(true);
      setShowQuickActions(true);
      
      await addDoc(collection(db, "chat_messages"), {
        session_id: generatedId,
        sender: "bot",
        message: BOT_WELCOME,
        read: false,
        created_at: Timestamp.now()
      });
    } catch (err) {
      console.error("Failed to start chat session:", err);
    }
  };

  const getAIResponse = async (userMessage: string, history: ConvTurn[]) => {
    setAiTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 800)); // Simulate networking delay
    setAiTyping(false);
    return getLocalBotResponse(userMessage);
  };

  const sendMessage = async (msgOverride?: string) => {
    const msg = (msgOverride ?? input).trim();
    if (!msg || !sessionId || sending) return;
    setInput("");
    setShowQuickActions(false);
    setSending(true);

    try {
      // Insert customer message
      await addDoc(collection(db, "chat_messages"), {
        session_id: sessionId,
        sender: "user",
        message: msg,
        read: false,
        created_at: Timestamp.now()
      });
      
      // Update session's updated_at
      await updateDoc(doc(db, "chat_sessions", sessionId), {
        updated_at: Timestamp.now()
      });
      
      setSending(false);

      // Build conversation history for AI (last 6 turns)
      const currentHistory = [...convHistory, { role: "user" as const, content: msg }];
      const trimmedHistory = currentHistory.slice(-12); // last 6 exchanges

      // Get AI response
      const aiReply = await getAIResponse(msg, trimmedHistory.slice(0, -1));
      if (aiReply) {
        await addDoc(collection(db, "chat_messages"), {
          session_id: sessionId,
          sender: "bot",
          message: aiReply,
          read: false,
          created_at: Timestamp.now()
        });
        setConvHistory([...trimmedHistory, { role: "assistant" as const, content: aiReply }]);
      }
    } catch (err) {
      console.error("Failed to send chat message:", err);
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });

  const renderMessageText = (text: string) => {
    return text.split("\n").map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: bold }} className="block" />;
    });
  };

  if (!chatEnabled) return null;

  return (
    <>
      {/* Toggle Button */}
      {!open && (
        <button onClick={handleOpen}
          className="fixed bottom-6 right-6 z-[150] w-14 h-14 rounded-full bg-[#39FF14] flex items-center justify-center hover:scale-110 transition-all duration-300"
          style={{ boxShadow: "0 0 30px rgba(57,255,20,0.5), 0 8px 32px rgba(0,0,0,0.4)" }}>
          <MessageCircle className="w-6 h-6 text-[#0A0A0A]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-black animate-bounce">{unreadCount}</span>
          )}
          <div className="absolute inset-0 rounded-full bg-[#39FF14] animate-ping opacity-20" />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div
          className={`fixed z-[150] flex flex-col rounded-2xl overflow-hidden transition-all duration-300 ease-out ${minimized ? "bottom-6 right-6 w-80 h-[60px]" : "bottom-6 right-6 w-[400px] h-[600px] max-h-[90vh]"}`}
          style={{ background: "linear-gradient(165deg, #161616 0%, #0F0F0F 100%)", boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(57,255,20,0.12)", backdropFilter: "blur(20px)" }}>

          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8 shrink-0 cursor-pointer select-none"
            style={{ background: "linear-gradient(135deg, rgba(57,255,20,0.06) 0%, transparent 100%)" }}
            onClick={() => setMinimized(!minimized)}>
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#39FF14]/15 border border-[#39FF14]/25 flex items-center justify-center shadow-[0_0_12px_rgba(57,255,20,0.2)]">
                <Zap className="w-5 h-5 text-[#39FF14]" fill="currentColor" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0F0F0F] bg-[#39FF14] shadow-[0_0_6px_rgba(57,255,20,0.8)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-orbitron font-bold text-sm text-white">TRIP AI Support</p>
              <p className="text-[10px] flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
                <span className="text-[#39FF14]">AI-Powered · Instant Answers</span>
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && minimized && (
                <span className="w-5 h-5 bg-[#39FF14] rounded-full flex items-center justify-center text-[#0A0A0A] text-[10px] font-black">{unreadCount}</span>
              )}
              <button onClick={e => { e.stopPropagation(); setMinimized(!minimized); }} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors">
                {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={e => { e.stopPropagation(); setOpen(false); }} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
                {!started ? (
                  /* Start Screen */
                  <div className="flex flex-col items-center justify-center h-full text-center py-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#39FF14]/15 to-[#00FFFF]/8 border border-[#39FF14]/20 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(57,255,20,0.15)]">
                      <Bot className="w-10 h-10 text-[#39FF14]" />
                    </div>
                    <h3 className="font-orbitron font-bold text-lg text-white mb-1">TRIP AI Assistant</h3>
                    <p className="text-gray-400 text-xs mb-5 max-w-52 leading-relaxed">
                      Powered by AI — get instant answers about our e-bikes, pricing, and service centers.
                    </p>

                    <div className="flex gap-4 mb-6">
                      {[
                        { icon: Bot, label: "AI-Powered", sub: "instant" },
                        { icon: Star, label: "4.9/5", sub: "rating" },
                        { icon: CheckCircle, label: "Always", sub: "available" },
                      ].map((s, i) => (
                        <div key={i} className="text-center">
                          <s.icon className="w-4 h-4 text-[#39FF14] mx-auto mb-1" />
                          <p className="text-xs font-bold text-white">{s.label}</p>
                          <p className="text-[10px] text-gray-600">{s.sub}</p>
                        </div>
                      ))}
                    </div>

                    {!customer && (
                      <div className="w-full space-y-2.5 mb-4">
                        <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your name (optional)"
                          className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/50 transition-all"
                          style={{ background: "#1A1A1A" }} />
                        <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Email (optional — for follow-up)"
                          className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/50 transition-all"
                          style={{ background: "#1A1A1A" }} />
                      </div>
                    )}
                    {customer && (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#39FF14]/5 border border-[#39FF14]/15 rounded-xl mb-4 w-full">
                        <div className="w-7 h-7 rounded-full bg-[#39FF14]/15 flex items-center justify-center font-bold text-[#39FF14] text-xs">{(customer.username || "U")[0].toUpperCase()}</div>
                        <div className="text-left">
                          <p className="text-xs text-white font-semibold">{customer.username}</p>
                          <p className="text-[10px] text-gray-500">Logged in · Priority support</p>
                        </div>
                        <CheckCircle className="w-4 h-4 text-[#39FF14] ml-auto" />
                      </div>
                    )}
                    <button onClick={startSession} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                      <Bot className="w-4 h-4" />Chat with AI Assistant
                    </button>
                    <p className="text-[10px] text-gray-600 mt-3">Powered by OnSpace AI · TRIP Mobility</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isCustomer = msg.sender_type === "customer";
                      const isBot = msg.sender_type === "bot";
                      const isAgent = msg.sender_type === "agent";
                      const showAvatar = idx === 0 || messages[idx - 1].sender_type !== msg.sender_type;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isCustomer ? "flex-row-reverse" : "flex-row"} ${!showAvatar ? (isCustomer ? "pr-10" : "pl-10") : ""}`}>
                          {!isCustomer && showAvatar && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-auto ${isBot ? "bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14]" : "bg-white/8 border border-white/15 text-white"}`}>
                              {isBot ? <Bot className="w-4 h-4" /> : (msg.sender_name || "?")[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="max-w-[78%] space-y-1">
                            {showAvatar && !isCustomer && (
                              <p className="text-[10px] text-gray-500 pl-1">
                                {isBot ? "TRIP AI" : msg.sender_name}
                                {isBot && <span className="ml-1.5 px-1.5 py-0.5 bg-[#39FF14]/10 text-[#39FF14] rounded text-[9px] font-bold border border-[#39FF14]/20">AI</span>}
                              </p>
                            )}
                            <div className={`rounded-2xl px-4 py-3 ${isCustomer
                              ? "bg-[#39FF14] text-[#0A0A0A] rounded-br-md"
                              : isBot
                              ? "bg-white/6 border border-white/10 text-gray-200 rounded-bl-md"
                              : "bg-gradient-to-br from-[#39FF14]/12 to-[#00FFFF]/8 border border-[#39FF14]/20 text-white rounded-bl-md"
                            }`} style={{ boxShadow: isCustomer ? "0 4px 12px rgba(57,255,20,0.2)" : isAgent ? "0 4px 12px rgba(57,255,20,0.1)" : undefined }}>
                              <div className="text-sm leading-relaxed space-y-0.5">
                                {renderMessageText(msg.message)}
                              </div>
                              <p className={`text-[9px] mt-1.5 ${isCustomer ? "text-[#0A0A0A]/60 text-right" : "text-gray-600"}`}>
                                {formatTime(msg.created_at)}
                                {isCustomer && <span className="ml-1">✓✓</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* AI Typing Indicator */}
                    {aiTyping && (
                      <div className="flex gap-2 items-end">
                        <div className="w-8 h-8 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center text-[#39FF14] shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-white/6 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Quick Actions */}
                {started && showQuickActions && messages.length <= 2 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-500 text-center">Quick questions</p>
                    {QUICK_ACTIONS.map((action, i) => (
                      <button key={i} onClick={() => { sendMessage(action.message); setShowQuickActions(false); }}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-white/10 text-xs text-gray-300 hover:border-[#39FF14]/30 hover:text-white hover:bg-[#39FF14]/5 transition-all"
                        style={{ background: "rgba(255,255,255,0.03)" }}>
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Satisfaction rating */}
                {started && messages.some(m => m.sender_type === "bot" && m.message !== BOT_WELCOME) && !satisfaction && messages.length > 4 && (
                  <div className="glass rounded-xl border border-white/8 p-3 text-center">
                    <p className="text-xs text-gray-400 mb-2">Was this helpful?</p>
                    <div className="flex justify-center gap-2">
                      {["😞", "😐", "🙂", "😊", "😍"].map((emoji, n) => (
                        <button key={n} onClick={() => { setSatisfaction(n + 1); }} className="text-lg hover:scale-125 transition-transform">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {started && (
                <div className="p-3 border-t border-white/8 shrink-0" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about pricing, specs, service..."
                      rows={1}
                      className="flex-1 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/40 resize-none transition-all scrollbar-none"
                      style={{ background: "#1A1A1A", maxHeight: "80px" }}
                    />
                    <button onClick={() => sendMessage()} disabled={!input.trim() || sending || aiTyping}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#39FF14] text-[#0A0A0A] hover:bg-white disabled:opacity-40 transition-all shrink-0 active:scale-95"
                      style={{ boxShadow: "0 0 12px rgba(57,255,20,0.4)" }}>
                      {sending || aiTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-700 text-center mt-1.5">TRIP AI · Powered by OnSpace AI</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
