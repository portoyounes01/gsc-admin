from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PortalAccountCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    wzc_id: int
    role: str = "staff"


class PortalAccountUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    role: str | None = None
    is_active: bool | None = None


class PortalAccountOut(BaseModel):
    id: int
    email: str
    wzc_id: int
    wzc_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PortalMeOut(PortalAccountOut):
    pass


class PortalDemoCentreOut(BaseModel):
    name: str
    city: str
    email: EmailStr


class PortalUrgencyCreate(BaseModel):
    reported_on: date
    patient_name: str = Field(min_length=1, max_length=255)
    urgency_type: str = Field(min_length=1, max_length=255)
    remark: str = ""


class PortalUrgencyOut(BaseModel):
    id: int
    reported_on: date
    wzc_name: str
    urgency_type: str
    status: str
    remark: str

    model_config = ConfigDict(from_attributes=True)


class PortalAppointmentOut(BaseModel):
    id: int
    date: date
    start_time: str
    end_time: str
    type: str
    status: str
    note: str


class PortalServiceOut(BaseModel):
    id: int
    date: date
    type: str
    status: str
    summary: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    role: str = "user"
    is_active: bool = True


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=4)
    role: str | None = None
    is_active: bool | None = None


class TeamProfileBase(BaseModel):
    name: str
    role: str = ""
    skillsets: str = ""
    max_treatments_per_day: int | None = None
    remark: str = ""
    is_active: bool = True


class TeamProfileCreate(TeamProfileBase):
    pass


class TeamProfileUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    skillsets: str | None = None
    max_treatments_per_day: int | None = None
    remark: str | None = None
    is_active: bool | None = None


class TeamProfileOut(TeamProfileBase):
    id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WzcBase(BaseModel):
    external_id: str = ""
    name: str
    group_name: str = ""
    address: str = ""
    postal_code: str = ""
    city: str = ""
    contact_name: str = ""
    contact_role: str = ""
    email: str = ""
    phone: str = ""
    extra_contacts: str = ""
    website: str = ""
    collaboration_status: str = "Actief"
    last_visit: date | None = None
    next_visit: date | None = None
    owner: str = ""
    remark: str = ""
    resident_count: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    map_source: str = ""
    address_source: str = ""


class WzcCreate(WzcBase):
    pass


class WzcUpdate(BaseModel):
    external_id: str | None = None
    name: str | None = None
    group_name: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    contact_name: str | None = None
    contact_role: str | None = None
    email: str | None = None
    phone: str | None = None
    extra_contacts: str | None = None
    website: str | None = None
    collaboration_status: str | None = None
    last_visit: date | None = None
    next_visit: date | None = None
    owner: str | None = None
    remark: str | None = None
    resident_count: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    map_source: str | None = None
    address_source: str | None = None


class WzcOut(WzcBase):
    id: int
    created_at: datetime
    updated_at: datetime
    open_urgencies: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProspectBase(BaseModel):
    external_id: str = ""
    name: str
    group_name: str = ""
    address: str = ""
    postal_code: str = ""
    city: str = ""
    contact_name: str = ""
    contact_role: str = ""
    email: str = ""
    phone: str = ""
    website: str = ""
    latitude: float | None = None
    longitude: float | None = None
    map_source: str = ""
    address_source: str = ""
    contacted_on: date | None = None
    channel: str = ""
    response: str = ""
    status: str = "Aan te schrijven"
    meeting_type: str = ""
    meeting_date: date | None = None
    owner: str = ""
    next_action: str = ""
    next_action_deadline: date | None = None
    remark: str = ""


class ProspectCreate(ProspectBase):
    pass


class ProspectUpdate(BaseModel):
    external_id: str | None = None
    name: str | None = None
    group_name: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    contact_name: str | None = None
    contact_role: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    map_source: str | None = None
    address_source: str | None = None
    contacted_on: date | None = None
    channel: str | None = None
    response: str | None = None
    status: str | None = None
    meeting_type: str | None = None
    meeting_date: date | None = None
    owner: str | None = None
    next_action: str | None = None
    next_action_deadline: date | None = None
    remark: str | None = None


