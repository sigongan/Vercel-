"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminUser {
  id: string;
  email: string | null;
  plan: string;
  credits: number;
  free_used_this_period: number;
  subscription_status: string | null;
  created_at: string;
}

interface AdminStats {
  summary: {
    totalUsers: number;
    proUsers: number;
    totalCredits: number;
    totalFreeUsedThisPeriod: number;
    uniqueExtractions: number;
    savedRecipes: number;
  };
  users: AdminUser[];
}

type Status = "loading" | "denied" | "ready" | "error";

export default function AdminPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (res.status === 403 || res.status === 401) {
          setStatus("denied");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        setData(await res.json());
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900 px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Admin</h1>
          <Link href="/" className="text-sm text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            ← Back to extractor
          </Link>
        </div>

        {status === "loading" && <div className="h-24" />}

        {status === "denied" && (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            You&apos;re not authorized to view this page.
          </p>
        )}

        {status === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t load admin data. Try again later.
          </p>
        )}

        {status === "ready" && data && (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Total users" value={data.summary.totalUsers} />
              <StatTile label="Pro subscribers" value={data.summary.proUsers} highlight />
              <StatTile label="Credits outstanding" value={data.summary.totalCredits} />
              <StatTile label="Free uses this period" value={data.summary.totalFreeUsedThisPeriod} />
              <StatTile label="Unique extractions" value={data.summary.uniqueExtractions} />
              <StatTile label="Saved recipes" value={data.summary.savedRecipes} />
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Users</h2>
              <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-700 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Subscription</th>
                      <th className="px-4 py-3 text-right">Credits</th>
                      <th className="px-4 py-3 text-right">Free used</th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-b border-stone-100 dark:border-stone-700 last:border-0">
                        <td className="px-4 py-2.5 text-stone-800 dark:text-stone-200">
                          {u.email ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {u.plan === "pro" ? (
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                              pro
                            </span>
                          ) : (
                            <span className="text-stone-400 text-xs">free</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-stone-500 dark:text-stone-400 text-xs">
                          {u.subscription_status ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-stone-700 dark:text-stone-300">
                          {u.credits}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-stone-700 dark:text-stone-300">
                          {u.free_used_this_period}
                        </td>
                        <td className="px-4 py-2.5 text-stone-500 dark:text-stone-400 text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {data.users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                          No users yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatTile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight
          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          highlight ? "text-emerald-700 dark:text-emerald-400" : "text-stone-900 dark:text-stone-100"
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
