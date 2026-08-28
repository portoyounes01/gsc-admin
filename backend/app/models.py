from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(40), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class Wzc(Base):
    __tablename__ = "wzcs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    group_name: Mapped[str] = mapped_column(String(255), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    postal_code: Mapped[str] = mapped_column(String(40), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    contact_name: Mapped[str] = mapped_column(String(255), default="")
    contact_role: Mapped[str] = mapped_column(String(255), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(80), default="")
    extra_contacts: Mapped[str] = mapped_column(Text, default="")
    website: Mapped[str] = mapped_column(String(255), default="")
    collaboration_status: Mapped[str] = mapped_column(String(80), default="Actief")
    last_visit: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_visit: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner: Mapped[str] = mapped_column(String(255), default="")
    remark: Mapped[str] = mapped_column(Text, default="")
    resident_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    map_source: Mapped[str] = mapped_column(String(255), default="")
    address_source: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    urgencies: Mapped[list["Urgency"]] = relationship(back_populates="wzc")
    plannings: Mapped[list["Planning"]] = relationship(back_populates="wzc")


class Prospect(Base):
    __tablename__ = "prospects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    group_name: Mapped[str] = mapped_column(String(255), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    postal_code: Mapped[str] = mapped_column(String(40), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    contact_name: Mapped[str] = mapped_column(String(255), default="")
    contact_role: Mapped[str] = mapped_column(String(255), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(80), default="")
    website: Mapped[str] = mapped_column(String(255), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    map_source: Mapped[str] = mapped_column(String(255), default="")
    address_source: Mapped[str] = mapped_column(String(255), default="")
    contacted_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    channel: Mapped[str] = mapped_column(String(80), default="")
    response: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(120), default="Nieuw")
    meeting_type: Mapped[str] = mapped_column(String(80), default="")
    meeting_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner: Mapped[str] = mapped_column(String(255), default="")
    next_action: Mapped[str] = mapped_column(Text, default="")
    next_action_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    remark: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class Urgency(Base):
    __tablename__ = "urgencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reported_on: Mapped[date] = mapped_column(Date, index=True)
    wzc_id: Mapped[int | None] = mapped_column(ForeignKey("wzcs.id"), nullable=True)
    wzc_name: Mapped[str] = mapped_column(String(255), default="")
    patient_name: Mapped[str] = mapped_column(String(255))
    urgency_type: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(80), default="Open")
    remark: Mapped[str] = mapped_column(Text, default="")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    wzc: Mapped[Wzc | None] = relationship(back_populates="urgencies")


class SavedUrgencyRoutePlan(Base):
    __tablename__ = "saved_urgency_route_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    execution_date: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    plan_json: Mapped[str] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class Planning(Base):
    __tablename__ = "plannings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    planning_type: Mapped[str] = mapped_column(String(40), default="Behandeling")
    planning_date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[str] = mapped_column(String(5), default="09:00")
    end_time: Mapped[str] = mapped_column(String(5), default="16:00")
    planning_status: Mapped[str] = mapped_column(String(80), default="Concept")
    team_label: Mapped[str] = mapped_column(String(255), default="")
    location: Mapped[str] = mapped_column(String(255), default="")
    wzc_id: Mapped[int | None] = mapped_column(ForeignKey("wzcs.id"), nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    wzc: Mapped[Wzc | None] = relationship(back_populates="plannings")
    rows: Mapped[list["PlanningRow"]] = relationship(back_populates="planning", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("name", "planning_date", "location", name="uq_planning_name_date_location"),)


class PlanningRow(Base):
    __tablename__ = "planning_rows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    planning_id: Mapped[int] = mapped_column(ForeignKey("plannings.id"))
    patient_number: Mapped[int] = mapped_column(Integer)
    patient_name: Mapped[str] = mapped_column(String(255))
    treatments: Mapped[str] = mapped_column(Text)
    date_or_period: Mapped[str] = mapped_column(String(80), default="")
    remarks: Mapped[str] = mapped_column(Text, default="")
    patient_done: Mapped[bool] = mapped_column(Boolean, default=False)

    planning: Mapped[Planning] = relationship(back_populates="rows")


class TeamProfile(Base):
    __tablename__ = "team_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(120), default="")
    skillsets: Mapped[str] = mapped_column(Text, default="")
    max_treatments_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remark: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_email: Mapped[str] = mapped_column(String(255), index=True)
    module: Mapped[str] = mapped_column(String(120), index=True)
    action: Mapped[str] = mapped_column(String(255))
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
