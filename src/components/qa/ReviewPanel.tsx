import { useEffect, useState } from "react";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Check,
  X,
  Pen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { citationLine, type QAItem, type Review } from "@/lib/qa";
import { toast } from "sonner";

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

function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="panel overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left hover:bg-secondary/60"
      >
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <span className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </button>
      {open && <div className="border-t border-border p-5">{children}</div>}
    </section>
  );
}

function Editable({
  label,
  value,
  original,
  onApply,
  collapsible = false,
}: {
  label: string;
  value: string;
  original: string;
  onApply: (v: string | undefined) => void;
  collapsible?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(!collapsible);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
    setEditing(false);
    if (collapsible) setOpen(false);
  }, [value, label, collapsible]);

  return (
    <section className="panel p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        {collapsible ? (
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left">
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
            />
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </h3>
          </button>
        ) : (
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </h3>
        )}
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                onApply(draft);
                setEditing(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Check className="size-3.5" /> Apply
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
                  onApply(undefined);
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
            onClick={() => {
              setOpen(true);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/70"
          >
            <Pencil className="size-3.5" /> Edit {label}
          </button>
        )}
      </header>
      {open &&
        (editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(24, Math.max(6, draft.split("\n").length + 3))}
            className="w-full resize-y rounded-lg border border-input bg-background p-3 text-[0.9rem] leading-7 outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <Block text={value} />
        ))}
    </section>
  );
}

