import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Review, ReviewMap } from "@/lib/qa";

const REVIEW_KEY = "qa-reviews-v1";

interface ReviewsContextValue {
  reviews: ReviewMap;
  patch: (id: string, p: Review) => void;
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export function useReviews(): ReviewsContextValue {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error("useReviews must be used within the authenticated app layout");
  return ctx;
}

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<ReviewMap>({});

  useEffect(() => {
    try {
      const r = localStorage.getItem(REVIEW_KEY);
      if (r) setReviews(JSON.parse(r));
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

  const patch = (id: string, p: Review) =>
    setReviews((prev) => {
      const next = { ...(prev[id] ?? {}), ...p };
      if (next.answer === undefined && next.cot === undefined) next.edited = false;
      return { ...prev, [id]: next };
    });

  return <ReviewsContext.Provider value={{ reviews, patch }}>{children}</ReviewsContext.Provider>;
}
