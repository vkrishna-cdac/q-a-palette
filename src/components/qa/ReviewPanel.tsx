import { useEffect, useState } from "react";
import { Star, ThumbsUp, ThumbsDown, Pencil, Check, X, Pen } from "lucide-react";
import { citationLine, type QAItem, type Review } from "@/lib/qa";

function Block({ text }: { text: string }) {
  if (!text) return <p className="text-sm italic text-muted-foreground">No content in source.</p>;
  return (
    <div className="space-y-2">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line text-[0.9rem] leading-7 text-foreground/90">
          {para}
        </p>
      ))}
    </div>
  );
}

function Editable({
  label,
  value,
  original,
  onSave,
}: {
  label: string;
  value: string;
  original: string;
  onSave: (v: string | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
    setEditing(false);
  }, [value, label]);

  return (
    <section className="panel p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </h3>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Check className="size-3.5" /> Save
            </button>
            <button
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              <X className="size-3.5" /> Cancel
            </button>
            {value !== original && (
              <button
                onClick={() => {
                  onSave(undefined);
                  setEditing(false);
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                Revert
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/70"
          >
            <Pencil className="size-3.5" /> Edit {label}
          </button>
        )}
      </header>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(24, Math.max(6, draft.split("\n").length + 3))}
          className="w-full resize-y rounded-lg border border-input bg-background p-3 text-[0.9rem] leading-7 outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <Block text={value} />
      )}
    </section>
  );
}

export function ReviewPanel({
  item,
  review,
  onChange,
}: {
  item: QAItem | null;
  review: Review;
  onChange: (patch: Review) => void;
}) {
  if (!item)
    return (
      <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted-foreground">
        Select a question to review its answer, reasoning and citation.
      </div>
    );

  const answer = review.answer ?? item.answer;
  const cot = review.cot ?? item.cot;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 pb-24">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.7rem] font-medium">
        <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
          {item.subject}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
          {item.section}
        </span>
        {review.edited && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 text-[0.7rem] font-semibold text-foreground">
            <Pen className="size-3" /> Edited
          </span>
        )}
      </div>

      <h2 className="text-xl leading-snug font-semibold">{item.question}</h2>
      <p className="mt-2 text-xs text-muted-foreground">{citationLine(item)}</p>

      <div className="mt-5 space-y-4">
        <Editable
          label="Answer"
          value={answer}
          original={item.answer}
          onSave={(v) =>
            onChange({ answer: v, edited: v !== undefined || review.cot !== undefined })
          }
        />
        <Editable
          label="CoT"
          value={cot}
          original={item.cot}
          onSave={(v) =>
            onChange({ cot: v, edited: v !== undefined || review.answer !== undefined })
          }
        />

        <section className="panel p-5">
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Evaluation
          </h3>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`${n} star`}
                  onClick={() => onChange({ rating: review.rating === n ? 0 : n })}
                >
                  <Star
                    className={`size-6 transition-transform hover:scale-110 ${
                      (review.rating ?? 0) >= n
                        ? "fill-gold text-gold"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onChange({ liked: review.liked === "up" ? null : "up" })}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  review.liked === "up"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <ThumbsUp className="size-3.5" /> Like
              </button>
              <button
                onClick={() => onChange({ liked: review.liked === "down" ? null : "down" })}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  review.liked === "down"
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <ThumbsDown className="size-3.5" /> Unlike
              </button>
            </div>
          </div>
          <textarea
            value={review.comment ?? ""}
            onChange={(e) => onChange({ comment: e.target.value })}
            placeholder="Comments…"
            rows={3}
            className="mt-4 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {item.chunkContent && (
          <section className="panel p-5">
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Source Chunk · {item.chunkName || "chunk"}
            </h3>
            <Block text={item.chunkContent} />
          </section>
        )}
      </div>
    </div>
  );
}
