import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  FileText,
  Pen,
  Star,
  Package,
  HardHat,
  HeadphonesIcon,
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

const SUBJECT_META: Record<
  string,
  { icon: React.ElementType; color: string; desc: string }
> = {
  Goods: { icon: Package, color: "bg-blue-600", desc: "Tangible products and supplies" },
  Works: { icon: HardHat, color: "bg-sky-500", desc: "Construction and civil works" },
  Services: { icon: HeadphonesIcon, color: "bg-indigo-500", desc: "Consultancy and service contracts" },
};

function Home() {
  const [items, setItems] = useState<QAItem[]>([]);
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
      if (d) setItems(toItems(JSON.parse(d)));
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
    return Array.from(map.entries()).sort((a, b) => {
      const ai = SUBJECT_ORDER.indexOf(a[0]);
      const bi = SUBJECT_ORDER.indexOf(b[0]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        SUBJECT_ORDER.includes(i.subject) &&
        (!subject || i.subject === subject) &&
        (!section || i.section === section) &&
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

  async function onImport(file: File) {
    const rows = await parseFile(file);
    setItems(toItems(rows));
    setSubject(null);
    setSection(null);
    setSelected(null);
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(rows));
    } catch {
      /* dataset too large to cache */
    }
  }

  const enterSubject = (s: string) => {
    setSubject(s);
    setSection(null);
    setSelected(null);
    setQuery("");
  };

  const backHome = () => {
    setSubject(null);
    setSection(null);
    setSelected(null);
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight">Q&amp;A Review Console</h1>
              <p className="text-xs text-muted-foreground">
                {items.length} questions · {SUBJECT_ORDER.length} subjects
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {subject && (
              <button
                onClick={backHome}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
              >
                <ChevronLeft className="size-3.5" /> Back to subjects
              </button>
            )}
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
          </div>
        </div>
      </header>

      {!subject ? (
        <main className="mx-auto max-w-5xl p-8">
          <div className="mb-10 text-center">
            <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Source Document
            </p>
            <div className="mx-auto mt-3 inline-flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
              <FileText className="size-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-semibold" title={docName}>
                  {docs.length > 1 ? `${docs.length} manuals` : docName}
                </p>
                <p className="text-xs text-muted-foreground">Procurement manuals · grounded set</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tree.map(([subj, sections]) => {
              const total = Array.from(sections.values()).reduce((a, b) => a + b, 0);
              const meta = SUBJECT_META[subj] ?? {
                icon: Package,
                color: "bg-primary",
                desc: "Procurement category",
              };
              const Icon = meta.icon;
              return (
                <button
                  key={subj}
                  onClick={() => enterSubject(subj)}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <span
                    className={`mb-4 flex size-14 items-center justify-center rounded-2xl text-primary-foreground shadow ${meta.color}`}
                  >
                    <Icon className="size-7" />
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight">{subj}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{meta.desc}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-3xl font-bold text-foreground">{total}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Review <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_24rem_minmax(0,1fr)]">
          {/* Source document tree */}
          <aside className="panel h-fit p-4 lg:sticky lg:top-24">
            <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Source Document
            </p>
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-secondary p-3">
              <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={docName}>
                  {docs.length > 1 ? `${docs.length} manuals` : docName}
                </p>
                <p className="text-xs text-muted-foreground">Procurement manuals · grounded set</p>
              </div>
            </div>

            <nav className="mt-4 space-y-1">
              {tree.map(([subj, sections]) => {
                const open = subject === subj;
                const total = Array.from(sections.values()).reduce((a, b) => a + b, 0);
                return (
                  <div key={subj}>
                    <button
                      onClick={() => {
                        if (open) backHome();
                        else enterSubject(subj);
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                        open ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      }`}
                    >
                      <ChevronRight
                        className={`size-4 transition-transform ${open ? "rotate-90" : ""}`}
                      />
                      <span className="flex-1 text-left">{subj}</span>
                      <span className="text-xs opacity-70">{total}</span>
                    </button>
                    {open && (
                      <div className="mt-1 ml-4 space-y-0.5 border-l border-border pl-2">
                        {Array.from(sections.entries())
                          .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
                          .map(([sec, count]) => (
                            <button
                              key={sec}
                              onClick={() => setSection(section === sec ? null : sec)}
                              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[0.82rem] ${
                                section === sec
                                  ? "bg-accent font-semibold text-accent-foreground"
                                  : "hover:bg-secondary"
                              }`}
                            >
                              <span className="flex-1">{sec}</span>
                              <span className="text-xs text-muted-foreground">{count}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Question list */}
          <section className="panel h-fit overflow-hidden xl:sticky xl:top-24 xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">
                  {subject}
                  {section ? ` · ${section}` : ""}
                </p>
                <span className="text-xs text-muted-foreground">({visible.length})</span>
              </div>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions"
                  className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <ul className="divide-y divide-border">
              {visible.map((it) => {
                const r = reviews[it.id] ?? {};
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => setSelected(it.id)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        selected === it.id ? "bg-accent/60" : "hover:bg-secondary/70"
                      }`}
                    >
                      <p className="line-clamp-3 text-[0.86rem] font-medium leading-6">
                        {it.question}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.68rem] text-muted-foreground">
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
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No questions match this filter.
                </li>
              )}
            </ul>
          </section>

          {/* Review panel */}
          <section className="panel min-h-[60vh] xl:max-h-[calc(100vh-7.5rem)] xl:overflow-hidden">
            <ReviewPanel
              item={current}
              review={current ? (reviews[current.id] ?? {}) : {}}
              onChange={(p) => current && patch(current.id, p)}
              {...(currentIndex > 0 ? { onPrev: () => go(-1) } : {})}
              {...(currentIndex >= 0 && currentIndex < visible.length - 1
                ? { onNext: () => go(1) }
                : {})}
              {...(currentIndex >= 0
                ? { position: `${currentIndex + 1} / ${visible.length}` }
                : {})}
            />
          </section>
        </div>
      )}
    </div>
  );
}

