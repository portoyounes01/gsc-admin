import type { AuditLog, DossierPreviewRow, Planning, PlanningRow, Prospect, SavedUrgencyRoutePlan, SavedUrgencyRoutePlanCreate, TeamProfile, Urgency, UrgencyRoutePlan, UrgencyRoutePlanRequest, User, Wzc } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken() {
  return window.localStorage.getItem("gsc_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("gsc_token", token);
}

export function clearToken() {
  window.localStorage.removeItem("gsc_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = "Aanvraag mislukt.";
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  apiUrl: API_URL,
  login: async (email: string, password: string) => {
    const token = await request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setToken(token.access_token);
    return token;
  },
  me: () => request<User>("/auth/me"),
  users: () => request<User[]>("/users"),
  createUser: (payload: { email: string; password: string; role: string; is_active: boolean }) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id: number, payload: { password?: string; role?: string; is_active?: boolean }) =>
    request<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteUser: (id: number) => request<{ status: string }>(`/users/${id}`, { method: "DELETE" }),
  teams: () => request<TeamProfile[]>("/teams"),
  createTeamProfile: (payload: Partial<TeamProfile>) =>
    request<TeamProfile>("/teams", { method: "POST", body: JSON.stringify(payload) }),
  updateTeamProfile: (id: number, payload: Partial<TeamProfile>) =>
    request<TeamProfile>(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTeamProfile: (id: number) => request<{ status: string }>(`/teams/${id}`, { method: "DELETE" }),
  wzcs: () => request<Wzc[]>("/wzcs"),
  createWzc: (payload: Partial<Wzc>) => request<Wzc>("/wzcs", { method: "POST", body: JSON.stringify(payload) }),
  updateWzc: (id: number, payload: Partial<Wzc>) =>
    request<Wzc>(`/wzcs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteWzc: (id: number, confirmName: string) =>
    request<{ status: string }>(`/wzcs/${id}?confirm_name=${encodeURIComponent(confirmName)}`, { method: "DELETE" }),
  prospects: () => request<Prospect[]>("/prospects"),
  createProspect: (payload: Partial<Prospect>) =>
    request<Prospect>("/prospects", { method: "POST", body: JSON.stringify(payload) }),
  updateProspect: (id: number, payload: Partial<Prospect>) =>
    request<Prospect>(`/prospects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  convertProspectToWzc: (id: number) =>
    request<Wzc>(`/prospects/${id}/convert-to-wzc`, { method: "POST" }),
  deleteProspect: (id: number, confirmName: string) =>
    request<{ status: string }>(`/prospects/${id}?confirm_name=${encodeURIComponent(confirmName)}`, { method: "DELETE" }),
  urgencies: (status = "") => request<Urgency[]>(`/urgencies${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createUrgency: (payload: Partial<Urgency>) =>
    request<Urgency>("/urgencies", { method: "POST", body: JSON.stringify(payload) }),
  completeUrgency: (id: number) => request<Urgency>(`/urgencies/${id}/complete`, { method: "POST" }),
  planUrgencyRoutes: (payload: UrgencyRoutePlanRequest) =>
    request<UrgencyRoutePlan>("/urgencies/route-plan", { method: "POST", body: JSON.stringify(payload) }),
  savedUrgencyRoutePlans: (executionDate = "") =>
    request<SavedUrgencyRoutePlan[]>(`/urgencies/saved-route-plans${executionDate ? `?execution_date=${encodeURIComponent(executionDate)}` : ""}`),
  saveUrgencyRoutePlan: (payload: SavedUrgencyRoutePlanCreate) =>
    request<SavedUrgencyRoutePlan>("/urgencies/saved-route-plans", { method: "POST", body: JSON.stringify(payload) }),
  deleteSavedUrgencyRoutePlan: (id: number) => request<{ status: string }>(`/urgencies/saved-route-plans/${id}`, { method: "DELETE" }),
  plannings: () => request<Planning[]>("/plannings"),
  previewPlanning: async (planningDate: string, files: File[]) => {
    const formData = new FormData();
    formData.set("planning_date", planningDate);
    files.forEach((file) => formData.append("files", file));
    return request<PlanningRow[]>("/plannings/preview", { method: "POST", body: formData });
  },
  previewScreeningPlanning: async (planningDate: string, files: File[]) => {
    const formData = new FormData();
    formData.set("planning_date", planningDate);
    files.forEach((file) => formData.append("files", file));
    return request<PlanningRow[]>("/plannings/screening-preview", { method: "POST", body: formData });
  },
  previewDossiers: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return request<DossierPreviewRow[]>("/dossiers/preview", { method: "POST", body: formData });
  },
  createPlanning: (payload: { name: string; planning_type: string; planning_date: string; location: string; wzc_id: number | null; rows: PlanningRow[] }) =>
    request<Planning>("/plannings", { method: "POST", body: JSON.stringify(payload) }),
  updatePlanning: (id: number, payload: Partial<Planning>) =>
    request<Planning>(`/plannings/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addPlanningRows: (id: number, rows: PlanningRow[]) =>
    request<Planning>(`/plannings/${id}/rows`, { method: "POST", body: JSON.stringify(rows) }),
  deletePlanningRow: (planningId: number, rowId: number) =>
    request<Planning>(`/plannings/${planningId}/rows/${rowId}`, { method: "DELETE" }),
  deletePlanning: (id: number) => request<{ status: string }>(`/plannings/${id}`, { method: "DELETE" }),
  downloadPlanningExcel: async (id: number, fileName: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`${API_URL}/plannings/${id}/excel`, { headers });
    if (!response.ok) {
      throw new ApiError(response.status, "Excel downloaden mislukt.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName || "planning"}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  },
  auditLogs: () => request<AuditLog[]>("/audit-logs"),
  clearAuditLogs: () => request<{ status: string }>("/audit-logs", { method: "DELETE" })
};
