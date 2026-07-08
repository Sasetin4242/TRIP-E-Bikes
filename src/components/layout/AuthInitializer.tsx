import { useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

export default function AuthInitializer() {
  const { login: adminLogin, logout: adminLogout, setLoading: setAdminLoading } = useAuth();
  const { login: customerLogin, logout: customerLogout, setLoading: setCustomerLoading } = useCustomerAuth();

  useEffect(() => {
    let mounted = true;

    const token = localStorage.getItem("token");
    if (!token) {
      setAdminLoading(false);
      setCustomerLoading(false);
      adminLogout();
      customerLogout();
      return;
    }

    apiClient.get("/auth.php").then(({ data, error }) => {
      if (!mounted) return;
      if (!error && data && data.user) {
        const user = data.user;
        const isAdmin = user.role === "admin" || user.role === "super_admin";
        if (isAdmin) {
          adminLogin(user);
        } else {
          customerLogin(user);
        }
      } else {
        localStorage.removeItem("token");
        adminLogout();
        customerLogout();
      }
      setAdminLoading(false);
      setCustomerLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [adminLogin, adminLogout, customerLogin, customerLogout, setAdminLoading, setCustomerLoading]);

  return null;
}