class ProspectOut(ProspectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UrgencyBase(BaseModel):
    reported_on: date
    wzc_id: int | None = None
    wzc_name: str = ""
    patient_name: str
    urgency_type: str
    status: str = "Open"
    remark: str = ""


class UrgencyCreate(UrgencyBase):
    pass


class UrgencyUpdate(BaseModel):
    reported_on: date | None = None
    wzc_id: int | None = None
    wzc_name: str | None = None
    patient_name: str | None = None
    urgency_type: str | None = None
    status: str | None = None
    remark: str | None = None


class UrgencyOut(UrgencyBase):
    id: int
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoutePlanLocation(BaseModel):
    label: str = "Start"
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class UrgencyRoutePlanRequest(BaseModel):
    urgency_ids: list[int] = Field(min_length=1, max_length=100)
    execution_date: date = Field(default_factory=date.today)
    start_location: RoutePlanLocation
    end_location: RoutePlanLocation | None = None
    return_to_start: bool = True
    route_count: int = Field(default=1, ge=1, le=12)
    service_duration_minutes: int = Field(default=20, ge=0, le=480)
    max_route_duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    start_time: str = Field(default="08:30", pattern=r"^\d{2}:\d{2}$")


class UrgencyRouteStopOut(BaseModel):
    urgency_id: int
    wzc_id: int | None = None
    wzc_name: str
    patient_name: str
    urgency_type: str
    sequence: int
    latitude: float
    longitude: float
    arrival_time: str
    departure_time: str
    driving_minutes_from_previous: int
    distance_km_from_previous: float
    service_duration_minutes: int
    cumulative_duration_minutes: int


class UrgencyRouteOut(BaseModel):
    route_id: str
    label: str
    color: str
    stops: list[UrgencyRouteStopOut]
    total_distance_km: float
    total_driving_minutes: int
    total_service_minutes: int
    total_duration_minutes: int
    estimated_start_time: str
    estimated_end_time: str
    end_location_label: str
    final_driving_minutes: int
    final_distance_km: float
    warnings: list[str] = []


class UrgencyRouteUnassignedOut(BaseModel):
    urgency_id: int
    wzc_name: str
    patient_name: str
    reason: str


class UrgencyRoutePlanOut(BaseModel):
    generated_at: datetime
    execution_date: date
    provider: str
    uses_real_road_network: bool
    uses_live_traffic: bool = False
    has_route_geometry: bool = False
    start_location: RoutePlanLocation
    end_location: RoutePlanLocation | None = None
    return_to_start: bool
    routes: list[UrgencyRouteOut]
    unassigned_urgencies: list[UrgencyRouteUnassignedOut] = []
    warnings: list[str] = []


class SavedUrgencyRoutePlanCreate(BaseModel):
    execution_date: date
    title: str = ""
    plan: UrgencyRoutePlanOut


class SavedUrgencyRoutePlanOut(BaseModel):
    id: int
    execution_date: date
    title: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    plan: UrgencyRoutePlanOut


class PlanningRowBase(BaseModel):
    patient_number: int
    patient_name: str
    treatments: str
    date_or_period: str = ""
    remarks: str = ""
    patient_done: bool = False


class PlanningRowCreate(PlanningRowBase):
    pass


class TreatmentMatchItemOut(BaseModel):
    pdf_id: str
    roster_name: str = ""
    pdf_name: str
    file_name: str
    reason: str = ""
    row: PlanningRowCreate


class TreatmentMatchReportOut(BaseModel):
    excel_count: int
    pdf_count: int
    roster_names: list[str] = Field(default_factory=list)
    pdfs: list[TreatmentMatchItemOut] = Field(default_factory=list)
    matched: list[TreatmentMatchItemOut] = Field(default_factory=list)
    missing_names: list[str] = Field(default_factory=list)
    unselected_pdfs: list[TreatmentMatchItemOut] = Field(default_factory=list)
    review: list[TreatmentMatchItemOut] = Field(default_factory=list)


class TreatmentSelectionItemOut(BaseModel):
    pdf_id: str
    pdf_name: str
    file_name: str
    excel_name: str = ""
    excel_status: str = ""
    excel_approved: bool | None = None
    excel_order: int = 0
    recommended: bool = False
    match_kind: str = "none"
    row: PlanningRowCreate


class TreatmentSelectionReportOut(BaseModel):
    excel_count: int = 0
    pdf_count: int
    items: list[TreatmentSelectionItemOut] = Field(default_factory=list)
    missing_names: list[str] = Field(default_factory=list)


class PlanningRowOut(PlanningRowBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class PlanningCreate(BaseModel):
    name: str
    planning_type: str = "Behandeling"
    planning_date: date
    start_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(default="16:00", pattern=r"^\d{2}:\d{2}$")
    planning_status: str = "Concept"
    team_label: str = ""
    location: str = ""
    wzc_id: int | None = None
    note: str = ""
    rows: list[PlanningRowCreate]


class PlanningUpdate(BaseModel):
    name: str | None = None
    planning_type: str | None = None
    planning_date: date | None = None
    start_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    end_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    planning_status: str | None = None
    team_label: str | None = None
    location: str | None = None
    wzc_id: int | None = None
    note: str | None = None


class PlanningOut(BaseModel):
    id: int
    name: str
    planning_type: str = "Behandeling"
    planning_date: date
    start_time: str = "09:00"
    end_time: str = "16:00"
    planning_status: str = "Concept"
    team_label: str = ""
    location: str
    wzc_id: int | None = None
    note: str = ""
    created_by: str = ""
    created_at: datetime
    updated_at: datetime
    rows: list[PlanningRowOut] = []

    model_config = ConfigDict(from_attributes=True)


class AuditLogOut(BaseModel):
    id: int
    actor_email: str
    module: str
    action: str
    metadata_json: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DossierPreviewRow(BaseModel):
    file_name: str
    insz: str = ""
    last_name: str = ""
    first_name: str = ""
    email: str = ""
    phone: str = ""
    birthdate: str = ""
    gender: str = ""
    medication: str = ""
    remarks: str = ""
