"""DB schema for migrating public/1000QA.csv (and the app's localStorage
dataset) out of the browser and into a real database.

Two tables:
  - QAItem: one row per generated Q&A pair — source doc, subject/section,
    citation provenance, and the quality/defect metadata the eval pipeline
    attached to each row. Reviewer-added pairs (id prefix "manual-") live in
    the same table with `is_manual=True` and most sourcing/quality fields
    left unset, matching how src/lib/qa.ts and ReviewPanel.tsx already treat
    them (filtered out of counts/tree, exported to a separate sheet).
  - Review: one row per reviewer verdict against a QAItem, matching the
    fields ReviewPanel.tsx's EvaluationFields actually collects.

`subject` is a closed enum (Goods/Works/Services/Extra) because the app's
home page is hard-keyed to those three families (SUBJECT_ORDER in
index.tsx) plus the Extra catch-all from normalizeSubject(). `section` is
deliberately a free-text string, not an enum: the source manuals contribute
hundreds of distinct subsection headings (e.g. "9.7.2 Terms of Delivery"),
and normalizeSection() only folds the handful of loose/unlabelled buckets
into "Additional questions" — everything else passes through verbatim.

QARowImport mirrors the raw CSV columns for validation at import time
(booleans and lists arrive as strings/JSON-in-a-cell) and converts into the
clean QAItem shape above via `to_qa_item()`.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class Subject(str, Enum):
    """The three procurement families the app surfaces as home-page cards,
    plus the Extra catch-all normalizeSubject() falls back to."""

    GOODS = "Goods"
    WORKS = "Works"
    SERVICES = "Services"
    EXTRA = "Extra"


class QualityTier(str, Enum):
    CLEAN = "clean"
    FLAGGED = "flagged"
    UNVERIFIABLE = "unverifiable"


class CitationState(str, Enum):
    GROUNDED = "grounded"
    NO_FACTS = "no-facts"
    UNGROUNDED = "ungrounded"


class DefectClass(str, Enum):
    """A row may carry more than one — CSV cell is comma-separated,
    e.g. "phantom-context,corpus-wide-absence,ungrounded-fact"."""

    CORPUS_WIDE_ABSENCE = "corpus-wide-absence"
    DUPLICATE_CANDIDATE = "duplicate-candidate"
    PHANTOM_CONTEXT = "phantom-context"
    UNGROUNDED_FACT = "ungrounded-fact"
    UNSOURCED_KNOWLEDGE = "unsourced-knowledge"
    WRONG_CITATION = "wrong-citation"


class Verdict(str, Enum):
    """Options behind the Yes/No/Can't tell Choice controls in
    ReviewPanel.tsx (correct, grounded, tone)."""

    YES = "Yes"
    NO = "No"
    CANT_TELL = "Can't tell"


class Completeness(str, Enum):
    FULLY_ANSWERS = "Fully answers"
    PARTIAL = "Partial"
    ANSWERS_MORE_THAN_ASKED = "Answers more than asked"


class Liked(str, Enum):
    UP = "up"
    DOWN = "down"


# ---------------------------------------------------------------------------
# QAItem — the reviewable Q&A pair
# ---------------------------------------------------------------------------


class QAItem(BaseModel):
    model_config = ConfigDict(use_enum_values=False)

    id: str = Field(description="questionId from the source pipeline, or manual-<uuid>")
    is_manual: bool = Field(
        default=False, description="Reviewer-added pair (id prefix 'manual-'); no source/quality metadata"
    )

    source_doc: str
    subject: Subject
    section: str = Field(description="Free-text subsection heading; not an enum, see module docstring")

    chunk_name: str | None = None
    chunk_page_range: str | None = Field(default=None, description='Raw "148-149" form, kept for display')
    chunk_page_start: int | None = None
    chunk_page_end: int | None = None
    chunk_content: str | None = None

    cited_manual: Subject | None = None
    cited_page: int | None = None
    citation_in_range: bool | None = None
    citation_state: CitationState | None = None

    question: str
    answer: str
    cot: str | None = None

    provenance_exact: bool | None = None
    held_out: bool | None = None
    defunct: bool | None = None
    abstention: bool | None = None
    defect_classes: list[DefectClass] = Field(default_factory=list)
    quality_tier: QualityTier | None = None
    quality_score: float | None = Field(default=None, ge=0, le=10)
    score: float | None = Field(default=None, ge=0, le=1)
    tags: list[str] = Field(default_factory=list)

    extra: dict[str, Any] = Field(
        default_factory=dict,
        description="Passthrough for any source column not modelled above, so new pipeline "
        "columns don't require a migration before they can round-trip (mirrors QAItem.raw in qa.ts)",
    )

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="after")
    def _split_page_range(self) -> "QAItem":
        if self.chunk_page_range and self.chunk_page_start is None and self.chunk_page_end is None:
            start, _, end = self.chunk_page_range.partition("-")
            if start.strip().isdigit() and end.strip().isdigit():
                self.chunk_page_start = int(start)
                self.chunk_page_end = int(end)
        return self


# ---------------------------------------------------------------------------
# Review — one reviewer verdict against one QAItem
# ---------------------------------------------------------------------------


class Review(BaseModel):
    """Matches the Review interface in src/lib/qa.ts / the fields
    EvaluationFields in ReviewPanel.tsx actually collects. `rating`,
    `realistic` and `ship` are carried for export round-trip fidelity but
    have no input control in the current UI."""

    id: UUID = Field(default_factory=uuid4)
    qa_item_id: str = Field(description="FK -> QAItem.id")
    reviewer_email: str | None = Field(default=None, description="Attribution; e.g. vamshikrishnar@cdac.in")

    answer: str | None = Field(default=None, description="Edited answer; overlays QAItem.answer on export")
    cot: str | None = Field(default=None, description="Edited chain-of-thought")
    edited: bool = False

    liked: Liked | None = None
    correct: Verdict | None = None
    grounded: Verdict | None = None
    complete: Completeness | None = None
    tone: Verdict | None = None
    realistic: Verdict | None = None
    ship: Verdict | None = None
    rating: int | None = Field(default=None, ge=0, le=5)
    comment: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="after")
    def _save_gate(self) -> "Review":
        """Mirrors ReviewPanel's Save gate for non-manual items: correct,
        grounded, complete and tone must all be set together with a verdict
        (liked) before a review counts as submitted. Left unenforced here
        (reviews may be drafted incrementally) — validated at the API/UI
        layer, not at the row level."""
        return self


# ---------------------------------------------------------------------------
# QARowImport — raw CSV row, validated and converted into a QAItem
# ---------------------------------------------------------------------------


def _parse_bool(v: Any) -> bool | None:
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return v
    return str(v).strip().lower() in {"true", "1", "yes"}


def _normalize_section(v: str) -> str:
    """Mirrors normalizeSection() in src/lib/qa.ts: fold blank/unlabelled/
    uncertain buckets into the app's catch-all sections, pass through
    everything else (the many real subsection headings) verbatim."""
    s = v.strip()
    if not s:
        return "Others"
    lower = s.lower()
    if "unlabell" in lower or "unlabel" in lower or "uncertaint" in lower:
        return "Additional questions"
    if lower in {"extra", "extras", "other", "others"}:
        return "Additional questions"
    return s


def _parse_list_cell(v: Any) -> list[str]:
    """defect_class is comma-separated; tags is usually a JSON array string
    but occasionally a single bare token (e.g. "abstention-insufficient-context")."""
    if v is None or v == "":
        return []
    if isinstance(v, list):
        return [str(x) for x in v]
    s = str(v).strip()
    if s.startswith("["):
        try:
            parsed = json.loads(s)
            return [str(x) for x in parsed]
        except json.JSONDecodeError:
            pass
    return [part.strip() for part in s.split(",") if part.strip()]


class QARowImport(BaseModel):
    """Permissive model for one row of 1000QA.csv, keyed to its exact
    headers. Convert with `to_qa_item()` before inserting into the DB."""

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    questionId: str
    source_doc: str
    source_subject: str
    section: str
    chunkName: str | None = None
    chunk_page_range: str | None = None
    provenance_exact: str | None = None
    held_out: str | None = None
    defunct: str | None = None
    defect_class: str | None = None
    quality_tier: str | None = None
    quality_score: str | None = None
    abstention: str | None = None
    cited_manual: str | None = None
    cited_page: str | None = None
    citation_in_range: str | None = None
    citation_state: str | None = None
    tags: str | None = None
    score: str | None = None
    question_text: str
    answer: str
    cot: str | None = None
    chunk_content: str | None = None

    def to_qa_item(self) -> QAItem:
        extra = {k: v for k, v in (self.model_extra or {}).items() if v not in (None, "")}

        subject_raw = self.source_subject.strip()
        subject = (
            Subject.GOODS
            if "good" in subject_raw.lower()
            else Subject.WORKS
            if "work" in subject_raw.lower()
            else Subject.SERVICES
            if subject_raw.lower() in {"consultancy", "services", "service"}
            else Subject.EXTRA
        )
        cited_manual = None
        if self.cited_manual:
            cm = self.cited_manual.strip().lower()
            cited_manual = (
                Subject.GOODS
                if "good" in cm
                else Subject.WORKS
                if "work" in cm
                else Subject.SERVICES
                if cm in {"consultancy", "services", "service"}
                else None
            )

        return QAItem(
            id=self.questionId,
            source_doc=self.source_doc,
            subject=subject,
            section=_normalize_section(self.section),
            chunk_name=self.chunkName,
            chunk_page_range=self.chunk_page_range,
            chunk_content=self.chunk_content,
            cited_manual=cited_manual,
            cited_page=int(self.cited_page) if self.cited_page and self.cited_page.isdigit() else None,
            citation_in_range=(self.citation_in_range or "").strip().lower() == "in_range"
            if self.citation_in_range
            else None,
            citation_state=CitationState(self.citation_state) if self.citation_state else None,
            question=self.question_text,
            answer=self.answer,
            cot=self.cot,
            provenance_exact=_parse_bool(self.provenance_exact),
            held_out=_parse_bool(self.held_out),
            defunct=_parse_bool(self.defunct),
            abstention=_parse_bool(self.abstention),
            defect_classes=[DefectClass(x) for x in _parse_list_cell(self.defect_class)],
            quality_tier=QualityTier(self.quality_tier) if self.quality_tier else None,
            quality_score=float(self.quality_score) if self.quality_score not in (None, "") else None,
            score=float(self.score) if self.score not in (None, "") else None,
            tags=_parse_list_cell(self.tags),
            extra=extra,
        )

    @field_validator("questionId", "source_doc", "source_subject", "question_text", "answer")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v
