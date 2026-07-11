import { supabase } from "./supabase";

export interface ApiResponse<T = any> {
  data: T | null;
  error: { message: string } | null;
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body as string) : null;
    
    // Parse query params safely
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const urlObj = new URL(cleanEndpoint, "https://api-client.local");
    const path = urlObj.pathname;
    const params = Object.fromEntries(urlObj.searchParams.entries());

    let responseData: any = null;

    if (path.includes("settings")) {
      if (method === "GET") {
        const { data, error } = await supabase.from("system_settings").select("*");
        if (!error && data) {
          responseData = data?.map((s: any) => ({
            key: s.key,
            value: s.value === "true" || s.value === true || s.value === "1" ? true : (s.value === "false" || s.value === false || s.value === "0" ? false : s.value),
            label: s.label,
            description: s.description
          }));
        }
      } else if (method === "POST" || method === "PUT") {
        let upsertData: any[] = [];
        if (params.key) {
          const val = body.value !== undefined ? body.value : body;
          upsertData = [{
            key: params.key,
            value: String(val)
          }];
        } else {
          upsertData = Object.entries(body).map(([k, v]) => ({
            key: k,
            value: String(v)
          }));
        }
        const { error } = await supabase.from("system_settings").upsert(upsertData);
        if (!error) responseData = { status: "success" };
      }
    } else if (path.includes("products")) {
      if (method === "GET") {
        if (params.id) {
          const { data, error } = await supabase.from("products_cms").select("*").eq("id", params.id).single();
          if (error) throw error;
          responseData = data;
        } else if (params.action === "review_moderation") {
          const { data, error } = await supabase.from("product_reviews").select(`
            *,
            products_cms ( name )
          `).order("created_at", { ascending: false });
          if (error) throw error;
          responseData = {
            reviews: data?.map((r: any) => ({
              id: String(r.id),
              product_id: String(r.product_id),
              customer_id: r.reviewer_email,
              rating: r.rating,
              review_text: r.review_text,
              verified_purchase: true,
              helpful_count: r.helpful_count || 0,
              moderation_status: r.status,
              admin_reply: r.admin_reply,
              admin_reply_at: r.updated_at,
              created_at: r.created_at,
              username: r.reviewer_name,
              product_name: r.products_cms?.name
            }))
          };
        } else {
          const { data, error } = await supabase.from("products_cms").select("*").order("sort_order", { ascending: true });
          if (error) throw error;
          responseData = data;
        }
      }
    } else if (path.includes("leads")) {
      if (method === "GET") {
        const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        responseData = data;
      } else if (method === "POST") {
        const { data, error } = await supabase.from("leads").insert(body).select().single();
        if (error) throw error;
        responseData = data;
      } else if (method === "PUT") {
        const { data, error } = await supabase.from("leads").update(body).eq("id", params.id).select().single();
        if (error) throw error;
        responseData = data;
      } else if (method === "DELETE") {
        const { error } = await supabase.from("leads").delete().eq("id", params.id);
        if (error) throw error;
        responseData = { status: "success" };
      }
    } else if (path.includes("quotations")) {
      if (method === "GET") {
        if (params.id) {
          const { data, error } = await supabase.from("quotations").select(`
            *,
            products_cms ( name )
          `).eq("id", params.id).single();
          if (error) throw error;
          responseData = {
            ...data,
            product_name: data?.products_cms?.name || "Custom Design"
          };
        } else {
          const { data, error } = await supabase.from("quotations").select(`
            *,
            products_cms ( name )
          `).order("created_at", { ascending: false });
          if (error) throw error;
          responseData = data?.map((q: any) => ({
            ...q,
            product_name: q.products_cms?.name || "Custom Design"
          }));
        }
      } else if (method === "PUT") {
        const { data, error } = await supabase.from("quotations").update(body).eq("id", params.id).select().single();
        if (error) throw error;
        responseData = data;
      }
    } else if (path.includes("submit-quote")) {
      if (method === "POST") {
        const { data, error } = await supabase.from("quotations").insert({
          customer_name: body.name,
          customer_email: body.email,
          customer_phone: body.phone,
          product_id: body.product_id ? parseInt(body.product_id) : null,
          notes: body.notes || "",
          custom_specs: body.custom_specs || null,
          status: "pending"
        }).select().single();
        if (error) throw error;
        responseData = data;
      }
    } else if (path.includes("appointments")) {
      if (method === "GET") {
        const { data, error } = await supabase.from("service_appointments").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        responseData = data;
      } else if (method === "POST") {
        const { data, error } = await supabase.from("service_appointments").insert(body).select().single();
        if (error) throw error;
        responseData = data;
      } else if (method === "PUT") {
        const { data, error } = await supabase.from("service_appointments").update(body).eq("id", params.id).select().single();
        if (error) throw error;
        responseData = data;
      }
    } else if (path.includes("contacts") || path.includes("contact-form")) {
      if (method === "GET") {
        const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        responseData = data;
      } else if (method === "POST") {
        const { data, error } = await supabase.from("contact_messages").insert({
          name: body.name,
          email: body.email,
          phone: body.phone || null,
          subject: body.subject || null,
          message: body.message
        }).select().single();
        if (error) throw error;
        responseData = data;
      } else if (method === "PUT") {
        const { data, error } = await supabase.from("contact_messages").update(body).eq("id", params.id).select().single();
        if (error) throw error;
        responseData = data;
      }
    } else if (path.includes("blog")) {
      if (method === "GET") {
        if (params.slug) {
          const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", params.slug).single();
          if (error) throw error;
          responseData = data;
        } else {
          const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
          if (error) throw error;
          responseData = data;
        }
      } else if (method === "POST") {
        const { data, error } = await supabase.from("blog_posts").insert(body).select().single();
        if (error) throw error;
        responseData = data;
      } else if (method === "PUT") {
        const { data, error } = await supabase.from("blog_posts").update(body).eq("id", params.id).select().single();
        if (error) throw error;
        responseData = data;
      } else if (method === "DELETE") {
        const { error } = await supabase.from("blog_posts").delete().eq("id", params.id);
        if (error) throw error;
        responseData = { status: "success" };
      }
    } else if (path.includes("loyalty")) {
      const email = params.email || body?.email;
      if (method === "GET") {
        const { data: balanceData } = await supabase.from("loyalty_points").select("*").eq("customer_email", email).single();
        responseData = {
          points: balanceData ? [{ id: String(balanceData.id), points: balanceData.points_balance, action_type: "earned", reason: "Points Balance", created_at: balanceData.updated_at }] : []
        };
      }
    }

    return {
      data: responseData,
      error: null
    };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || "Network error" }
    };
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'GET', ...options }),
  
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      ...options,
    }),
  
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      ...options,
    }),
  
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};
