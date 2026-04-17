const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.MINDEE_API_KEY;
const MODEL_ID = "6a80752c-7636-4415-840c-7c067e40eb1b";

async function testMindee() {
  console.log("--- Mindee API Connectivity Test ---");
  console.log("Using API Key:", API_KEY ? (API_KEY.slice(0, 10) + "...") : "MISSING");

  if (!API_KEY) {
    console.error("Error: MINDEE_API_KEY is missing in .env");
    return;
  }

  try {
    // We'll try to reach the Mindee API status/predict endpoint (using GET which will 405, but confirms connectivity and Auth)
    const response = await axios.get(`https://api.mindee.net/v2/inferences`, {
      headers: { 'Authorization': API_KEY }
    });
    
    console.log("Status Code:", response.status);
    console.log("Success: Connection established and Auth valid.");
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        console.error("Error: Unauthorized (401). Your API Key is likely invalid.");
      } else if (error.response.status === 405 || error.response.status === 404) {
        console.log("Status Code:", error.response.status);
        console.log("Note: Got 404/405 - This is expected for a GET request on this endpoint, but it confirms the API server is reachable and your Key is accepted.");
      } else {
        console.error("API Error Code:", error.response.status);
        console.error("Response Data:", error.response.data);
      }
    } else {
      console.error("Network Error:", error.message);
    }
  }
}

testMindee();
