import { auth as fbAuth, db as fbDb, storage as fbStorage } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Helper to convert Firebase doc to Supabase-style data
function mapDoc(docSnap: any) {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  const res = { id: docSnap.id, ...data };
  // Convert timestamps to string dates
  for (const [key, value] of Object.entries(res)) {
    if (value instanceof Timestamp) {
      res[key] = value.toDate().toISOString();
    }
  }
  return res;
}

// Global active auth listener subscriptions
const authListeners = new Set<(event: string, session: any) => void>();

onAuthStateChanged(fbAuth, async (fbUser) => {
  let session = null;
  if (fbUser) {
    let role = fbUser.email?.endsWith("@tripmobility.ph") ? "admin" : "customer";
    let username = fbUser.displayName || fbUser.email?.split("@")[0] || "";
    let avatar = fbUser.photoURL || "";

    try {
      const profileSnap = await getDoc(doc(fbDb, "profiles", fbUser.uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        if (data.role) role = data.role;
        if (data.username) username = data.username;
        if (data.avatar) avatar = data.avatar;
      }
    } catch (e) {
      console.warn("Auth state change profile load failed:", e);
    }

    session = {
      user: {
        id: fbUser.uid,
        email: fbUser.email,
        user_metadata: {
          username,
          avatar,
          role
        }
      }
    };
  }

  authListeners.forEach((listener) => {
    listener(fbUser ? "SIGNED_IN" : "SIGNED_OUT", session);
  });
});

// Emulated OTP cache
const otpCache = new Map<string, string>();

// Local AI response generator for chat bots
function getLocalBotResponse(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("models") || msg.includes("offer") || msg.includes("catalog") || msg.includes("bikes") || msg.includes("bike")) {
    return "We offer three premium e-bike models:\n\n1. **TRIP Cargo Pro** (₱65,000) - For delivery and last-mile courier services.\n2. **TRIP Fold X** (₱57,000) - Folding, lightweight urban commuter.\n3. **TRIP Ranger 750** (₱59,000) - All-terrain mountain e-bike.";
  }
  if (msg.includes("quote") || msg.includes("quotation")) {
    return "You can request a custom quotation directly on our website! Click the **Get a Quote** button to submit your specs.";
  }
  if (msg.includes("service") || msg.includes("center") || msg.includes("location")) {
    return "We have service centers in Mandaluyong City, Quezon City, Cebu City, Davao City, Iloilo City, and Pampanga (Clark).";
  }
  return "Thanks for reaching out! A specialist will get back to you shortly.";
}

