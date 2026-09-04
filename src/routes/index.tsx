import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  FileSpreadsheet,
  Upload,
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
import {
  toItems,
  parseFile,
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
const REVIEW_KEY = "qa-reviews-v1";
const DATA_KEY = "qa-dataset-v1";

const SUBJECT_META: Record<string, { icon: React.ElementType; color: string }> = {
  Goods: { icon: Package, color: "bg-blue-600" },
  Works: { icon: HardHat, color: "bg-sky-500" },
  Services: { icon: Headphones, color: "bg-indigo-500" },
};

function AddQuestionForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (v: { subject: string; question: string; answer: string; remarks: string }) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("Goods");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [remarks, setRemarks] = useState("");
  const valid = question.trim().length > 0 && answer.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add new question</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-border p-1.5 hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {SUBJECT_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
              rows={5}
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
              rows={2}
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
    </div>
  );
}

function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const items = useMemo(() => toItems(rows), [rows]);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [subject, setSubject] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem(REVIEW_KEY);
      if (r) setReviews(JSON.parse(r));
      const d = localStorage.getItem(DATA_KEY);
      if (d) setRows(JSON.parse(d));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
    } catch {
      /* ignore */
    }
  }, [reviews]);

  const docName = items[0]?.sourceDoc ?? "—";
  const docs = useMemo(() => Array.from(new Set(items.map((i) => i.sourceDoc))), [items]);

  const tree = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const it of items) {
      if (!SUBJECT_ORDER.includes(it.subject)) continue;
      if (!map.has(it.subject)) map.set(it.subject, new Map());
      const s = map.get(it.subject)!;
      s.set(it.section, (s.get(it.section) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(
      (a, b) => SUBJECT_ORDER.indexOf(a[0]) - SUBJECT_ORDER.indexOf(b[0]),
    );
  }, [items]);

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

  const current = visible.find((i) => i.id === selected) ?? null;
  const currentIndex = current ? visible.findIndex((i) => i.id === current.id) : -1;
  const go = (delta: number) => {
    const next = visible[currentIndex + delta];
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

  async function onImport(file: File) {
    const parsed = await parseFile(file);
    persist(parsed);
    setSubject(null);
    setSection(null);
    setSelected(null);
    setQuery("");
  }

  function addQuestion(v: {
    subject: string;
    question: string;
    answer: string;
    remarks: string;
  }) {
    const row: Row = {
      questionId: `manual-${Date.now()}`,
      source_doc: items[0]?.sourceDoc ?? "Manual entry",
      source_subject: v.subject,
      section: "Additional questions",
      question_text: v.question,
      answer: v.answer,
      cot: "",
      remarks: v.remarks,
    };
    persist([...rows, row]);
    setShowAdd(false);
  }

  const goHome = () => {
    setSubject(null);
    setSection(null);
    setSelected(null);
    setQuery("");
  };
  const goSubject = (s: string) => {
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

  const crumbs: { label: string; onClick?: () => void }[] = [
    { label: "Source Document", ...(subject ? { onClick: goHome } : {}) },
    ...(subject ? [{ label: subject, ...(section ? { onClick: () => goSubject(subject) } : {}) }] : []),
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
                {items.length ? `${items.length} pairs loaded` : "No data imported yet"}
              </p>
            </div>
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              <Upload className="size-3.5" /> Import
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/70"
            >
              <Plus className="size-3.5" /> Add question
            </button>
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
        {items.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Upload className="size-7" />
            </span>
            <h2 className="text-lg font-semibold">Import your Q&amp;A dataset</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload an XLSX or CSV file to start reviewing. Nothing is shown until data is
              imported.
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Upload className="size-4" /> Choose file
            </button>
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

            {/* Level 1 — subjects */}
            {!subject && (
              <>
                <div className="mb-8 inline-flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
                  <FileText className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold" title={docName}>
                      {docs.length > 1 ? `${docs.length} manuals` : docName}
                    </p>
                    <p className="text-xs text-muted-foreground">Grounded source set</p>
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
                        <h2 className="text-2xl font-semibold tracking-tight">{subj}</h2>
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
                {sections.length === 0 && (
                  <p className="text-sm text-muted-foreground">No sections in this subject.</p>
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
                  <p className="mt-2 text-xs text-muted-foreground">{visible.length} pairs</p>
                </div>
                <ul className="divide-y divide-border">
                  {visible.map((it) => {
                    const r = reviews[it.id] ?? {};
                    return (
                      <li key={it.id}>
                        <button
                          onClick={() => setSelected(it.id)}
                          className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/70"
                        >
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
                  {visible.length === 0 && (
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
                  {...(currentIndex >= 0 && currentIndex < visible.length - 1
                    ? { onNext: () => go(1) }
                    : {})}
                  position={`${currentIndex + 1} / ${visible.length}`}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
