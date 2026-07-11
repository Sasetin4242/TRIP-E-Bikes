import { db, auth, googleProvider } from "./firebase";
import { 
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot 
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup 
} from "firebase/auth";

// Firebase-to-Supabase Compatibility Adapter Layer
export const supabase = {
  auth: {
    getSession: async () => {
      const user = auth.currentUser;
      return { data: { session: user ? { user } : null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        callback(user ? "SIGNED_IN" : "SIGNED_OUT", user ? { user } : null);
      });
      return { data: { subscription: { unsubscribe } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const res = await signInWithEmailAndPassword(auth, email, password);
        return { data: { user: res.user, session: { user: res.user } }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },
    signInWithOAuth: async ({ provider }: any) => {
      try {
        if (provider === "google") {
          const res = await signInWithPopup(auth, googleProvider);
          return { data: { user: res.user }, error: null };
        }
        throw new Error("Provider not supported");
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signOut: async () => {
      try {
        await signOut(auth);
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    }
  },

  from: (tableName: string) => {
    let qConstraints: any[] = [];
    let limitVal: number | null = null;
    let orderCol: string | null = null;
    let orderDir: "asc" | "desc" = "asc";

    const chain = {
      select: (cols?: string) => chain,
      eq: (col: string, val: any) => {
        qConstraints.push(where(col, "==", val));
        return chain;
      },
      gte: (col: string, val: any) => {
        qConstraints.push(where(col, ">=", val));
        return chain;
      },
      order: (col: string, options?: { ascending?: boolean }) => {
        orderCol = col;
        orderDir = options?.ascending === false ? "desc" : "asc";
        return chain;
      },
      limit: (val: number) => {
        limitVal = val;
        return chain;
      },

      // Execution methods
      then: async (onfulfilled?: (value: any) => any) => {
        try {
          let ref: any = collection(db, tableName);
          const constraints = [...qConstraints];
          if (orderCol) {
            constraints.push(orderBy(orderCol, orderDir));
          }
          if (limitVal) {
            constraints.push(limit(limitVal));
          }
          
          const q = constraints.length > 0 ? query(ref, ...constraints) : ref;
          const snap = await getDocs(q);
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const res = { data, error: null };
          if (onfulfilled) return onfulfilled(res);
          return res;
        } catch (err: any) {
          const res = { data: null, error: err };
          if (onfulfilled) return onfulfilled(res);
          return res;
        }
      },

      insert: async (payload: any) => {
        try {
          const ref = collection(db, tableName);
          const dataArray = Array.isArray(payload) ? payload : [payload];
          const results = [];
          for (const item of dataArray) {
            const docRef = await addDoc(ref, item);
            results.push({ id: docRef.id, ...item });
          }
          return { data: results, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },

      update: async (payload: any) => {
        try {
          let ref: any = collection(db, tableName);
          const q = qConstraints.length > 0 ? query(ref, ...qConstraints) : ref;
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            await updateDoc(doc(db, tableName, docSnap.id), payload);
          }
          return { error: null };
        } catch (err: any) {
          return { error: err };
        }
      },

      delete: async () => {
        try {
          let ref: any = collection(db, tableName);
          const q = qConstraints.length > 0 ? query(ref, ...qConstraints) : ref;
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, tableName, docSnap.id));
          }
          return { error: null };
        } catch (err: any) {
          return { error: err };
        }
      }
    };

    return chain;
  },

  channel: (channelName: string) => {
    return {
      on: (event: string, filter: any, callback: any) => {
        // Map real-time chat/notification updates to Firestore onSnapshot
        const ref = collection(db, channelName.split(":")[1] || channelName);
        const unsubscribe = onSnapshot(ref, (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              callback({ new: { id: change.doc.id, ...change.doc.data() } });
            }
          });
        });
        return {
          subscribe: () => ({ unsubscribe })
        };
      }
    };
  }
};
