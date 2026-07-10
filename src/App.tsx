import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect } from "react";
import { Toaster } from "sonner";
import ScrollToTop from "@/components/layout/ScrollToTop";
import AuthInitializer from "@/components/layout/AuthInitializer";
import ProtectedAdminRoute from "@/components/layout/ProtectedAdminRoute";
import { trackPageView } from "@/hooks/useTracking";
import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import IndustriesPage from "@/pages/IndustriesPage";
import FinancingPage from "@/pages/FinancingPage";
import ServicePage from "@/pages/ServicePage";
import BlogPage from "@/pages/BlogPage";
import BlogArticlePage from "@/pages/BlogArticlePage";
import ContactPage from "@/pages/ContactPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminContent from "@/pages/admin/AdminContent";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminQuotations from "@/pages/admin/AdminQuotations";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminContacts from "@/pages/admin/AdminContacts";
import AdminChat from "@/pages/admin/AdminChat";
import AdminAppointments from "@/pages/admin/AdminAppointments";
import AdminSystemSettings from "@/pages/admin/AdminSystemSettings";
import CustomerDashboard from "@/pages/customer/CustomerDashboard";
import ComparePage from "@/pages/ComparePage";
import NotFound from "@/pages/NotFound";
import PublicLayout from "@/components/layout/PublicLayout";
import LiveChat from "@/components/features/LiveChat";

// Page title map for tracking
const PAGE_TITLES: Record<string, string> = {
  "/": "Home — TRIP Mobility | Premium Electric Bikes Philippines",
  "/about": "About Us — TRIP Mobility",
  "/products": "All Models — TRIP Mobility",
  "/industries": "Industries — TRIP Mobility",
  "/financing": "Financing — TRIP Mobility",
  "/service": "Service & Support — TRIP Mobility",
  "/blog": "Knowledge Hub — TRIP Mobility",
  "/contact": "Contact Us — TRIP Mobility",
  "/my-quotes": "My Quotations — TRIP Mobility",
};

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || "TRIP Mobility";
    document.title = title;
    trackPageView(location.pathname, title);
  }, [location.pathname]);
  return null;
}

function ReferralHandler() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      sessionStorage.setItem("referrer_code", code);
      sessionStorage.setItem("referral_code", code);
      toast.success("Referral code applied!");
    }
    navigate("/products", { replace: true });
  }, [code, navigate]);

  return null;
}

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthInitializer />
      <ScrollToTop />
      <PageTracker />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1A1A1A",
            border: "1px solid rgba(57,255,20,0.3)",
            color: "#F5F5F5",
          },
        }}
      />
      <LiveChat />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/industries" element={<IndustriesPage />} />
          <Route path="/financing" element={<FinancingPage />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogArticlePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/refer/:code" element={<ReferralHandler />} />
        </Route>

        {/* Customer Portal */}
        <Route path="/my-quotes" element={<CustomerDashboard />} />

        {/* Admin Login (unprotected) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="quotations" element={<AdminQuotations />} />
            <Route path="contacts" element={<AdminContacts />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSystemSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </HelmetProvider>
  );
}
