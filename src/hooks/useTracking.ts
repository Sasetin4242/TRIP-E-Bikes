/**
 * TRIP Mobility — Analytics Tracking Hook
 * Sends events to GTM dataLayer (GA4 + Meta Pixel via GTM)
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

// Ensure dataLayer exists
if (typeof window !== "undefined" && !window.dataLayer) {
  window.dataLayer = [];
}

function push(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

// ── Page Tracking ──────────────────────────────────────────────────────────────

export function trackPageView(pagePath: string, pageTitle: string) {
  push("page_view", {
    page_path: pagePath,
    page_title: pageTitle,
    page_location: typeof window !== "undefined" ? window.location.href : "",
  });
  // Meta Pixel PageView
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
}

// ── Quote Modal ────────────────────────────────────────────────────────────────

export function trackQuoteModalOpen(source: string, preselectedProduct?: string) {
  push("quote_modal_open", {
    event_category: "Quote Funnel",
    event_label: source,
    product_name: preselectedProduct || "none",
  });
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout", { content_name: "Quote Modal", content_category: "Quote" });
  }
}

export function trackQuoteStep(stepIndex: number, stepName: string, formData: Record<string, unknown> = {}) {
  push("quote_funnel_step", {
    event_category: "Quote Funnel",
    event_label: stepName,
    step_index: stepIndex + 1,
    step_name: stepName,
    ...formData,
  });
}

export function trackQuoteSubmit(data: {
  product: string;
  quantity: number;
  useType: string;
  budget: string;
  leadScore?: number;
}) {
  push("quote_submitted", {
    event_category: "Conversion",
    event_label: data.product,
    product_name: data.product,
    quantity: data.quantity,
    use_type: data.useType,
    budget_range: data.budget,
    lead_score: data.leadScore,
    currency: "PHP",
  });
  // Meta Pixel Lead
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead", {
      content_name: data.product,
      content_category: "E-Bike Quote",
      value: data.quantity * 57000,
      currency: "PHP",
    });
  }
}

// ── Product ────────────────────────────────────────────────────────────────────

export function trackProductView(productName: string, productId: string, price: number) {
  push("view_item", {
    event_category: "Product",
    event_label: productName,
    items: [
      {
        item_id: productId,
        item_name: productName,
        item_category: "E-Bike",
        price,
        currency: "PHP",
        quantity: 1,
      },
    ],
    currency: "PHP",
    value: price,
  });
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "ViewContent", {
      content_ids: [productId],
      content_name: productName,
      content_type: "product",
      value: price,
      currency: "PHP",
    });
  }
}

// ── CTA Clicks ─────────────────────────────────────────────────────────────────

export function trackCTAClick(ctaLabel: string, location: string, destination?: string) {
  push("cta_click", {
    event_category: "Engagement",
    event_label: ctaLabel,
    cta_location: location,
    cta_destination: destination || "quote_modal",
  });
}

// ── Contact Form ───────────────────────────────────────────────────────────────

export function trackContactFormSubmit(inquiryType: string) {
  push("contact_form_submit", {
    event_category: "Lead",
    event_label: inquiryType,
  });
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Contact");
  }
}

// ── Blog ───────────────────────────────────────────────────────────────────────

export function trackBlogRead(title: string, category: string) {
  push("blog_article_view", {
    event_category: "Content",
    event_label: title,
    blog_category: category,
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useTracking() {
  return {
    trackPageView,
    trackQuoteModalOpen,
    trackQuoteStep,
    trackQuoteSubmit,
    trackProductView,
    trackCTAClick,
    trackContactFormSubmit,
    trackBlogRead,
  };
}
