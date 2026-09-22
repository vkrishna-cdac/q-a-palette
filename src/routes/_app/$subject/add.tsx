import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { SUBJECT_LABEL } from "@/lib/qa-constants";
import { addManualItem } from "@/server/functions/qa";

export const Route = createFileRoute("/_app/$subject/add")({
  component: AddQuestionPage,
});

function AddQuestionPage() {
  const { subject } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const valid = question.trim().length > 0 && answer.trim().length > 0;

  const submit = async () => {
    setIsSubmitting(true);
    try {
      await addManualItem({
        data: {
          subject,
          question: question.trim(),
          answer: answer.trim(),
          remarks: remarks.trim(),
        },
      });
      await router.invalidate();
      await navigate({ to: "/$subject", params: { subject } });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setQuestion("");
    setAnswer("");
    setRemarks("");
  }, [subject]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Add new question</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Saved to a separate "Added Questions" sheet in the exported workbook.
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/$subject", params: { subject } })}
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
            onClick={() => navigate({ to: "/$subject", params: { subject } })}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            disabled={!valid || isSubmitting}
            onClick={() => void submit()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {isSubmitting ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
