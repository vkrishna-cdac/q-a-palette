import { useMemo, useState } from "react";
import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { ChevronRight, Pen, Search, Star } from "lucide-react";
import { citationLine } from "@/lib/qa";
import { SUBJECT_LABEL, EDITED_TILE_CLASS, EVALUATED_TILE_CLASS } from "@/lib/qa-constants";
import { useReviews } from "@/lib/reviews";

export const Route = createFileRoute("/_app/$subject/$section/")({
  component: SectionPage,
});

function SectionPage() {
  const { subject, section } = Route.useParams();
  const { items } = useLoaderData({ from: "/_app" });
  const { reviews } = useReviews();
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.subject === subject &&
        i.section === section &&
        (!q || i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q)),
    );
  }, [items, subject, section, query]);

  return (
    <>
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
        <Link to="/" className="rounded px-1.5 py-0.5 font-medium text-primary hover:bg-secondary">
          Source Document
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <Link
          to="/$subject"
          params={{ subject }}
          className="rounded px-1.5 py-0.5 font-medium text-primary hover:bg-secondary"
        >
          {SUBJECT_LABEL[subject] ?? subject}
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="px-1.5 py-0.5 font-semibold text-foreground">{section}</span>
      </nav>
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
                <Link
                  to="/$subject/$section/$questionId"
                  params={{ subject, section, questionId: it.id }}
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
                </Link>
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
    </>
  );
}
