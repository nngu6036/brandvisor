"use client";

import { useEffect, useRef, useState } from "react";

/**
 * BriefCard
 * - Similar UI to IdeaCard / MockupCard
 * - Header: red, title "Marketing brief", no close button
 * - Body: idea.marketing_brief
 * - Footer: Comment only (popover)
 * - Body click opens full content modal dialog
 */
export default function BriefCard({
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
  onSubmitComment, // (commentText) => Promise<void> | void
  stopDrag
}) {
  const briefText = String(idea?.marketing_brief ?? "").trim();

  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [briefOpen, setBriefOpen] = useState(false);

  const commentBtnRef = useRef(null);
  const popoverRef = useRef(null);
  const suppressOpenRef = useRef(false);

  const closePopover = () => {
    setCommentOpen(false);
    setCommentText("");
    setSubmitting(false);
  };

  const openBrief = (e) => {
    if (suppressOpenRef.current) return;
    stopDrag?.(e);
    if (!briefText) return;
    setBriefOpen(true);
  };

  const closeBrief = (e) => {
    stopDrag?.(e);
    setBriefOpen(false);
  };

  useEffect(() => {
    if (!commentOpen) return;

    const onMouseDown = (e) => {
      const btn = commentBtnRef.current;
      const pop = popoverRef.current;
      if (pop && pop.contains(e.target)) return;
      if (btn && btn.contains(e.target)) return;
      closePopover();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") closePopover();
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

  useEffect(() => {
    if (!briefOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setBriefOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [briefOpen]);

  const handleOpenComment = (e) => {

    e.preventDefault();
    e.stopPropagation();
    stopDrag?.(e);
    setCommentOpen(true);
    setCommentText("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  const canOpenDialog = !!briefText;

  return (
    <>
      <div
        className="absolute flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm select-none touch-none"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${x}px, ${y}px)`,
          zIndex
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="group"
        aria-label="Marketing brief card"
        title="Drag to move"
        data-brief-id={id}
      >
        {/* Header (h-10) */}
        <div className="h-10 flex items-center justify-between rounded-t-2xl border-b border-red-200 bg-red-100 px-3">
          <div className="text-xs font-semibold text-zinc-900 text-center w-full">
            Marketing brief
          </div>
        </div>

        {/* Body */}
        <div
          className={[
            "px-3 py-2 flex-1 overflow-hidden",
            canOpenDialog ? "cursor-pointer" : "",
          ].join(" ")}
          onPointerDown={stopDrag}
          onClick={openBrief}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openBrief(e);
            }
          }}
          title={canOpenDialog ? "Open full brief" : "No marketing brief"}
          aria-label="Open brief details"
        >
          {briefText ? (
            <div className="h-full overflow-auto pr-1 text-[11px] leading-snug text-zinc-700 whitespace-normal break-words">
              {briefText}
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500">(No marketing brief)</div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-zinc-200" />

        {/* Footer (Comment only) */}
        <div
          className="relative px-3 py-2 flex items-center justify-start"
          onPointerDown={stopDrag}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
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
                  Comment on brief
                </div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  Ctrl/⌘ + Enter to save
                </div>

                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Type your comment…"
                  className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-800 outline-none focus:ring-4 focus:ring-red-500/15"
                  disabled={submitting}
                />

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onPointerDown={stopDrag}
                    onClick={(e) => {
                      suppressOpenRef.current = true;
                      setTimeout(() => {
                        suppressOpenRef.current = false;
                      }, 0);
                      e.preventDefault();
                      e.stopPropagation();
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
                    onClick={handleSave}
                    className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    disabled={submitting || !commentText.trim()}
                  >
                    {submitting ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              <div className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-b border-r border-zinc-200 bg-white" />
            </div>
          )}
        </div>
      </div>

      {/* Modal: full brief text */}
      {briefOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
           style={{ zIndex: 999999 }}   // ✅ always on top
          role="dialog"
          aria-modal="true"
          aria-label="Marketing brief dialog"
          onPointerDown={stopDrag}
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onPointerDown={stopDrag}
            onClick={closeBrief}
            aria-label="Close dialog"
          />

          {/* Panel */}
          <div
            className="relative w-[min(92vw,900px)] h-[min(86vh,720px)] rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
            onPointerDown={stopDrag}
          >
            <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-200">
              <div className="text-sm font-semibold text-zinc-900">
                Marketing brief
              </div>
              <button
                type="button"
                onPointerDown={stopDrag}
                onClick={closeBrief}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                aria-label="Close"
                title="Close"
              >
                <CloseIcon className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="p-4 w-full h-[calc(100%-48px)] bg-zinc-50 overflow-auto">
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800">
                {briefText}
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
