import { useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

export default function AuthInitializer() {
  const { login: adminLogin, logout: adminLogout, setLoading: setAdminLoading } = useAuth();
  const { login: customerLogin, logout: customerLogout, setLoading: setCustomerLoading } = useCustomerAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional profile data from Firestore
        let role = firebaseUser.email?.endsWith("@tripmobility.ph") ? "admin" : "customer";
        let username = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "";
        let avatar = firebaseUser.photoURL || "";

        try {
          const profileSnap = await getDoc(doc(db, "profiles", firebaseUser.uid));
          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.role) role = data.role;
            if (data.username) username = data.username;
            if (data.avatar) avatar = data.avatar;
          }
        } catch (err) {
          console.warn("Failed to fetch user profile:", err);
        }

        const user = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          username,
          avatar,
          role,
        };

        const isAdmin = role === "admin" || role === "super_admin";
        if (isAdmin) {
          adminLogin(user);
        } else {
          customerLogin(user);
        }
      } else {
        adminLogout();
        customerLogout();
      }
      setAdminLoading(false);
      setCustomerLoading(false);
    });

    return () => unsubscribe();
  }, [adminLogin, adminLogout, customerLogin, customerLogout, setAdminLoading, setCustomerLoading]);

  return null;
}
