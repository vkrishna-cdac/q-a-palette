import * as XLSX from "xlsx";
import Papa from "papaparse";

export type Row = Record<string, unknown>;

export interface QAItem {
  id: string;
  sourceDoc: string;
  subject: string; // Goods | Works | Services | Others
  section: string;
  chunkName: string;
  chunkPageRange: string;
  citedManual: string;
  citedPage: string;
  question: string;
  answer: string;
  cot: string;
  chunkContent: string;
  raw: Row;
}

export interface Review {
  answer?: string | undefined;
  cot?: string | undefined;
  rating?: number | undefined;
  liked?: "up" | "down" | null | undefined;
  comment?: string | undefined;
  edited?: boolean | undefined;
  correct?: string | undefined;
  grounded?: string | undefined;
  complete?: string | undefined;
  realistic?: string | undefined;
  tone?: string | undefined;
  ship?: string | undefined;
}

export type ReviewMap = Record<string, Review>;

/** Normalise a raw subject label into the three procurement families. */
export function normalizeSubject(value: unknown): string {
  const v = String(value ?? "").trim();
  if (!v || /^unlabell?ed$/i.test(v)) return "Extra";
  if (/^extras?$/i.test(v)) return "Extra";
  if (/good/i.test(v)) return "Goods";
  if (/work/i.test(v)) return "Works";
  if (/consult|service/i.test(v)) return "Services";
  return v;
}

export function normalizeLabel(value: unknown, fallback = "Extra"): string {
  const v = String(value ?? "").trim();
  if (!v) return fallback;
  if (/^unlabell?ed$/i.test(v)) return "Extra";
  if (/^extras?$/i.test(v)) return "Extra";
  return v;
}

/** Remove stray markdown asterisks/bullets without inventing or dropping content. */
export function cleanText(input: unknown): string {
  let t = String(input ?? "");
  if (!t.trim()) return "";
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/\*\*(.*?)\*\*/g, "$1");
  t = t.replace(/(^|\s)\*+(?=\S)/g, "$1");
  t = t.replace(/(?<=\S)\*+(?=\s|$)/g, "");
  t = t
    .split("\n")
    .map((l) => l.replace(/\s+$/, "").replace(/^\s*#{1,6}\s+/, "").replace(/^\s*[-•]\s+/, "• "))
    .join("\n");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) {
    const hit = Object.keys(r).find((x) => x.toLowerCase().trim() === k.toLowerCase());
    if (hit && r[hit] !== undefined && r[hit] !== null && String(r[hit]).trim() !== "")
      return String(r[hit]);
  }
  return "";
};

export function toItems(rows: Row[]): QAItem[] {
  return rows
    .filter((r) => pick(r, "question_text", "question").trim() !== "")
    .map((r, i) => ({
      id: pick(r, "questionId", "id") || `q-${i}`,
      sourceDoc: normalizeLabel(pick(r, "source_doc", "document"), "Others"),
      subject: normalizeSubject(pick(r, "source_subject", "subject")),
      section: normalizeLabel(pick(r, "section"), "Others"),
      chunkName: pick(r, "chunkName", "chunk_name"),
      chunkPageRange: pick(r, "chunk_page_range"),
      citedManual: normalizeLabel(pick(r, "cited_manual"), ""),
      citedPage: pick(r, "cited_page"),
      question: cleanText(pick(r, "question_text", "question")),
      answer: cleanText(pick(r, "answer")),
      cot: cleanText(pick(r, "cot", "chain_of_thought")),
      chunkContent: cleanText(pick(r, "chunk_content")),
      raw: r,
    }));
}

export function citationLine(it: QAItem): string {
  const parts: string[] = [];
  if (it.chunkPageRange) parts.push(`Chunk p.${it.chunkPageRange.replace(/-/g, "–")}`);
  if (it.citedPage) parts.push(`Cited p.${it.citedPage}`);
  if (it.citedManual) parts.push(it.citedManual);
  return parts.join(" → ");
}

export async function parseFile(file: File): Promise<Row[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const text = await file.text();
    const res = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
    return res.data as Row[];
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const sheet = wb.Sheets[first];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
}

function exportRows(items: QAItem[], reviews: ReviewMap): Row[] {
  return items.map((it) => {
    const r = reviews[it.id] ?? {};
    return {
      ...it.raw,
      source_subject: it.subject,
      answer: r.answer ?? it.answer,
      cot: r.cot ?? it.cot,
      edited: r.edited ? "TRUE" : "FALSE",
      "review.rating": r.rating ?? "",
      "review.feedback": r.liked ?? "",
      "review.notes": r.comment ?? "",
      "review.correct": r.correct ?? "",
      "review.grounded": r.grounded ?? "",
      "review.complete": r.complete ?? "",
      "review.realistic": r.realistic ?? "",
      "review.tone": r.tone ?? "",
      "review.ship": r.ship ?? "",
    };
  });
}

export function exportXlsx(items: QAItem[], reviews: ReviewMap, filename = "qa-review.xlsx") {
  const ws = XLSX.utils.json_to_sheet(exportRows(items, reviews));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Review");
  XLSX.writeFile(wb, filename);
}

export function exportCsv(items: QAItem[], reviews: ReviewMap, filename = "qa-review.csv") {
  const csv = Papa.unparse(exportRows(items, reviews) as object[]);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
