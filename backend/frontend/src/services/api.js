import axios from "axios";

function defaultApiBase() {
  if (typeof window === "undefined") return "http://localhost:5001";
  const { protocol, hostname } = window.location;
  if (!hostname || protocol === "file:") return "http://localhost:5001";
  return `${protocol}//${hostname}:5001`;
}

// Default to backend on same host :5001 so auth works without relying on the CRA proxy.
const API_BASE = process.env.REACT_APP_API_URL || defaultApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export function setStoredUser(user) {
  if (user) localStorage.setItem("user", JSON.stringify(user));
  else localStorage.removeItem("user");
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function roleToApi(uiRole) {
  const m = {
    Farmer: "farmer",
    Investor: "investor",
    Buyer: "buyer",
    Admin: "expert",
  };
  return m[uiRole] || "farmer";
}

export function routeForRole(role) {
  const r = String(role || "").toLowerCase();
  if (r === "investor") return "/investor/dashboard";
  if (r === "expert") return "/admin/dashboard";
  if (r === "buyer") return "/buyer/dashboard";
  return "/farmer/dashboard";
}

export default api;
