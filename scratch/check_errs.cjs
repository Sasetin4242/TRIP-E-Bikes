const axios = require('axios');

async function check() {
  const baseUrl = 'https://ieijkjjyfgnnypfmieij.backend.onspace.ai/rest/v1';
  
  // Test notifications
  try {
    const res = await axios.get(`${baseUrl}/notifications?select=*&order=created_at.desc`);
    console.log('Notifications status:', res.status);
  } catch (err) {
    console.error('Notifications failed:', err.response ? err.response.data : err.message);
  }

  // Test chat_sessions
  try {
    const res = await axios.get(`${baseUrl}/chat_sessions?select=*,chat_messages(message,created_at,read,sender)&order=updated_at.desc`);
    console.log('Chat sessions status:', res.status);
  } catch (err) {
    console.error('Chat sessions failed:', err.response ? err.response.data : err.message);
  }

  // Test product_reviews
  try {
    const res = await axios.get(`${baseUrl}/product_reviews?select=*,products_cms(name)&order=created_at.desc`);
    console.log('Product reviews status:', res.status);
  } catch (err) {
    console.error('Product reviews failed:', err.response ? err.response.data : err.message);
  }
}

check();
