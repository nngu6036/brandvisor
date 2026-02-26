"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SCORING_CATEGORY, PROJECT_WORKFLOW_STATE, PROJECT_WORKFLOW_STATUS } from "../lib/constants";
import { useBrandStore } from "../lib/store";

export default function IdeaCard({
  idea,
  id,
  width,
  height,
  x,
  y,
  zIndex,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onRemove,
  onMockup,
  onSubmitComment,
  stopDrag,
}) {
  const [cardIdea, setCardIdea] = useState(idea);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const commentBtnRef = useRef(null);
  const popoverRef = useRef(null);

  const ideaId = idea?.id;
  const storeIdea = useBrandStore((s) => {
    const list = Array.isArray(s.projectIdeas) ? s.projectIdeas : [];
    return list.find((x) => x?.id === ideaId) || null;
  });
  const workflowState = useBrandStore((s) => s.activeProject?.workflow_state);
  const workflowStatus = useBrandStore((s) => s.activeProject?.workflow_status);

  useEffect(() => {
    setCardIdea(idea);
  }, [idea]);

  useEffect(() => {
    if (!storeIdea) return;
    setCardIdea((prev) => ({ ...(prev || {}), ...storeIdea }));
  }, [storeIdea]);

  useEffect(() => {
    if (!ideaOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIdeaOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ideaOpen]);

  useEffect(() => {
    if (!commentOpen) return;

    const onMouseDown = (e) => {
      const btn = commentBtnRef.current;
      const pop = popoverRef.current;
      if (pop && pop.contains(e.target)) return;
      if (btn && btn.contains(e.target)) return;
      setCommentOpen(false);
      setCommentText("");
      setSubmitting(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setCommentOpen(false);
        setCommentText("");
        setSubmitting(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        popoverRef.current?.querySelector?.("button[data-save='1']")?.click?.();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [commentOpen]);

  useEffect(() => {
    if (!commentOpen) return;
    const t = setTimeout(() => {
      popoverRef.current?.querySelector?.("textarea")?.focus?.();
    }, 0);
    return () => clearTimeout(t);
  }, [commentOpen]);

  const openIdea = (e) => {
    stopDrag?.(e);
    setIdeaOpen(true);
  };

  const closeIdea = (e) => {
    stopDrag?.(e);
    setIdeaOpen(false);
  };

  const closePopover = () => {
    setCommentOpen(false);
    setCommentText("");
    setSubmitting(false);
  };

  const handleOpenComment = (e) => {
    stopDrag?.(e);
    setCommentOpen(true);
    setCommentText("");
  };

  const handleSaveComment = async (e) => {
    stopDrag?.(e);
    const text = (commentText || "").trim();
    if (!text) return;

    try {
      setSubmitting(true);
      await onSubmitComment?.(text);
      closePopover();
    } catch {
      setSubmitting(false);
    }
  };

  const handleMockup = async (e) => {
    stopDrag?.(e);
    if (mockupLoading) return;
    try {
      setMockupLoading(true);
      await onMockup?.();
    } finally {
      setMockupLoading(false);
    }
  };

  const ideaTitle = String(cardIdea?.title ?? "").trim();
  const ideaContent = String(
    cardIdea?.content ?? cardIdea?.idea_content ?? cardIdea?.description ?? "",
  ).trim();
  const normalize = (v) => String(v ?? "").toUpperCase();
  const isScoringRunning =
    normalize(workflowState) === PROJECT_WORKFLOW_STATE.SCORE &&
    normalize(workflowStatus) === PROJECT_WORKFLOW_STATUS.RUNNING;
  const ideaScore = cardIdea?.score ?? cardIdea?.idea_score;
  const scoreValue = Number(ideaScore);
  const roundedScore = Number.isFinite(scoreValue) ? scoreValue.toFixed(2) : null;

  const evaluationToChartData = (evaluation) => {
    if (!evaluation || typeof evaluation !== "object") return [];

    const data = [];
    for (const [key, values] of Object.entries(evaluation)) {
      let avgValue = 0;
      if (Array.isArray(values) && values.length > 0) {
        const sum = values.reduce(
          (acc, v) => acc + (typeof v === "number" ? v : 0),
          0,
        );
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

  const chartData = evaluationToChartData(cardIdea?.evaluation);

  return (
    <>
      <div
        className="absolute flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm select-none touch-none"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${x}px, ${y}px)`,
          zIndex,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="group"
        aria-label={`Idea card: ${ideaTitle || "Untitled"}`}
        title="Drag to move"
        data-idea-id={id}
      >
        <div className="h-10 flex items-center justify-between gap-2 rounded-t-2xl border-b border-yellow-200 bg-yellow-100 px-3">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-zinc-900">Idea</div>
            {cardIdea?.tag ? (
              <div className="truncate text-[10px] font-medium text-zinc-600">
                {cardIdea.tag}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 flex items-center gap-1">
            <button
              type="button"
              onPointerDown={stopDrag}
              onClick={(e) => {
                stopDrag?.(e);
                onRemove?.();
              }}
              className="rounded-lg px-2 py-1 text-xs text-zinc-700 hover:bg-yellow-200"
              title="Remove"
              aria-label="Remove"
            >
              x
            </button>
          </div>
        </div>

        <div
          className="px-3 py-2 flex-1 overflow-hidden cursor-pointer"
          onPointerDown={stopDrag}
          onClick={openIdea}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openIdea(e);
            }
          }}
          title="Open idea details"
          aria-label="Open idea details"
        >
          {ideaTitle ? (
            <div
              className="text-[11px] leading-snug text-zinc-700 overflow-hidden whitespace-normal break-words"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 7,
              }}
            >
              {ideaTitle}
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500">(No description)</div>
          )}
        </div>

        <div className="mx-3 border-t border-zinc-200" />

        <div className="relative px-3 py-2 flex items-center justify-between">
          <button
            ref={commentBtnRef}
            type="button"
            onPointerDown={stopDrag}
            onClick={handleOpenComment}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
            title="Comment"
            aria-label="Comment"
          >
            <CommentIcon className="h-3.5 w-3.5" />
            Comment
          </button>

          {commentOpen && (
            <div
              ref={popoverRef}
              onPointerDown={stopDrag}
              className="absolute left-2 bottom-10 w-[220px] rounded-xl border border-zinc-200 bg-white shadow-xl"
              style={{ zIndex: (zIndex || 1) + 50 }}
            >
              <div className="px-3 pt-3 pb-2">
                <div className="text-[11px] font-semibold text-zinc-900">
                  Add a comment
                </div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  Ctrl/⌘ + Enter to save
                </div>

                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Type your comment..."
                  className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-800 outline-none focus:ring-4 focus:ring-indigo-500/15"
                  disabled={submitting}
                />

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onPointerDown={stopDrag}
                    onClick={(e) => {
                      stopDrag?.(e);
                      closePopover();
                    }}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50"
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    data-save="1"
                    onPointerDown={stopDrag}
                    onClick={handleSaveComment}
                    className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    disabled={submitting || !commentText.trim()}
                  >
                    {submitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-b border-r border-zinc-200 bg-white" />
            </div>
          )}

          <button
            type="button"
            onPointerDown={stopDrag}
            onClick={handleMockup}
            disabled={mockupLoading}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            title="Mockup"
            aria-label="Mockup"
          >
            <MockupIcon className="h-3.5 w-3.5" />
            {mockupLoading ? "Mockup..." : "Mockup"}
          </button>
        </div>
      </div>

      {ideaOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: (zIndex || 1) + 200 }}
          role="dialog"
          aria-modal="true"
          aria-label="Idea dialog"
          onPointerDown={stopDrag}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onPointerDown={stopDrag}
            onClick={closeIdea}
            aria-label="Close dialog"
          />

          <div
            className="relative w-[min(92vw,900px)] max-h-[min(86vh,720px)] rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden flex flex-col"
            onPointerDown={stopDrag}
          >
            <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-200">
              <div className="text-sm font-semibold text-zinc-900">
                {cardIdea.title || "(Untitled Idea)"}
              </div>
              <button
                type="button"
                onPointerDown={stopDrag}
                onClick={closeIdea}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                aria-label="Close"
                title="Close"
              >
                <CloseIcon className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="p-4 bg-white overflow-auto flex-1 min-h-0">
              <div className="space-y-3">
                <div>
                  {ideaContent ? (
                    <div className="mt-1 text-[13px] leading-snug text-zinc-800 break-words whitespace-pre-wrap">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>
                          ),
                          li: ({ children }) => <li className="leading-snug">{children}</li>,
                        }}
                      >
                        {ideaContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="mt-1 whitespace-pre-wrap text-[13px] leading-snug text-zinc-800 break-words">
                      (No content)
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="text-[11px] font-semibold text-zinc-700">Score</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {isScoringRunning ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-zinc-300 border-t-indigo-600" />
                        Loading
                      </span>
                    ) : (
                      roundedScore ?? "-"
                    )}
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <div className="mt-1 w-full flex gap-2">
                    <div className="flex flex-col justify-around" style={{ minWidth: "140px", height: "160px" }}>
                      {chartData.map((item, idx) => (
                        <div key={idx} className="text-[10px] text-zinc-600 font-medium truncate leading-none">
                          {item.name}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart
                          layout="vertical"
                          data={chartData}
                          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 9 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={0} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                            }}
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
      )}
    </>
  );
}

function CommentIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8h10M7 12h6M21 12c0 4.418-4.03 8-9 8a10.7 10.7 0 0 1-3.6-.62L3 20l1.2-3.6A7.6 7.6 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MockupIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 9h8M8 13h5M8 17h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
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
