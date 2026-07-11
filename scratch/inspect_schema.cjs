const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Sasetin4242%23@ieijkjjyfgnnypfmieij.backend.onspace.ai:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully!");

    // List all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in public schema:", tablesRes.rows.map(r => r.table_name));

    // Inspect columns of chat_messages
    const colsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'chat_messages'
    `);
    console.log("chat_messages columns:", colsRes.rows);

    // Inspect columns of product_reviews
    const reviewsColsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'product_reviews'
    `);
    console.log("product_reviews columns:", reviewsColsRes.rows);

  } catch (err) {
    console.error("Failed:", err.message);
  } finally {
    await client.end();
  }
}

run();
