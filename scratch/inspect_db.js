import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ieijkjjyfgnnypfmieij.backend.onspace.ai";
const supabaseAnonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWYiOiJpZWlqa2pqeWZnbm55cGZtaWVpaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzMzU0MDMwLCJleHAiOjIwOTg3MTQwMzAsImlzcyI6Im9uc3BhY2UifQ.qCI-EaVe7l-8wRxHUEYHj464cUs-v3X5gOWC92darHc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data: qCols, error: qErr } = await supabase.rpc("get_columns", { table_name: "quotations" });
  if (qErr) {
    // If RPC doesn't exist, try querying columns directly if accessible, or run raw SQL or check by doing select with non-existent column
    console.log("RPC error, checking by selecting specific columns:");
    const testCols = ["id", "customer_name", "customer_email", "referrer_code", "referrer"];
    for (const col of testCols) {
      const { error } = await supabase.from("quotations").select(col).limit(1);
      console.log(`Column ${col}:`, error ? "Not found / Error: " + error.message : "Exists");
    }
  } else {
    console.log("Quotations columns:", qCols);
  }
}

checkColumns();
