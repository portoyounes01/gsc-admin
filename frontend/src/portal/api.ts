import type { PortalAppointment, PortalDemoCentre, PortalMe, PortalService, PortalUrgency } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "gsc_portal_token";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Aanvraag mislukt.");
  return response.json() as Promise<T>;
}

export const portalApi = {
  token: () => localStorage.getItem(TOKEN_KEY),
  login: async (email: string, password: string) => {
    const result = await request<{ access_token: string }>("/portal/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    localStorage.setItem(TOKEN_KEY, result.access_token);
  },
  me: () => request<PortalMe>("/portal/me"),
  demoCentres: () => request<PortalDemoCentre[]>("/portal/demo-centres"),
  appointments: () => request<PortalAppointment[]>("/portal/appointments"),
  services: () => request<PortalService[]>("/portal/services"),
  urgencies: () => request<PortalUrgency[]>("/portal/urgencies"),
  createUrgency: (payload: { reported_on: string; patient_name: string; urgency_type: string; remark: string }) => request<PortalUrgency>("/portal/urgencies", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => localStorage.removeItem(TOKEN_KEY),
};
