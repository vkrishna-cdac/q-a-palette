import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FileSpreadsheet,
  Download,
  Search,
  FileText,
  Pen,
  Star,
  Package,
  HardHat,
  Headphones,
  FolderOpen,
  Plus,
  X,
} from "lucide-react";
import Papa from "papaparse";
import {
  toItems,
  exportCsv,
  exportXlsx,
  citationLine,
  type QAItem,
  type Review,
  type ReviewMap,
  type Row,
} from "@/lib/qa";
import { ReviewPanel } from "@/components/qa/ReviewPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Procurement Q&A Review Console" },
      {
        name: "description",
        content:
          "Review grounded procurement Q&A by source document, subject and section with ratings, comments and XLSX/CSV import & export.",
      },
      { property: "og:title", content: "Procurement Q&A Review Console" },
      {
        property: "og:description",
        content:
          "Browse Goods, Works and Services questions section by section, edit answers and chain-of-thought, and export reviews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const SUBJECT_ORDER = ["Goods", "Works", "Services"];
const SUBJECT_LABEL: Record<string, string> = {
  Goods: "MANUAL FOR PROCUREMENT OF GOODS",
  Works: "MANUAL FOR PROCUREMENT OF WORKS",
  Services: "MANUAL FOR PROCUREMENT OF CONSULTANCY & OTHER SERVICES",
};
const REVIEW_KEY = "qa-reviews-v1";
const DATA_KEY = "qa-dataset-v1";

// Tile colours for the Level-3 question list at src/routes/index.tsx:564.
// EDITED: answer/cot was changed. EVALUATED: has any evaluation field but not edited.
// Change the classes below to tweak colours (e.g. bg-amber-50, bg-emerald-50, bg-gold/15).
const EDITED_TILE_CLASS = "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20";
const EVALUATED_TILE_CLASS = "bg-green-50 hover:bg-green-100 dark:bg-green-950/20";

const SUBJECT_META: Record<string, { icon: React.ElementType; color: string }> = {
  Goods: { icon: Package, color: "bg-blue-600" },
  Works: { icon: HardHat, color: "bg-sky-500" },
  Services: { icon: Headphones, color: "bg-indigo-500" },
};

function AddQuestionPage({
  onSubmit,
  onClose,
  initialSubject,
}: {
  onSubmit: (v: { subject: string; question: string; answer: string; remarks: string }) => void;
  onClose: () => void;
  initialSubject?: string | undefined;
}) {
  const [subject, setSubject] = useState(initialSubject ?? "Goods");

  useEffect(() => {
    if (initialSubject) setSubject(initialSubject);
  }, [initialSubject]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [remarks, setRemarks] = useState("");
  const valid = question.trim().length > 0 && answer.trim().length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Add new question</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved to a separate “Added Questions” sheet in the exported workbook.
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
        >
          <X className="size-3.5" /> Close
        </button>
      </div>
      <div className="space-y-5">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Category
          </label>
          <div className="mt-1 w-full max-w-xs rounded-md border border-input bg-secondary px-3 py-2 text-sm font-medium">
            {SUBJECT_LABEL[subject] ?? subject}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Question
          </label>
          <textarea
            value={question}
            maxLength={2000}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Answer
          </label>
          <textarea
            value={answer}
            maxLength={8000}
            onChange={(e) => setAnswer(e.target.value)}
            rows={8}
            className="mt-1 w-full resize-y rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Remarks
          </label>
          <textarea
            value={remarks}
            maxLength={2000}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          disabled={!valid}
          onClick={() =>
            onSubmit({
              subject,
              question: question.trim(),
              answer: answer.trim(),
              remarks: remarks.trim(),
            })
          }
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const items = useMemo(() => toItems(rows), [rows]);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [subject, setSubject] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const r = localStorage.getItem(REVIEW_KEY);
      if (r) setReviews(JSON.parse(r));
    } catch {
      /* ignore */
    }

    const loadDefault = async () => {
      try {
        let text: string | null = null;
        for (const url of ["/1000QA.csv", "/storage/1000QA.csv"]) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              text = await res.text();
              break;
            }
          } catch {
            /* try next url */
          }
        }
        if (text === null) throw new Error("Default dataset not found");
        const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
        const rowsFromCsv = (parsed.data as Row[]).filter((r) =>
          Object.keys(r).some((k) => String((r as Record<string, unknown>)[k] ?? "").trim() !== ""),
        );
        let manualRows: Row[] = [];
        try {
          const saved = localStorage.getItem(DATA_KEY);
          if (saved) {
            const savedRows = JSON.parse(saved) as Row[];
            manualRows = savedRows.filter((r) => r["__manual"] === true);
          }
        } catch {
          /* ignore */
        }
        const merged = [...rowsFromCsv, ...manualRows];
        setRows(merged);
        try {
          localStorage.setItem(DATA_KEY, JSON.stringify(merged));
        } catch {
          /* dataset too large to cache */
        }
      } catch (e) {
        console.error("Failed to load default dataset", e);
        try {
          const d = localStorage.getItem(DATA_KEY);
          if (d) setRows(JSON.parse(d));
        } catch {
          /* ignore */
        }
      } finally {
        setIsLoading(false);
      }
    };
    void loadDefault();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
    } catch {
      /* ignore */
    }
  }, [reviews]);

  const itemsWithoutManual = useMemo(() => toItems(rows.filter((r) => !r["__manual"])), [rows]);
  const addedItems = useMemo(() => items.filter((i) => i.manual), [items]);
  const docName = itemsWithoutManual[0]?.sourceDoc ?? "—";
  const docs = useMemo(
    () => Array.from(new Set(itemsWithoutManual.map((i) => i.sourceDoc))),
    [itemsWithoutManual],
  );

  const tree = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const it of itemsWithoutManual) {
      if (!SUBJECT_ORDER.includes(it.subject)) continue;
      if (!map.has(it.subject)) map.set(it.subject, new Map());
      const s = map.get(it.subject)!;
      s.set(it.section, (s.get(it.section) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(
      (a, b) => SUBJECT_ORDER.indexOf(a[0]) - SUBJECT_ORDER.indexOf(b[0]),
    );
  }, [itemsWithoutManual]);

  const sections = useMemo(() => {
    const found = tree.find(([s]) => s === subject);
    if (!found) return [] as [string, number][];
    return Array.from(found[1].entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true }),
    );
  }, [tree, subject]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.subject === subject &&
        i.section === section &&
        (!q || i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q)),
    );
  }, [items, subject, section, query]);

  const shown = visible;

  const current = shown.find((i) => i.id === selected) ?? null;
  const currentIndex = current ? shown.findIndex((i) => i.id === current.id) : -1;
  const go = (delta: number) => {
    const next = shown[currentIndex + delta];
    if (next) setSelected(next.id);
  };

  const patch = (id: string, p: Review) =>
    setReviews((prev) => {
      const next = { ...(prev[id] ?? {}), ...p };
      if (next.answer === undefined && next.cot === undefined) next.edited = false;
      return { ...prev, [id]: next };
    });

  function persist(next: Row[]) {
    setRows(next);
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(next));
    } catch {
      /* dataset too large to cache */
    }
  }

  function addQuestion(v: { subject: string; question: string; answer: string; remarks: string }) {
    const row: Row = {
      questionId: `manual-${Date.now()}`,
      source_doc: items[0]?.sourceDoc ?? "Manual entry",
      source_subject: v.subject,
      section: "Added Questions",
      question_text: v.question,
      answer: v.answer,
      cot: "",
      remarks: v.remarks,
      __manual: true,
    };
    persist([...rows, row]);
    setShowAdd(false);
  }

  const goHome = () => {
    setShowAdd(false);
    setSubject(null);
    setSection(null);
    setSelected(null);
    setQuery("");
  };
  const goSubject = (s: string) => {
    setShowAdd(false);
    setSubject(s);
    setSection(null);
    setSelected(null);
    setQuery("");
  };
  const goSection = (s: string) => {
    setSection(s);
    setSelected(null);
    setQuery("");
  };

  const crumbs: { label: string; onClick?: () => void }[] = showAdd
    ? [{ label: "Source Document", onClick: goHome }, { label: "Add question" }]
    : [
        { label: "Source Document", ...(subject ? { onClick: goHome } : {}) },
        ...(subject
          ? [{ label: subject, ...(section ? { onClick: () => goSubject(subject) } : {}) }]
          : []),
        ...(section
          ? [{ label: section, ...(current ? { onClick: () => goSection(section) } : {}) }]
          : []),
        ...(current ? [{ label: "Question" }] : []),
      ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <button onClick={goHome} className="flex items-center gap-3 text-left">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight">Q&amp;A Review Console</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading dataset…"
                  : itemsWithoutManual.length
                    ? `${itemsWithoutManual.length} pairs loaded`
                    : "No data available"}
              </p>
            </div>
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {items.length > 0 && (
              <>
                <button
                  onClick={() => exportXlsx(items, reviews)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Download className="size-3.5" /> Export XLSX
                </button>
                <button
                  onClick={() => exportCsv(items, reviews)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
                >
                  <Download className="size-3.5" /> CSV
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {showAdd ? (
          <div className="mx-auto mb-6 max-w-3xl">
            <AddQuestionPage
              onSubmit={addQuestion}
              onClose={() => setShowAdd(false)}
              initialSubject={subject ?? undefined}
            />
          </div>
        ) : isLoading ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <FileText className="size-7 animate-pulse" />
            </span>
            <h2 className="text-lg font-semibold">Loading dataset…</h2>
            <p className="mt-2 text-sm text-muted-foreground">Fetching storage/1000QA.csv</p>
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <FileText className="size-7" />
            </span>
            <h2 className="text-lg font-semibold">No data available</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Could not load storage/1000QA.csv. Ensure the file is present in public/.
            </p>
          </div>
        ) : (
          <>
            {/* Breadcrumb */}
            <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
                  {c.onClick ? (
                    <button
                      onClick={c.onClick}
                      className="rounded px-1.5 py-0.5 font-medium text-primary hover:bg-secondary"
                    >
                      {c.label}
                    </button>
                  ) : (
                    <span className="px-1.5 py-0.5 font-semibold text-foreground">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>

            {!subject && (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
                    <FileText className="size-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold" title={docName}>
                        {docs.length > 1 ? `${docs.length} manuals` : docName}
                      </p>
                      <p className="text-xs text-muted-foreground">Grounded source set</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {tree.map(([subj, secs]) => {
                    const total = Array.from(secs.values()).reduce((a, b) => a + b, 0);
                    const meta = SUBJECT_META[subj] ?? { icon: Package, color: "bg-primary" };
                    const Icon = meta.icon;
                    return (
                      <button
                        key={subj}
                        onClick={() => goSubject(subj)}
                        className="group flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                      >
                        <span
                          className={`mb-4 flex size-14 items-center justify-center rounded-2xl text-primary-foreground shadow ${meta.color}`}
                        >
                          <Icon className="size-7" />
                        </span>
                        <h2 className="min-h-[2.75rem] text-sm font-semibold leading-tight tracking-tight">
                          {SUBJECT_LABEL[subj] ?? subj}
                        </h2>
                        <div className="mt-6 flex items-end justify-between">
                          <span className="text-3xl font-bold">
                            {total}{" "}
                            <span className="text-sm font-medium text-muted-foreground">
                              Q/A pairs
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            Open
                            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Level 2 — sections */}
            {subject && !section && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sections.map(([sec, count]) => (
                  <button
                    key={sec}
                    onClick={() => goSection(sec)}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <FolderOpen className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-6">{sec}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{count} pairs</p>
                    </div>
                    <ChevronRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
                {addedItems.filter((i) => i.subject === subject).length > 0 && (
                  <button
                    onClick={() => goSection("Added Questions")}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <FolderOpen className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-6">Added Questions</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {addedItems.filter((i) => i.subject === subject).length} pairs
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
                <button
                  onClick={() => setShowAdd(true)}
                  className="group flex items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-secondary/30"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-primary-foreground">
                    <Plus className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-6">Add question</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Create a new question in {SUBJECT_LABEL[subject] ?? subject}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
                {sections.length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">
                    No sections in this subject.
                  </p>
                )}
              </div>
            )}

            {/* Level 3 — question list */}
            {subject && section && !current && (
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search questions in this section"
                      className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{shown.length} pairs</p>
                </div>
                <ul className="divide-y divide-border">
                  {shown.map((it, idx) => {
                    const r = reviews[it.id] ?? {};
                    const isEvaluated = !!(
                      r.correct ||
                      r.grounded ||
                      r.complete ||
                      r.tone ||
                      r.rating ||
                      r.comment?.trim() ||
                      r.liked
                    );
                    return (
                      <li key={it.id}>
                        <button
                          onClick={() => setSelected(it.id)}
                          className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/70 ${r.edited ? EDITED_TILE_CLASS : isEvaluated ? EVALUATED_TILE_CLASS : ""}`}
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.92rem] font-medium leading-6">{it.question}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
                              <span>{citationLine(it)}</span>
                              {r.edited && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gold/25 px-1.5 py-0.5 font-semibold text-foreground">
                                  <Pen className="size-2.5" /> Edited
                                </span>
                              )}
                              {!!r.rating && (
                                <span className="inline-flex items-center gap-1 text-foreground">
                                  <Star className="size-3 fill-gold text-gold" />
                                  {r.rating}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    );
                  })}
                  {shown.length === 0 && (
                    <li className="px-5 py-12 text-center text-sm text-muted-foreground">
                      No questions match this search.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Level 4 — full page preview */}
            {current && (
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                <ReviewPanel
                  item={current}
                  review={reviews[current.id] ?? {}}
                  onChange={(p) => patch(current.id, p)}
                  {...(currentIndex > 0 ? { onPrev: () => go(-1) } : {})}
                  {...(currentIndex >= 0 && currentIndex < shown.length - 1
                    ? { onNext: () => go(1) }
                    : {})}
                  position={`${currentIndex + 1} / ${shown.length}`}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
