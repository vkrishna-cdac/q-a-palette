import type { ElementType } from "react";
import { Package, HardHat, Headphones } from "lucide-react";

export const SUBJECT_ORDER = ["Goods", "Works", "Services"];

export const SUBJECT_LABEL: Record<string, string> = {
  Goods: "MANUAL FOR PROCUREMENT OF GOODS",
  Works: "MANUAL FOR PROCUREMENT OF WORKS",
  Services: "MANUAL FOR PROCUREMENT OF CONSULTANCY & OTHER SERVICES",
};

export const SUBJECT_META: Record<string, { icon: ElementType; color: string }> = {
  Goods: { icon: Package, color: "bg-blue-600" },
  Works: { icon: HardHat, color: "bg-sky-500" },
  Services: { icon: Headphones, color: "bg-indigo-500" },
};

// Tile colours for the Level-3 question list.
// EDITED: answer/cot was changed. EVALUATED: has any evaluation field but not edited.
export const EDITED_TILE_CLASS = "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20";
export const EVALUATED_TILE_CLASS = "bg-green-50 hover:bg-green-100 dark:bg-green-950/20";
