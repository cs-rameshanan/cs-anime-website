import axios from "axios";

const BASE_URL = process.env.CONTENTSTACK_BASE_URL || "https://api.contentstack.io/v3";

// Build headers - dev22/non-prod may require authtoken instead of management token
const headers = {
  api_key: process.env.CONTENTSTACK_API_KEY,
  "Content-Type": "application/json",
};

// Use authtoken if available (required for dev22/non-prod), otherwise use management token
if (process.env.CONTENTSTACK_AUTHTOKEN) {
  headers.authtoken = process.env.CONTENTSTACK_AUTHTOKEN;
}
if (process.env.CONTENTSTACK_MANAGEMENT_TOKEN) {
  headers.authorization = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
}

export const csClient = axios.create({
  baseURL: BASE_URL,
  headers,
});

export { BASE_URL };
