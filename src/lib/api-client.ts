import { db } from "./firebase";
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
  Timestamp
} from "firebase/firestore";

export interface ApiResponse<T = any> {
  data: T | null;
  error: { message: string } | null;
}

// Helper to convert Firestore timestamp/fields to standard dates
function convertDoc(docSnap: any) {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  // Ensure we include the document ID
  const result = { id: docSnap.id, ...data };
  
  // Format dates/timestamps
  if (result.created_at instanceof Timestamp) {
    result.created_at = result.created_at.toDate().toISOString();
  }
  if (result.updated_at instanceof Timestamp) {
    result.updated_at = result.updated_at.toDate().toISOString();
  }
  return result;
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
        const querySnapshot = await getDocs(collection(db, "system_settings"));
        responseData = querySnapshot.docs.map((docSnap) => {
          const s = docSnap.data();
          return {
            key: docSnap.id,
            value: s.value === "true" || s.value === true || s.value === "1" ? true : (s.value === "false" || s.value === false || s.value === "0" ? false : s.value),
            label: s.label || "",
            description: s.description || ""
          };
        });
      } else if (method === "POST" || method === "PUT") {
        if (params.key) {
          const val = body.value !== undefined ? body.value : body;
          await setDoc(doc(db, "system_settings", params.key), {
            value: String(val),
            updated_at: Timestamp.now()
          }, { merge: true });
        } else {
          for (const [k, v] of Object.entries(body)) {
            await setDoc(doc(db, "system_settings", k), {
              value: String(v),
              updated_at: Timestamp.now()
            }, { merge: true });
          }
        }
        responseData = { status: "success" };
      }
    } else if (path.includes("products")) {
      if (method === "GET") {
        if (params.id) {
          const docSnap = await getDoc(doc(db, "products_cms", params.id));
          if (!docSnap.exists()) throw new Error("Product not found");
          responseData = convertDoc(docSnap);
        } else if (params.action === "review_moderation") {
          const querySnapshot = await getDocs(
            query(collection(db, "product_reviews"), orderBy("created_at", "desc"))
          );
          
          const reviews = [];
          for (const docSnap of querySnapshot.docs) {
            const r = docSnap.data();
            // Fetch product name
            let productName = "Unknown Product";
            if (r.product_id) {
              const prodSnap = await getDoc(doc(db, "products_cms", String(r.product_id)));
              if (prodSnap.exists()) {
                productName = prodSnap.data().name || productName;
              }
            }
            reviews.push({
              id: docSnap.id,
              product_id: String(r.product_id),
              customer_id: r.reviewer_email,
              rating: r.rating,
              review_text: r.review_text,
              verified_purchase: true,
              helpful_count: r.helpful_count || 0,
              moderation_status: r.status,
              admin_reply: r.admin_reply,
              admin_reply_at: r.updated_at instanceof Timestamp ? r.updated_at.toDate().toISOString() : r.updated_at,
              created_at: r.created_at instanceof Timestamp ? r.created_at.toDate().toISOString() : r.created_at,
              username: r.reviewer_name,
              product_name: productName
            });
          }
          responseData = { reviews };
        } else {
          const querySnapshot = await getDocs(
            query(collection(db, "products_cms"), orderBy("sort_order", "asc"))
          );
          responseData = querySnapshot.docs.map(convertDoc);
        }
      }
    } else if (path.includes("leads")) {
      if (method === "GET") {
        const querySnapshot = await getDocs(
          query(collection(db, "leads"), orderBy("created_at", "desc"))
        );
        responseData = querySnapshot.docs.map(convertDoc);
      } else if (method === "POST") {
        const payload = {
          ...body,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, "leads"), payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      } else if (method === "PUT") {
        const docRef = doc(db, "leads", params.id);
        const payload = {
          ...body,
          updated_at: Timestamp.now()
        };
        await updateDoc(docRef, payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      } else if (method === "DELETE") {
        await deleteDoc(doc(db, "leads", params.id));
        responseData = { status: "success" };
      }
    } else if (path.includes("quotations")) {
      if (method === "GET") {
        if (params.id) {
          const docSnap = await getDoc(doc(db, "quotations", params.id));
          if (!docSnap.exists()) throw new Error("Quotation not found");
          const q = docSnap.data();
          let productName = "Custom Design";
          if (q.product_id) {
            const prodSnap = await getDoc(doc(db, "products_cms", String(q.product_id)));
            if (prodSnap.exists()) {
              productName = prodSnap.data().name || productName;
            }
          }
          responseData = {
            id: docSnap.id,
            ...q,
            product_name: productName,
            created_at: q.created_at instanceof Timestamp ? q.created_at.toDate().toISOString() : q.created_at,
            updated_at: q.updated_at instanceof Timestamp ? q.updated_at.toDate().toISOString() : q.updated_at
          };
        } else {
          const querySnapshot = await getDocs(
            query(collection(db, "quotations"), orderBy("created_at", "desc"))
          );
          
          const quotations = [];
          for (const docSnap of querySnapshot.docs) {
            const q = docSnap.data();
            let productName = "Custom Design";
            if (q.product_id) {
              const prodSnap = await getDoc(doc(db, "products_cms", String(q.product_id)));
              if (prodSnap.exists()) {
                productName = prodSnap.data().name || productName;
              }
            }
            quotations.push({
              id: docSnap.id,
              ...q,
              product_name: productName,
              created_at: q.created_at instanceof Timestamp ? q.created_at.toDate().toISOString() : q.created_at,
              updated_at: q.updated_at instanceof Timestamp ? q.updated_at.toDate().toISOString() : q.updated_at
            });
          }
          responseData = quotations;
        }
      } else if (method === "PUT") {
        const docRef = doc(db, "quotations", params.id);
        const payload = {
          ...body,
          updated_at: Timestamp.now()
        };
        await updateDoc(docRef, payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      }
    } else if (path.includes("submit-quote")) {
      if (method === "POST") {
        const payload = {
          customer_name: body.name,
          customer_email: body.email,
          customer_phone: body.phone,
          product_id: body.product_id || null,
          notes: body.notes || "",
          custom_specs: body.custom_specs || null,
          status: "pending",
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, "quotations"), payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      }
    } else if (path.includes("appointments")) {
      if (method === "GET") {
        const querySnapshot = await getDocs(
          query(collection(db, "service_appointments"), orderBy("created_at", "desc"))
        );
        responseData = querySnapshot.docs.map(convertDoc);
      } else if (method === "POST") {
        const payload = {
          ...body,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, "service_appointments"), payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      } else if (method === "PUT") {
        const docRef = doc(db, "service_appointments", params.id);
        const payload = {
          ...body,
          updated_at: Timestamp.now()
        };
        await updateDoc(docRef, payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      }
    } else if (path.includes("contacts") || path.includes("contact-form")) {
      if (method === "GET") {
        const querySnapshot = await getDocs(
          query(collection(db, "contact_messages"), orderBy("created_at", "desc"))
        );
        responseData = querySnapshot.docs.map(convertDoc);
      } else if (method === "POST") {
        const payload = {
          name: body.name,
          email: body.email,
          phone: body.phone || null,
          subject: body.subject || null,
          message: body.message,
          is_read: false,
          created_at: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, "contact_messages"), payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      } else if (method === "PUT") {
        const docRef = doc(db, "contact_messages", params.id);
        await updateDoc(docRef, body);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      }
    } else if (path.includes("blog")) {
      if (method === "GET") {
        if (params.slug) {
          const q = query(collection(db, "blog_posts"), where("slug", "==", params.slug), limit(1));
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) throw new Error("Blog post not found");
          responseData = convertDoc(querySnapshot.docs[0]);
        } else {
          const querySnapshot = await getDocs(
            query(collection(db, "blog_posts"), orderBy("created_at", "desc"))
          );
          responseData = querySnapshot.docs.map(convertDoc);
        }
      } else if (method === "POST") {
        const payload = {
          ...body,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, "blog_posts"), payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      } else if (method === "PUT") {
        const docRef = doc(db, "blog_posts", params.id);
        const payload = {
          ...body,
          updated_at: Timestamp.now()
        };
        await updateDoc(docRef, payload);
        const docSnap = await getDoc(docRef);
        responseData = convertDoc(docSnap);
      } else if (method === "DELETE") {
        await deleteDoc(doc(db, "blog_posts", params.id));
        responseData = { status: "success" };
      }
    } else if (path.includes("loyalty")) {
      const email = params.email || body?.email;
      if (method === "GET") {
        const q = query(collection(db, "loyalty_points"), where("customer_email", "==", email), limit(1));
        const querySnapshot = await getDocs(q);
        const balanceData = querySnapshot.empty ? null : querySnapshot.docs[0].data();
        responseData = {
          points: balanceData ? [{
            id: querySnapshot.docs[0].id,
            points: balanceData.points_balance,
            action_type: "earned",
            reason: "Points Balance",
            created_at: balanceData.updated_at instanceof Timestamp ? balanceData.updated_at.toDate().toISOString() : balanceData.updated_at
          }] : []
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