function Choice({
  title,
  hint,
  options,
  value,
  onSelect,
}: {
  title: string;
  hint?: string | undefined;
  options: string[];
  value?: string | undefined;
  onSelect: (v: string | undefined) => void;
}) {
  return (
    <div className="border-t border-border pt-4 first:border-0 first:pt-0">
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onSelect(value === o ? undefined : o)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
              value === o
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-secondary"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function EvaluationFields({ draft, onSet }: { draft: Review; onSet: (p: Review) => void }) {
  return (
    <section className="panel space-y-4 p-5">
      <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Evaluation
      </h3>

      <Choice
        title="Correct?"
        hint="Is the answer factually right?"
        options={["Yes", "No", "Can't tell"]}
        value={draft.correct}
        onSelect={(v) => onSet({ correct: v })}
      />
      <Choice
        title="Is the reference from the source correct?"
        hint="Everything in the answer is supported by the source."
        options={["Yes", "No", "Can't tell"]}
        value={draft.grounded}
        onSelect={(v) => onSet({ grounded: v })}
      />
      <Choice
        title="Complete?"
        hint="Does it answer exactly what was asked?"
        options={["Fully answers", "Partial", "Answers more than asked"]}
        value={draft.complete}
        onSelect={(v) => onSet({ complete: v })}
      />
      <Choice
        title="Is the answer language as per NRL style?"
        hint="Right style and length for a training example."
        options={["Yes", "No", "Can't tell"]}
        value={draft.tone}
        onSelect={(v) => onSet({ tone: v })}
      />

      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold">Quick verdict</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => onSet({ liked: draft.liked === "up" ? null : "up" })}
            className={`inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-xs font-semibold ${
              draft.liked === "up"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-secondary"
            }`}
          >
            <ThumbsUp className="size-3.5" /> Liked
          </button>
          <button
            onClick={() => onSet({ liked: draft.liked === "down" ? null : "down" })}
            className={`inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-xs font-semibold ${
              draft.liked === "down"
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "border-border hover:bg-secondary"
            }`}
          >
            <ThumbsDown className="size-3.5" /> Disliked
          </button>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold">Overall rating</p>
        <p className="mt-0.5 text-xs text-muted-foreground">How good is this pair, 1–5?</p>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              aria-label={`${n} star`}
              onClick={() => onSet({ rating: draft.rating === n ? 0 : n })}
            >
              <Star
                className={`size-6 transition-transform hover:scale-110 ${
                  (draft.rating ?? 0) >= n ? "fill-gold text-gold" : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            {draft.rating ? `${draft.rating} / 5` : "not rated"}
          </span>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold">Comments(Optional)</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Anything else worth noting.</p>
        <textarea
          value={draft.comment ?? ""}
          onChange={(e) => onSet({ comment: e.target.value })}
          placeholder="Comments…"
          rows={3}
          className="mt-2 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </section>
  );
}

function SaveBar({
  onSave,
  canSave,
  dirty,
  saved,
}: {
  onSave: () => void;
  canSave: boolean;
  dirty: boolean;
  saved: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-6 border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-end">
        <button
          disabled={!canSave || (!dirty && saved)}
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          <Check className="size-4" /> {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function ReviewPanel({
  item,
  review,
  onChange,
  onPrev,
  onNext,
  position,
}: {
  item: QAItem | null;
  review: Review;
  onChange: (patch: Review) => void;
  onPrev?: () => void;
  onNext?: () => void;
  position?: string;
}) {
  const [draft, setDraft] = useState<Review>(review);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setDraft(review);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item)
    return (
      <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted-foreground">
        Select a question to review its answer, reasoning and citation.
      </div>
    );

  const set = (p: Review) => {
    setDraft((d) => ({ ...d, ...p }));
    setSaved(false);
  };

  const answer = draft.answer ?? item.answer;
  const cot = draft.cot ?? item.cot;
  const edited = draft.answer !== undefined || draft.cot !== undefined;

  const missing: string[] = [];
  if (!draft.correct) missing.push("Correct?");
  if (!draft.grounded) missing.push("Grounded?");
  if (!draft.complete) missing.push("Complete?");
  if (!draft.tone) missing.push("Tone & format");
  if (!draft.rating) missing.push("Overall rating");
  const canSave = missing.length === 0;

  const dirty = JSON.stringify(draft) !== JSON.stringify(review);

  const save = () => {
    onChange({ ...draft, edited });
    setSaved(true);
    toast.success("Saved");
    window.setTimeout(() => setSaved(false), 2500);
  };

  if (item.manual)
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6 pb-24">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.7rem] font-medium">
          <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
            {item.subject}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            {item.section}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {position && <span className="text-xs text-muted-foreground">{position}</span>}
            <button
              aria-label="Previous question"
              onClick={onPrev}
              disabled={!onPrev}
              className="rounded-md border border-border p-1.5 hover:bg-secondary disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next question"
              onClick={onNext}
              disabled={!onNext}
              className="rounded-md border border-border p-1.5 hover:bg-secondary disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <section className="panel p-5">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Category
            </h3>
            <p className="mt-3 text-[0.92rem] font-medium leading-7">{item.subject || "—"}</p>
          </section>
          <section className="panel p-5">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Question
            </h3>
            <p className="mt-3 whitespace-pre-line text-[0.92rem] leading-7 text-foreground/90">
              {item.question || "—"}
            </p>
          </section>
          <section className="panel p-5">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Answer
            </h3>
            <p className="mt-3 whitespace-pre-line text-[0.9rem] leading-7 text-foreground/90">
              {item.answer || "—"}
            </p>
          </section>
          <section className="panel p-5">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Remarks
            </h3>
            <p className="mt-3 whitespace-pre-line text-[0.9rem] leading-7 text-foreground/90">
              {String(item.raw["remarks"] ?? "") || "—"}
            </p>
          </section>
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 pb-24">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.7rem] font-medium">
        <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
          {item.subject}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
          {item.section}
        </span>
        {edited && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 text-[0.7rem] font-semibold text-foreground">
            <Pen className="size-3" /> Edited
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {position && <span className="text-xs text-muted-foreground">{position}</span>}
          <button
            aria-label="Previous question"
            onClick={onPrev}
            disabled={!onPrev}
            className="rounded-md border border-border p-1.5 hover:bg-secondary disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Next question"
            onClick={onNext}
            disabled={!onNext}
            className="rounded-md border border-border p-1.5 hover:bg-secondary disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <h2 className="text-xl leading-snug font-semibold">{item.question}</h2>
      <p className="mt-2 text-xs text-muted-foreground">{citationLine(item)}</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[3fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Editable
            label="Answer"
            value={answer}
            original={item.answer}
            onApply={(v) => set({ answer: v })}
          />
          <Editable
            label="Chain of thought"
            collapsible
            value={cot}
            original={item.cot}
            onApply={(v) => set({ cot: v })}
          />

          {item.chunkContent && (
            <Collapsible title={`Source Chunk · ${item.chunkName || "chunk"}`}>
              <Block text={item.chunkContent} />
            </Collapsible>
          )}
        </div>

        <EvaluationFields draft={draft} onSet={set} />
      </div>

      <SaveBar canSave={canSave} dirty={dirty} saved={saved} onSave={save} />
    </div>
  );
}
