import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ieijkjjyfgnnypfmieij.backend.onspace.ai";
const supabaseAnonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWYiOiJpZWlqa2pqeWZnbm55cGZtaWVpaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzMzU0MDMwLCJleHAiOjIwOTg3MTQwMzAsImlzcyI6Im9uc3BhY2UifQ.qCI-EaVe7l-8wRxHUEYHj464cUs-v3X5gOWC92darHc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Attempting to create 'brand-assets' storage bucket...");
  const { data, error } = await supabase.storage.createBucket("brand-assets", {
    public: true
  });
  if (error) {
    console.error("Bucket creation failed:", error.message, error);
  } else {
    console.log("Bucket created successfully:", data);
  }
}

run();
