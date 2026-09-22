import { useMemo } from "react";
import { createFileRoute, Link, useLoaderData, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ReviewPanel } from "@/components/qa/ReviewPanel";
import { SUBJECT_LABEL } from "@/lib/qa-constants";
import { useReviews } from "@/lib/reviews";

export const Route = createFileRoute("/_app/$subject/$section/$questionId")({
  component: QuestionPage,
});

function QuestionPage() {
  const { subject, section, questionId } = Route.useParams();
  const navigate = useNavigate();
  const { items } = useLoaderData({ from: "/_app" });
  const { reviews, patch } = useReviews();

  const sectionItems = useMemo(
    () => items.filter((i) => i.subject === subject && i.section === section),
    [items, subject, section],
  );
  const current = sectionItems.find((i) => i.id === questionId) ?? null;
  const currentIndex = current ? sectionItems.findIndex((i) => i.id === current.id) : -1;

  const go = (delta: number) => {
    const next = sectionItems[currentIndex + delta];
    if (next)
      void navigate({
        to: "/$subject/$section/$questionId",
        params: { subject, section, questionId: next.id },
      });
  };

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
        <Link
          to="/$subject/$section"
          params={{ subject, section }}
          className="rounded px-1.5 py-0.5 font-medium text-primary hover:bg-secondary"
        >
          {section}
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="px-1.5 py-0.5 font-semibold text-foreground">Question</span>
      </nav>
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <ReviewPanel
          item={current}
          review={current ? (reviews[current.id] ?? {}) : {}}
          onChange={(p) => current && patch(current.id, p)}
          {...(currentIndex > 0 ? { onPrev: () => go(-1) } : {})}
          {...(currentIndex >= 0 && currentIndex < sectionItems.length - 1
            ? { onNext: () => go(1) }
            : {})}
          {...(currentIndex >= 0
            ? { position: `${currentIndex + 1} / ${sectionItems.length}` }
            : {})}
        />
      </div>
    </>
  );
}
