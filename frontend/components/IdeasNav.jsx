"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsPointingOutIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useBrandStore } from "../lib/store";
import { PROJECT_WORKFLOW_STATE, PROJECT_WORKFLOW_TYPE, SCORING_CATEGORY, PROJECT_WORKFLOW_STATUS } from "../lib/constants";
import { fetchProjectIdeas } from "../lib/api";

export default function IdeasNav({
  selectedId = null,
  onSelect,
  onMaximize,
  onRevise,
  reviseLoading = false
}) {
  const projectId = useBrandStore((s) => s.activeProject?.id);
  const projectType = useBrandStore((s) => s.activeProject?.type);
  const workflowState = useBrandStore((s) => s.activeProject?.workflow_state);
  const workflowStatus = useBrandStore((s) => s.activeProject?.workflow_status);
  const workflowType = useBrandStore((s) => s.activeProject?.workflow_type);
  const storedIdeas = useBrandStore((s) => s.projectIdeas);
  const ideasProjectId = useBrandStore((s) => s.projectIdeasProjectId);
  const ideasLoading = useBrandStore((s) => s.projectIdeasLoading);
  const setIdeasState = useBrandStore((s) => s.setProjectIdeasState);
  const clearIdeas = useBrandStore((s) => s.clearProjectIdeas);

  const requestIdRef = useRef(0);
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false);
  const [dialogIdea, setDialogIdea] = useState(null);

  const normalize = (v) => String(v ?? "").toUpperCase();

  const ideas = Array.isArray(storedIdeas) ? storedIdeas : [];
  const top10 = useMemo(() => ideas.slice(0, 10), [ideas]);

  const scoreOf = (x) => {
    const v = x?.score;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const formatScore = (score) => {
    if (score == null) return null;
    const n = typeof score === "number" ? score : Number(score);
    if (!Number.isFinite(n)) return null;
    if (Math.abs(n) >= 100) return String(Math.round(n));
    const s = n.toFixed(1);
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  };

  const canRevise = normalize(workflowState) === PROJECT_WORKFLOW_STATE.FINISH;
  const isScoringRunning =
    normalize(workflowState) === PROJECT_WORKFLOW_STATE.SCORE &&
    normalize(workflowStatus) === PROJECT_WORKFLOW_STATUS.RUNNING;
  const reviseLabel =
    projectType === "innovation" ? "Revise Ideas" : "Revise Strategy";

  const ideaContentOf = (idea) =>
    String(idea?.content ?? idea?.idea_content ?? idea?.description ?? idea?.summary ?? "").trim();

  const evaluationToChartData = (evaluation) => {
    if (!evaluation || typeof evaluation !== "object") return [];
    const data = [];
    for (const [key, values] of Object.entries(evaluation)) {
      let avgValue = 0;
      if (Array.isArray(values) && values.length > 0) {
        const sum = values.reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
        avgValue = sum / values.length;
      } else if (typeof values === "number") {
        avgValue = values;
      }
      data.push({
        name: SCORING_CATEGORY[key] || key,
        value: Number(avgValue.toFixed(2)),
      });
    }
    return data;
  };

  const handleOpenIdeaDialog = (idea) => {
    if (!idea) return;
    onSelect?.(idea);
    setDialogIdea(idea);
    setIdeaDialogOpen(true);
  };

  const handleCloseIdeaDialog = () => {
    setIdeaDialogOpen(false);
    setDialogIdea(null);
  };

  const handleRevise = async () => {
    if (!projectId || !canRevise) return;

    // Let parent trigger workflow (SSE will update and refetch ideas when ready)
    onRevise?.(projectId);

    // ✅ Do NOT force projectIdeasLoading=true here.
    // If you want a spinner for generation, use SSE UI state (RUNNING) instead of ideasLoading.
  };

  useEffect(() => {
    if (!projectId) {
      clearIdeas();
      return;
    }

    // ✅ Cache is valid if it belongs to this project (even if [] meaning “loaded but empty”)
    const hasCachedForProject =
      ideasProjectId === projectId && Array.isArray(storedIdeas);

    if (hasCachedForProject) return;

    const ac = new AbortController();
    const myReqId = ++requestIdRef.current;

    (async () => {
      try {
        setIdeasState({
          projectIdeasLoading: true,
          projectIdeasError: null,
          projectIdeasProjectId: projectId
        });

        // IMPORTANT: fetchProjectIdeas should pass `signal` to fetch internally if possible
        const data = await fetchProjectIdeas(projectId, { signal: ac.signal });

        const list = Array.isArray(data?.ideas) ? data.ideas : [];

        // Only update if this is still the latest request
        if (requestIdRef.current !== myReqId) return;

        setIdeasState({
          projectIdeas: list,
          projectIdeasLoading: false,
          projectIdeasError: null,
          projectIdeasProjectId: projectId
        });
      } catch (e) {
        if (ac.signal.aborted) return;
        if (requestIdRef.current !== myReqId) return;

        setIdeasState({
          projectIdeas: [],
          projectIdeasLoading: false,
          projectIdeasError: e?.message || "Failed to load ideas",
          projectIdeasProjectId: projectId
        });
      }
    })();

    return () => {
      ac.abort();
      // If we aborted the latest request, clear loading (but only for this request)
      if (requestIdRef.current === myReqId) {
        setIdeasState({ projectIdeasLoading: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, ideasProjectId]);

  useEffect(() => {
    if (!ideaDialogOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleCloseIdeaDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ideaDialogOpen]);

  const onDragStartIdea = (e, idea) => {
    const payload = JSON.stringify({ kind: "brandos.idea", idea });
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", payload);
    e.dataTransfer.setData("text/plain", payload);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 rounded-t-2xl bg-indigo-600 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="text-[13px] font-semibold text-white">Ideas</div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleRevise}
            disabled={!projectId || !canRevise || reviseLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            title={
              canRevise
                ? reviseLabel
                : "Only available when input collection is complete and awaiting user"
            }
          >
            {reviseLoading ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-indigo-300 border-t-indigo-700" />
            ) : null}
            <SparklesIcon className="h-4 w-4" />
            {reviseLabel}
          </button>

          <button
            type="button"
            onClick={onMaximize}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
            title="Maximize ideas"
            aria-label="Maximize ideas"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="p-2">
        <div className="space-y-1">
          {top10.map((idea, idx) => {
            const active = selectedId === idea.id;
            const isSelected = idea?.selected === true;
            const highlighted = active || isSelected;
            const scoreText = formatScore(scoreOf(idea));

            return (
              <div
                key={idea.id || `${idx}`}
                draggable
                onDragStart={(e) => onDragStartIdea(e, idea)}
                onClick={() => handleOpenIdeaDialog(idea)}
                className={[
                  "w-full rounded-xl border px-2 py-1.5 text-left transition",
                  "select-none",
                  "cursor-grab active:cursor-grabbing",
                  "hover:bg-zinc-50",
                  highlighted
                    ? "border-indigo-300 bg-indigo-50/50"
                    : "border-zinc-200 bg-white"
                ].join(" ")}
                title="Drag this idea into the pad"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={[
                      "mt-0.5 inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded-md border px-1 text-[10px] font-semibold leading-none",
                      highlighted
                        ? "border-indigo-200 bg-white text-indigo-700"
                        : "border-zinc-200 bg-white text-zinc-600"
                    ].join(" ")}
                  >
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="truncate text-[11px] font-semibold text-zinc-900">
                        {idea.title || "Untitled idea"}
                      </div>
                      <div className="shrink-0 text-right text-[10px] font-semibold text-zinc-600">
                        {isScoringRunning ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-indigo-600" />
                            Loading
                          </span>
                        ) : (
                          scoreText != null ? `${scoreText}` : "—"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 text-[10px] text-zinc-500">{top10.length}/10</div>
      </div>

      {ideaDialogOpen && dialogIdea ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 999999 }}
          role="dialog"
          aria-modal="true"
          aria-label="Idea dialog"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseIdeaDialog}
            aria-label="Close dialog"
          />

          <div className="relative w-[min(92vw,900px)] max-h-[min(86vh,720px)] rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-200">
              <div className="text-sm font-semibold text-zinc-900">
                {dialogIdea.title || "(Untitled Idea)"}
              </div>
              <button
                type="button"
                onClick={handleCloseIdeaDialog}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                aria-label="Close"
                title="Close"
              >
                <CloseIcon className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="p-4 bg-white overflow-auto max-h-[calc(86vh-48px)]">
              <div className="space-y-3">
                <div>
                  {ideaContentOf(dialogIdea) ? (
                    <div className="mt-1 text-[13px] leading-relaxed text-zinc-800 break-words whitespace-pre-wrap">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="mb-3 last:mb-0">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">{children}</li>
                          ),
                        }}
                      >
                        {ideaContentOf(dialogIdea)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-800 break-words">(No content)</div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="text-[11px] font-semibold text-zinc-700">
                    Score
                  </div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {(() => {
                      const n = scoreOf(dialogIdea);
                      return n == null ? "-" : n.toFixed(2);
                    })()}
                  </div>
                </div>

                {evaluationToChartData(dialogIdea?.evaluation).length > 0 ? (
                  <div className="mt-1 w-full flex gap-2">
                    <div className="flex flex-col justify-around" style={{ minWidth: "140px", height: "160px" }}>
                      {evaluationToChartData(dialogIdea?.evaluation).map((item, chartIdx) => (
                        <div key={chartIdx} className="text-[10px] text-zinc-600 font-medium truncate leading-none">
                          {item.name}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart
                          layout="vertical"
                          data={evaluationToChartData(dialogIdea?.evaluation)}
                          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 9 }} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 9 }}
                            width={0}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px" }}
                            labelStyle={{ color: "#000" }}
                            formatter={(value) => {
                              const num = typeof value === "number" ? value : Number(value);
                              return Number.isFinite(num) ? num.toFixed(1) : value;
                            }}
                          />
                          <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CloseIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
