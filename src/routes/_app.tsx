import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { Download, FileSpreadsheet, LogOut } from "lucide-react";
import { exportCsv, exportXlsx, type QAItem } from "@/lib/qa";
import { ReviewsProvider, useReviews } from "@/lib/reviews";
import { logout, me } from "@/server/functions/auth";
import { listItems } from "@/server/functions/qa";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await me();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async () => {
    const items = await listItems();
    return { items };
  },
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { items } = Route.useLoaderData();

  return (
    <ReviewsProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
            <a href="/" className="flex items-center gap-3 text-left">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileSpreadsheet className="size-5" />
              </span>
              <div>
                <h1 className="text-base font-semibold leading-tight">Q&amp;A Review Console</h1>
                <p className="text-xs text-muted-foreground">
                  {items.length ? `${items.length} pairs loaded` : "No data available"}
                </p>
              </div>
            </a>
            <HeaderActions items={items} />
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <button
              onClick={async () => {
                await logout();
                await navigate({ to: "/login" });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              <LogOut className="size-3.5" /> Log out
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </ReviewsProvider>
  );
}

function HeaderActions({ items }: { items: QAItem[] }) {
  const { reviews } = useReviews();
  if (!items.length) return null;
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <button
        onClick={() => exportXlsx(items, reviews)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        <Download className="size-3.5" /> Export XLSX
      </button>
      <button
        onClick={() => exportCsv(items, reviews)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
      >
        <Download className="size-3.5" /> CSV
      </button>
    </div>
  );
}
