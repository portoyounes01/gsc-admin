import type { AuditLog, DossierPreviewRow, Planning, PlanningRow, Prospect, SavedUrgencyRoutePlan, SavedUrgencyRoutePlanCreate, TeamProfile, Urgency, UrgencyRoutePlan, UrgencyRoutePlanRequest, User, Wzc } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "/api";
export const SESSION_ENDED_EVENT = "gsc:session-ended";
export const SESSION_DEADLINE_EVENT = "gsc:session-deadline";

type SessionInfo = { user: User; csrf_token: string; session_id: string; expires_at: string };
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let sessionId: string | null = null;
let generation = 0;

// One-time removal of the obsolete bearer token; never read or reuse it.
try { window.localStorage.removeItem("gsc_token"); } catch { /* Storage may be blocked. */ }
const sessionChannel = typeof window.BroadcastChannel === "function" ? new BroadcastChannel("gsc-session") : null;
sessionChannel?.addEventListener("message", () => clearSessionState());

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function clearSessionState(broadcast = false) {
  generation += 1;
  csrfToken = null;
  csrfRequest = null;
  sessionId = null;
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
  if (broadcast) sessionChannel?.postMessage("session-changed");
}

function assertCurrent(expected: number) {
  if (expected !== generation) throw new ApiError(409, "De sessie is gewijzigd. Meld opnieuw aan.");
}

function publishDeadline(value: string | null) {
  if (value) window.dispatchEvent(new CustomEvent(SESSION_DEADLINE_EVENT, { detail: value }));
}

function acceptSession(session: SessionInfo) {
  csrfToken = session.csrf_token;
  sessionId = session.session_id;
  publishDeadline(session.expires_at);
  return session.user;
}

async function getCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    const expected = generation;
    const pending = (async () => {
      const response = await fetch(`${API_URL}/auth/csrf`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new ApiError(response.status, "Aanmelden kon niet voorbereid worden.");
      const body = await response.json() as { csrf_token: string };
      assertCurrent(expected);
      csrfToken = body.csrf_token;
      return csrfToken;
    })();
    csrfRequest = pending;
    void pending.finally(() => { if (csrfRequest === pending) csrfRequest = null; }).catch(() => {});
  }
  return csrfRequest;
}

async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const expected = generation;
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes((options.method || "GET").toUpperCase())) {
    headers.set("X-CSRF-Token", await getCsrf());
  }
  assertCurrent(expected);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include", cache: "no-store" });
  assertCurrent(expected);
  const responseSession = response.headers.get("X-Session-Id");
  if (sessionId && responseSession && responseSession !== sessionId) {
    clearSessionState();
    throw new ApiError(401, "De sessie is gewijzigd. Meld opnieuw aan.");
  }
  if (!response.ok) {
    let message = "Aanvraag mislukt.";
    let code = "";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      code = body.code || "";
    } catch { /* Do not display raw error pages. */ }
    assertCurrent(expected);
    if ((response.status === 401 && path !== "/auth/login") || code === "csrf_failed") clearSessionState();
    throw new ApiError(response.status, message);
  }
  publishDeadline(response.headers.get("X-Session-Expires-At"));
  return response;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const expected = generation;
  const response = await fetchApi(path, options);
  const result = response.status === 204 ? undefined : await response.json();
  assertCurrent(expected);
  return result as T;
}

export const api = {
  apiUrl: API_URL,
  login: async (email: string, password: string) => {
    clearSessionState();
    const session = await request<SessionInfo>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password })
    });
    const user = acceptSession(session);
    sessionChannel?.postMessage("session-changed");
    return user;
  },
  session: async () => acceptSession(await request<SessionInfo>("/auth/session")),
  logout: async (all = false) => {
    await request<void>(all ? "/auth/logout-all" : "/auth/logout", { method: "POST" });
    clearSessionState(true);
  },
  revokeUserSessions: (id: number) => request<void>(`/users/${id}/revoke-sessions`, { method: "POST" }),
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
  createPlanning: (payload: {
    name: string;
    planning_type: string;
    planning_date: string;
    start_time?: string;
    end_time?: string;
    planning_status?: string;
    team_label?: string;
    location: string;
    wzc_id: number | null;
    note?: string;
    rows: PlanningRow[];
  }) =>
    request<Planning>("/plannings", { method: "POST", body: JSON.stringify(payload) }),
  updatePlanning: (id: number, payload: Partial<Planning>) =>
    request<Planning>(`/plannings/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addPlanningRows: (id: number, rows: PlanningRow[]) =>
    request<Planning>(`/plannings/${id}/rows`, { method: "POST", body: JSON.stringify(rows) }),
  replacePlanningRows: (id: number, rows: PlanningRow[]) =>
    request<Planning>(`/plannings/${id}/rows`, { method: "PUT", body: JSON.stringify(rows) }),
  deletePlanningRow: (planningId: number, rowId: number) =>
    request<Planning>(`/plannings/${planningId}/rows/${rowId}`, { method: "DELETE" }),
  deletePlanning: (id: number) => request<{ status: string }>(`/plannings/${id}`, { method: "DELETE" }),
  downloadPlanningExcel: async (id: number, fileName: string) => {
    const expected = generation;
    const response = await fetchApi(`/plannings/${id}/excel`);
    const blob = await response.blob();
    assertCurrent(expected);
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
