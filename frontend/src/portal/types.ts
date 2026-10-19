export type PortalMe = { id: number; email: string; wzc_id: number; wzc_name: string; role: string; is_active: boolean };
export type PortalDemoCentre = { name: string; city: string; email: string };
export type PortalUrgency = { id: number; reported_on: string; wzc_name: string; urgency_type: string; status: string; remark: string };
export type PortalAppointment = { id: number; date: string; start_time: string; end_time: string; type: string; status: string; note: string };
export type PortalService = { id: number; date: string; type: string; status: string; summary: string };
