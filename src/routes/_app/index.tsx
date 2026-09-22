import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight, FileText, Package } from "lucide-react";
import { SUBJECT_LABEL, SUBJECT_META, SUBJECT_ORDER } from "@/lib/qa-constants";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Procurement Q&A Review Console" },
      {
        name: "description",
        content:
          "Review grounded procurement Q&A by source document, subject and section with ratings, comments and XLSX/CSV import & export.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { items } = useLoaderData({ from: "/_app" });
  const itemsWithoutManual = useMemo(() => items.filter((i) => !i.manual), [items]);
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

  if (items.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <FileText className="size-7" />
        </span>
        <h2 className="text-lg font-semibold">No data available</h2>
        <p className="mt-2 text-sm text-muted-foreground">The qa_items table is empty.</p>
      </div>
    );
  }

  return (
    <>
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="px-1.5 py-0.5 font-semibold text-foreground">Source Document</span>
      </nav>
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
            <Link
              key={subj}
              to="/$subject"
              params={{ subject: subj }}
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
                  <span className="text-sm font-medium text-muted-foreground">Q/A pairs</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Open
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
