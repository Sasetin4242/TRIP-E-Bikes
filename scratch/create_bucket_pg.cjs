const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Sasetin4242%23@ieijkjjyfgnnypfmieij.backend.onspace.ai:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to database successfully!");

    const sql = `
      -- Create public 'brand-assets' storage bucket if it does not exist
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('brand-assets', 'brand-assets', true)
      ON CONFLICT (id) DO NOTHING;

      -- Policies for the brand-assets storage bucket objects
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Allow public SELECT on brand-assets bucket'
        ) THEN
          CREATE POLICY "Allow public SELECT on brand-assets bucket" ON storage.objects
              FOR SELECT TO public USING (bucket_id = 'brand-assets');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to INSERT objects into brand-assets'
        ) THEN
          CREATE POLICY "Allow authenticated users to INSERT objects into brand-assets" ON storage.objects
              FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-assets');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to UPDATE objects in brand-assets'
        ) THEN
          CREATE POLICY "Allow authenticated users to UPDATE objects in brand-assets" ON storage.objects
              FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'brand-assets');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to DELETE objects from brand-assets'
        ) THEN
          CREATE POLICY "Allow authenticated users to DELETE objects from brand-assets" ON storage.objects
              FOR DELETE TO authenticated USING (bucket_id = 'brand-assets');
        END IF;
      END
      $$;
    `;

    await client.query(sql);
    console.log("Storage bucket and policies configured successfully!");
  } catch (err) {
    console.error("Database operation failed:", err.message, err);
  } finally {
    await client.end();
  }
}

run();
