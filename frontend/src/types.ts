export type User = {
  id: number;
  email: string;
  role: "admin" | "user" | string;
  is_active: boolean;
};

export type TeamProfile = {
  id: number;
  name: string;
  role: string;
  skillsets: string;
  max_treatments_per_day: number | null;
  remark: string;
  is_active: boolean;
  updated_at: string;
};

export type Wzc = {
  id: number;
  external_id: string;
  name: string;
  group_name: string;
  address: string;
  postal_code: string;
  city: string;
  contact_name: string;
  contact_role: string;
  email: string;
  phone: string;
  extra_contacts: string;
  website: string;
  collaboration_status: string;
  last_visit: string | null;
  next_visit: string | null;
  owner: string;
  remark: string;
  resident_count: number | null;
  latitude: number | null;
  longitude: number | null;
  map_source: string;
  address_source: string;
  open_urgencies: number;
};

export type Prospect = {
  id: number;
  external_id: string;
  name: string;
  group_name: string;
  address: string;
  postal_code: string;
  city: string;
  contact_name: string;
  contact_role: string;
  email: string;
  phone: string;
  website: string;
  latitude: number | null;
  longitude: number | null;
  map_source: string;
  address_source: string;
  status: string;
  contacted_on: string | null;
  channel: string;
  response: string;
  meeting_type: string;
  meeting_date: string | null;
  owner: string;
  next_action: string;
  next_action_deadline: string | null;
  remark: string;
};

export type Urgency = {
  id: number;
  reported_on: string;
  wzc_id: number | null;
  wzc_name: string;
  patient_name: string;
  urgency_type: string;
  status: string;
  remark: string;
  completed_at: string | null;
};

export type RoutePlanLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

export type UrgencyRoutePlanRequest = {
  urgency_ids: number[];
  execution_date: string;
  start_location: RoutePlanLocation;
  end_location?: RoutePlanLocation | null;
  return_to_start: boolean;
  route_count: number;
  service_duration_minutes: number;
  max_route_duration_minutes?: number | null;
  start_time: string;
};

export type UrgencyRouteStop = {
  urgency_id: number;
  wzc_id: number | null;
  wzc_name: string;
  patient_name: string;
  urgency_type: string;
  sequence: number;
  latitude: number;
  longitude: number;
  arrival_time: string;
  departure_time: string;
  driving_minutes_from_previous: number;
  distance_km_from_previous: number;
  service_duration_minutes: number;
  cumulative_duration_minutes: number;
};

export type UrgencyRoute = {
  route_id: string;
  label: string;
  color: string;
  stops: UrgencyRouteStop[];
  total_distance_km: number;
  total_driving_minutes: number;
  total_service_minutes: number;
  total_duration_minutes: number;
  estimated_start_time: string;
  estimated_end_time: string;
  end_location_label: string;
  final_driving_minutes: number;
  final_distance_km: number;
  warnings: string[];
};

export type UrgencyRouteUnassigned = {
  urgency_id: number;
  wzc_name: string;
  patient_name: string;
  reason: string;
};

export type UrgencyRoutePlan = {
  generated_at: string;
  execution_date: string;
  provider: string;
  uses_real_road_network: boolean;
  uses_live_traffic: boolean;
  has_route_geometry: boolean;
  start_location: RoutePlanLocation;
  end_location: RoutePlanLocation | null;
  return_to_start: boolean;
  routes: UrgencyRoute[];
  unassigned_urgencies: UrgencyRouteUnassigned[];
  warnings: string[];
};

export type SavedUrgencyRoutePlan = {
  id: number;
  execution_date: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  plan: UrgencyRoutePlan;
};

export type SavedUrgencyRoutePlanCreate = {
  execution_date: string;
  title?: string;
  plan: UrgencyRoutePlan;
};

export type PlanningRow = {
  id?: number;
  patient_number: number;
  patient_name: string;
  treatments: string;
  date_or_period: string;
  remarks: string;
  patient_done: boolean;
};

export type TreatmentMatchItem = {
  pdf_id: string;
  roster_name: string;
  pdf_name: string;
  file_name: string;
  reason: string;
  row: PlanningRow;
};

export type TreatmentMatchReport = {
  excel_count: number;
  pdf_count: number;
  roster_names: string[];
  pdfs: TreatmentMatchItem[];
  matched: TreatmentMatchItem[];
  missing_names: string[];
  unselected_pdfs: TreatmentMatchItem[];
  review: TreatmentMatchItem[];
};

export type TreatmentSelectionItem = {
  pdf_id: string;
  pdf_name: string;
  file_name: string;
  excel_name: string;
  excel_status: string;
  excel_approved: boolean | null;
  excel_order: number;
  recommended: boolean;
  match_kind: "exact" | "likely" | "surname" | "none" | string;
  row: PlanningRow;
};

export type TreatmentSelectionReport = {
  excel_count: number;
  pdf_count: number;
  items: TreatmentSelectionItem[];
  missing_names: string[];
};

export type Planning = {
  id: number;
  name: string;
  planning_type: "Behandeling" | "Screening" | string;
  planning_date: string;
  start_time: string;
  end_time: string;
  planning_status: string;
  team_label: string;
  location: string;
  wzc_id: number | null;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  rows: PlanningRow[];
};

export type AuditLog = {
  id: number;
  actor_email: string;
  module: string;
  action: string;
  metadata_json: string;
  created_at: string;
};

export type DossierPreviewRow = {
  file_name: string;
  insz: string;
  last_name: string;
  first_name: string;
  email: string;
  phone: string;
  birthdate: string;
  gender: string;
  medication: string;
  remarks: string;
};