// Unified Mock Supabase Client delegating to Firebase
export const supabase = {
  auth: {
    async getSession() {
      const fbUser = fbAuth.currentUser;
      if (!fbUser) return { data: { session: null }, error: null };
      
      let role = fbUser.email?.endsWith("@tripmobility.ph") ? "admin" : "customer";
      let username = fbUser.displayName || fbUser.email?.split("@")[0] || "";
      let avatar = fbUser.photoURL || "";

      try {
        const profileSnap = await getDoc(doc(fbDb, "profiles", fbUser.uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.role) role = data.role;
          if (data.username) username = data.username;
          if (data.avatar) avatar = data.avatar;
        }
      } catch (e) {}

      return {
        data: {
          session: {
            user: {
              id: fbUser.uid,
              email: fbUser.email,
              user_metadata: {
                username,
                avatar,
                role
              }
            }
          }
        },
        error: null
      };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.add(callback);
      // Trigger initial call
      this.getSession().then(({ data: { session } }) => {
        callback(session ? "INITIAL_SESSION" : "SIGNED_OUT", session);
      });
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            }
          }
        }
      };
    },

    async signInWithOtp({ email }: { email: string }) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      otpCache.set(email.trim().toLowerCase(), code);
      console.log(`[Firebase OTP Emulation] Code for ${email}: ${code}`);
      toast.success(`Verification code sent! (Emulated Code: ${code})`);
      return { data: {}, error: null };
    },

    async verifyOtp({ email, token }: { email: string, token: string }) {
      const cached = otpCache.get(email.trim().toLowerCase());
      if (!cached || cached !== token.trim()) {
        return { data: { user: null }, error: { message: "Invalid or expired OTP code." } };
      }
      // Create a temporary user or sign in if already exists
      try {
        const userCredential = await createUserWithEmailAndPassword(fbAuth, email.trim(), "TempPassword123!");
        return { data: { user: userCredential.user }, error: null };
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          const userCredential = await signInWithEmailAndPassword(fbAuth, email.trim(), "TempPassword123!");
          return { data: { user: userCredential.user }, error: null };
        }
        return { data: { user: null }, error: err };
      }
    },

    async signInWithPassword({ email, password }: any) {
      try {
        const res = await signInWithEmailAndPassword(fbAuth, email, password);
        return { data: { user: res.user }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },

    async updateUser({ password, data }: any) {
      const user = fbAuth.currentUser;
      if (!user) return { data: { user: null }, error: { message: "No active user session." } };
      
      try {
        if (data) {
          await setDoc(doc(fbDb, "profiles", user.uid), {
            ...data,
            updated_at: Timestamp.now()
          }, { merge: true });
        }
        return { data: { user }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },

    async signOut() {
      try {
        await fbSignOut(fbAuth);
        return { error: null };
      } catch (err: any) {
        return { error: { message: err.message } };
      }
    }
  },

  storage: {
    from(bucketName: string) {
      return {
        async upload(filePath: string, file: File, options?: any) {
          try {
            const storageRef = ref(fbStorage, `${bucketName}/${filePath}`);
            await uploadBytes(storageRef, file);
            return { data: { path: filePath }, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        },

        getPublicUrl(filePath: string) {
          // In Firebase, we can construct the direct URL structure or get the direct download URL
          // But since getPublicUrl in Supabase is synchronous, we return a predicted Firebase Storage URL pattern
          // or a helper that maps to the direct download.
          const bucket = fbStorage.app.options.storageBucket;
          const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(bucketName + '/' + filePath)}?alt=media`;
          return { data: { publicUrl } };
        }
      };
    }
  },

  from(tableName: string) {
    const colRef = collection(fbDb, tableName);
    let firestoreQuery = query(colRef);
    let filters: Array<{ field: string; op: any; value: any }> = [];
    let sortField: string | null = null;
    let sortDirection: "asc" | "desc" = "asc";

    const builder = {
      select(selectStr?: string) {
        // Handled dynamically by fetch/execution methods
        return this;
      },

      eq(field: string, value: any) {
        filters.push({ field, op: "==", value });
        return this;
      },

      neq(field: string, value: any) {
        filters.push({ field, op: "!=", value });
        return this;
      },

      in(field: string, values: any[]) {
        filters.push({ field, op: "in", value: values });
        return this;
      },

      order(field: string, options?: { ascending?: boolean }) {
        sortField = field;
        sortDirection = options?.ascending ? "asc" : "desc";
        return this;
      },

      single() {
        return this.then().then((res: any) => {
          if (res.error) return { data: null, error: res.error };
          return { data: res.data && res.data.length > 0 ? res.data[0] : null, error: null };
        });
      },

      async then() {
        try {
          let q = query(colRef);
          filters.forEach((f) => {
            q = query(q, where(f.field, f.op, f.value));
          });
          if (sortField) {
            q = query(q, orderBy(sortField, sortDirection));
          }
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(mapDoc);
          return { data, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },

      async insert(body: any) {
        try {
          const docs = Array.isArray(body) ? body : [body];
          const results = [];
          for (const item of docs) {
            const payload = { ...item, created_at: Timestamp.now(), updated_at: Timestamp.now() };
            const docRef = await addDoc(colRef, payload);
            const docSnap = await getDoc(docRef);
            results.push(mapDoc(docSnap));
          }
          return { data: results, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },

      async update(body: any) {
        try {
          let q = query(colRef);
          filters.forEach((f) => {
            q = query(q, where(f.field, f.op, f.value));
          });
          const snapshot = await getDocs(q);
          
          const batch = writeBatch(fbDb);
          const results: any[] = [];
          snapshot.docs.forEach((docSnap) => {
            const payload = { ...body, updated_at: Timestamp.now() };
            batch.update(docSnap.ref, payload);
            results.push({ id: docSnap.id, ...docSnap.data(), ...payload });
          });
          await batch.commit();
          return { data: results, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },

      async delete() {
        try {
          let q = query(colRef);
          filters.forEach((f) => {
            q = query(q, where(f.field, f.op, f.value));
          });
          const snapshot = await getDocs(q);
          const batch = writeBatch(fbDb);
          snapshot.docs.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
          return { data: { status: "success" }, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      }
    };

    return builder;
  },

  channel(channelName: string) {
    return {
      on(eventType: string, config: any, callback: (payload: any) => void) {
        // Return this for chaining
        return this;
      },
      subscribe() {
        return this;
      }
    };
  },

  removeChannel(channel: any) {
    // No-op for compatibility
  },

  functions: {
    async invoke(functionName: string, options?: any) {
      if (functionName === "ai-chat-bot") {
        const userMsg = options?.body?.message || "";
        const reply = getLocalBotResponse(userMsg);
        return { data: { reply }, error: null };
      }
      return { data: { status: "success" }, error: null };
    }
  }
};
