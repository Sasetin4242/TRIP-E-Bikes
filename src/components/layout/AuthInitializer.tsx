import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

export default function AuthInitializer() {
  const { login: adminLogin, logout: adminLogout, setLoading: setAdminLoading } = useAuth();
  const { login: customerLogin, logout: customerLogout, setLoading: setCustomerLoading } = useCustomerAuth();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        const user = {
          id: session.user.id,
          email: session.user.email || "",
          username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "",
          avatar: session.user.user_metadata?.avatar || "",
          role: session.user.user_metadata?.role || (session.user.email?.endsWith("@tripmobility.ph") ? "admin" : "customer"),
        };
        const isAdmin = user.role === "admin" || user.role === "super_admin";
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        const user = {
          id: session.user.id,
          email: session.user.email || "",
          username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "",
          avatar: session.user.user_metadata?.avatar || "",
          role: session.user.user_metadata?.role || (session.user.email?.endsWith("@tripmobility.ph") ? "admin" : "customer"),
        };
        const isAdmin = user.role === "admin" || user.role === "super_admin";
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

    return () => {
      subscription.unsubscribe();
    };
  }, [adminLogin, adminLogout, customerLogin, customerLogout, setAdminLoading, setCustomerLoading]);

  return null;
}

