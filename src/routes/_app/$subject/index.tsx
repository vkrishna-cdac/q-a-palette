import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight, FolderOpen, Plus } from "lucide-react";
import { SUBJECT_LABEL } from "@/lib/qa-constants";

export const Route = createFileRoute("/_app/$subject/")({
  component: SubjectPage,
});

function SubjectPage() {
  const { subject } = Route.useParams();
  const { items } = useLoaderData({ from: "/_app" });

  const sections = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      if (it.manual || it.subject !== subject) continue;
      counts.set(it.section, (counts.get(it.section) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true }),
    );
  }, [items, subject]);

  const addedCount = useMemo(
    () => items.filter((i) => i.manual && i.subject === subject).length,
    [items, subject],
  );

  return (
    <>
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
        <Link to="/" className="rounded px-1.5 py-0.5 font-medium text-primary hover:bg-secondary">
          Source Document
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="px-1.5 py-0.5 font-semibold text-foreground">
          {SUBJECT_LABEL[subject] ?? subject}
        </span>
      </nav>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(([sec, count]) => (
          <Link
            key={sec}
            to="/$subject/$section"
            params={{ subject, section: sec }}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <FolderOpen className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-6">{sec}</p>
              <p className="mt-1 text-xs text-muted-foreground">{count} pairs</p>
            </div>
            <ChevronRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
        {addedCount > 0 && (
          <Link
            to="/$subject/$section"
            params={{ subject, section: "Added Questions" }}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <FolderOpen className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-6">Added Questions</p>
              <p className="mt-1 text-xs text-muted-foreground">{addedCount} pairs</p>
            </div>
            <ChevronRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
        <Link
          to="/$subject/add"
          params={{ subject }}
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
        </Link>
        {sections.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            No sections in this subject.
          </p>
        )}
      </div>
    </>
  );
}
