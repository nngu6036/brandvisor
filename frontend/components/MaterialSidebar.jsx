"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useBrandStore } from "../lib/store";
import { fetchProjectMaterials } from "../lib/api";
import { PROJECT_MATERIAL_STATUS } from "../lib/constants";

const STATUS_DOT = {
  [PROJECT_MATERIAL_STATUS.INITIAL]: "bg-zinc-300",
  [PROJECT_MATERIAL_STATUS.LOADED]: "bg-emerald-400",
  [PROJECT_MATERIAL_STATUS.FAILED]: "bg-red-400"
};

export default function MaterialSidebar() {
  const projectId = useBrandStore((s) => s.activeProject?.id);
  if (!projectId) return null;

  const q = useQuery({
    queryKey: ["materials", projectId],
    queryFn: () => fetchProjectMaterials(projectId),
    enabled: !!projectId
  });

  const materials = q.data?.materials ?? [];

  // Order materials: LOADED -> INITIAL -> FAILED, then newest first
  const sorted = useMemo(() => {
    const statusRank = (m) => {
      const s = getMaterialStatus(m);
      if (s === PROJECT_MATERIAL_STATUS.LOADED) return 0;
      if (s === PROJECT_MATERIAL_STATUS.INITIAL) return 1;
      if (s === PROJECT_MATERIAL_STATUS.FAILED) return 2;
      return 3;
    };

    const timeOf = (m) =>
      Date.parse(m?.updated_at || m?.created_at || m?.timestamp || "") || 0;

    return [...materials].sort((a, b) => {
      const ra = statusRank(a);
      const rb = statusRank(b);
      if (ra !== rb) return ra - rb;
      return timeOf(b) - timeOf(a);
    });
  }, [materials]);

  return (
    <aside className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Header only: indigo background */}
      <div className="rounded-t-2xl bg-indigo-600 px-3 py-2.5">
        <div className="text-[13px] text-sm font-semibold text-white">Materials</div>
      </div>

      <div className="px-0 py-0">
        {q.isLoading && (
          <div className="px-3 py-2 text-sm text-zinc-600">Loading…</div>
        )}

        {q.error && (
          <div className="mx-3 my-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Failed to load materials: {String(q.error.message)}
          </div>
        )}

        {!q.isLoading && !q.error && sorted.length === 0 && (
          <div className="px-3 py-2 text-sm text-zinc-600">No materials yet.</div>
        )}

        <ul className="divide-y divide-zinc-100">
          {sorted.map((m) => {
            const id =
              m?.id ||
              m?._id ||
              `${m?.category || "mat"}-${m?.title || ""}-${m?.source || ""}`;

            const title = m?.title || "Untitled";
            const source = m?.source || "—";
            const url = getMaterialUrl(m);

            const status = getMaterialStatus(m);
            const dotClass = STATUS_DOT[status] ?? "bg-zinc-300";

            return (
              <li key={id} className="px-3 py-1.5 hover:bg-zinc-50">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
                    title={`Status: ${String(status || "unknown")}`}
                    aria-label={`Material status: ${String(status || "unknown")}`}
                  />

                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[11px] font-medium text-zinc-900">
                      {title}
                    </div>
                    <div className="truncate text-[10px] font-semibold text-zinc-600">
                      {source}
                    </div>
                  </div>

                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      title="Download / open"
                      aria-label="Download / open"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-300"
                      title="No URL available"
                      aria-label="No URL available"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function getMaterialStatus(m) {
  const raw =
    m?.status ??
    m?.material_status ??
    m?.materialStatus ??
    m?.state ??
    m?.payload?.status ??
    PROJECT_MATERIAL_STATUS.INITIAL;

  const s = String(raw || "").trim().toLowerCase();

  if (s === PROJECT_MATERIAL_STATUS.LOADED) return PROJECT_MATERIAL_STATUS.LOADED;
  if (s === PROJECT_MATERIAL_STATUS.FAILED) return PROJECT_MATERIAL_STATUS.FAILED;
  return PROJECT_MATERIAL_STATUS.INITIAL;
}

function getMaterialUrl(m) {
  if (typeof m?.file === "string" && looksLikeUrl(m.file)) return m.file;

  const purl = m?.payload?.url;
  if (typeof purl === "string" && looksLikeUrl(purl)) return purl;

  const durl = m?.payload?.download_url;
  if (typeof durl === "string" && looksLikeUrl(durl)) return durl;

  return null;
}

function looksLikeUrl(s) {
  return /^https?:\/\/\S+/i.test(String(s || "").trim());
}
