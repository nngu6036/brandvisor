"use client";

import { useEffect, useRef, useState } from "react";
import { commentProjectIdeaMockup } from "../lib/api";
import { useBrandStore } from "../lib/store";

export default function MockupCard({
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
  onBrief,
  stopDrag
}) {
  const [cardIdea, setCardIdea] = useState(idea);
  const activeProjectId = useBrandStore((s) => s.activeProject?.id);
  const setIdeasState = useBrandStore((s) => s.setProjectIdeasState);
  const ideaId = idea?.id;
  const storeIdea = useBrandStore((s) => {
    const list = Array.isArray(s.projectIdeas) ? s.projectIdeas : [];
    return list.find((x) => x?.id === ideaId) || null;
  });

  const mockupUrl = String(cardIdea?.mockup_content ?? "").trim();

  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);

  const [imageOpen, setImageOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const commentBtnRef = useRef(null);
  const popoverRef = useRef(null);

  const closePopover = () => {
    setCommentOpen(false);
    setCommentText("");
    setSubmitting(false);
  };

  useEffect(() => {
    setCardIdea(idea);
  }, [idea]);

  useEffect(() => {
    if (!storeIdea) return;
    setCardIdea((prev) => ({ ...(prev || {}), ...storeIdea }));
  }, [storeIdea]);

  useEffect(() => {
    setImgError(false);
  }, [mockupUrl]);

  const openImage = (e) => {
    stopDrag?.(e);
    if (!mockupUrl) return;
    setImageOpen(true);
  };

  const closeImage = (e) => {
    stopDrag?.(e);
    setImageOpen(false);
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
    if (!imageOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setImageOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imageOpen]);

  const handleOpenComment = (e) => {
    stopDrag?.(e);
    setCommentOpen(true);
    setCommentText("");
  };

  const handleSave = async (e) => {
    stopDrag?.(e);
    const text = (commentText || "").trim();
    if (!text) return;

    try {
      setSubmitting(true);
      const ideaId = idea?.id;
      const res = await commentProjectIdeaMockup(
        activeProjectId,
        ideaId,
        text,
        mockupUrl,
      );

      const updatedIdea =
        res?.idea ||
        (Array.isArray(res?.ideas)
          ? res.ideas.find((x) => x?.id === ideaId)
          : null) ||
        res?.updated ||
        null;

      if (updatedIdea) {
        const current = useBrandStore.getState();
        const list = Array.isArray(current?.projectIdeas) ? current.projectIdeas : [];
        if (list.length > 0) {
          setIdeasState({
            projectIdeas: list.map((x) =>
              x?.id === ideaId ? { ...x, ...updatedIdea } : x,
            ),
          });
        }
      }

      closePopover();
    } catch {
      setSubmitting(false);
    }
  };

  const handleBrief = async (e) => {
    stopDrag?.(e);
    if (briefLoading) return;
    try {
      setBriefLoading(true);
      await onBrief?.();
    } finally {
      setBriefLoading(false);
    }
  };

  const hasUrl = !!mockupUrl;
  const canOpenDialog = hasUrl && !imgError;

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
        aria-label="Mockup card"
        title="Drag to move"
        data-mockup-id={id}
      >
        {/* Header */}
        <div className="h-10 flex items-center justify-between rounded-t-2xl border-b border-orange-200 bg-orange-100 px-3">
          <div className="text-xs font-semibold text-zinc-900">Mockup</div>
        </div>

        {/* Body: thumbnail */}
        <div
          className={[
            "px-3 py-2 flex-1 overflow-hidden",
            canOpenDialog ? "cursor-pointer" : "",
          ].join(" ")}
          onPointerDown={stopDrag}
          onClick={openImage}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openImage(e);
            }
          }}
          title={canOpenDialog ? "Open mockup preview" : hasUrl ? "Image unavailable" : "No mockup image URL"}
          aria-label="Open mockup preview"
        >
          {hasUrl ? (
            <div
              className={[
                "w-full h-full rounded-xl border border-zinc-200 bg-white overflow-hidden",
                canOpenDialog ? "hover:ring-4 hover:ring-orange-500/10" : "",
              ].join(" ")}
            >
              {!imgError ? (
                <img
                  src={mockupUrl}
                  alt="Mockup thumbnail"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[11px] text-zinc-500">
                  Failed to load image
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500">(No mockup image URL)</div>
          )}
        </div>

        <div className="mx-3 border-t border-zinc-200" />

        {/* Footer actions */}
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
                  Comment on mockup
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
                  className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-800 outline-none focus:ring-4 focus:ring-orange-500/15"
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
                    onClick={handleSave}
                    className="rounded-lg bg-orange-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                    disabled={submitting || !commentText.trim()}
                  >
                    {submitting ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              <div className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-b border-r border-zinc-200 bg-white" />
            </div>
          )}

          <button
            type="button"
            onPointerDown={stopDrag}
            onClick={handleBrief}
            disabled={briefLoading}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            title="Brief"
            aria-label="Brief"
          >
            <BriefIcon className="h-3.5 w-3.5" />
            {briefLoading ? "Brief…" : "Brief"}
          </button>
        </div>
      </div>

      {/* Modal: full-size image */}
      {imageOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: (zIndex || 1) + 200 }}
          role="dialog"
          aria-modal="true"
          aria-label="Mockup image dialog"
          onPointerDown={stopDrag}
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onPointerDown={stopDrag}
            onClick={closeImage}
            aria-label="Close dialog"
          />

          {/* Panel */}
          <div
            className="relative w-[min(92vw,980px)] h-[min(86vh,720px)] rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden"
            onPointerDown={stopDrag}
          >
            <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-200">
              <div className="text-sm font-semibold text-zinc-900">Mockup preview</div>
              <button
                type="button"
                onPointerDown={stopDrag}
                onClick={closeImage}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                aria-label="Close"
                title="Close"
              >
                <CloseIcon className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="p-3 w-full h-[calc(100%-48px)] bg-zinc-50">
              {mockupUrl ? (
                <img
                  src={mockupUrl}
                  alt="Mockup full size"
                  className="w-full h-full object-contain rounded-xl bg-white border border-zinc-200"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-zinc-600">
                  No image URL
                </div>
              )}
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

function BriefIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 8h8M8 12h8M8 16h5"
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
