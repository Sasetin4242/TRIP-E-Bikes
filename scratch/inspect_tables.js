import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ieijkjjyfgnnypfmieij.backend.onspace.ai";
const supabaseAnonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWYiOiJpZWlqa2pqeWZnbm55cGZtaWVpaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzMzU0MDMwLCJleHAiOjIwOTg3MTQwMzAsImlzcyI6Im9uc3BhY2UifQ.qCI-EaVe7l-8wRxHUEYHj464cUs-v3X5gOWC92darHc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log("Checking system_settings table...");
  const { data: setts, error: settsErr } = await supabase.from("system_settings").select("*");
  if (settsErr) {
    console.error("system_settings error:", settsErr);
  } else {
    console.log("system_settings sample:", setts);
  }

  console.log("\nChecking notifications table...");
  const { data: notifs, error: notifsErr } = await supabase.from("notifications").select("*").limit(1);
  if (notifsErr) {
    console.error("notifications error:", notifsErr);
  } else {
    console.log("notifications sample:", notifs);
  }
  process.exit(0);
}

inspect();
