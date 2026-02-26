"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import IdeaCard from "./IdeaCard";
import MockupCard from "./MockupCard";
import BriefCard from "./BriefCard";

export default function IdeaInnovationPad({
  droppedIdeas = [],
  onDropIdea,
  onRemoveIdea,
  onSubmitIdeaComment, // (idea, commentText) => Promise<void>
  onMockupIdea, // (idea) => Promise<void>
  onBriefIdea // (idea) => Promise<void>
}) {
  const padRef = useRef(null);
  const items = useMemo(() => droppedIdeas || [], [droppedIdeas]);

  // positions: { [id]: { x, y, z } }
  const [positions, setPositions] = useState({});
  const [isOver, setIsOver] = useState(false);

  // pad size (for svg viewBox)
  const [padSize, setPadSize] = useState({ w: 0, h: 0 });

  // hide aux cards instantly on remove (if parent removal is async)
  const [hiddenMockupFor, setHiddenMockupFor] = useState(() => new Set());
  const [hiddenBriefFor, setHiddenBriefFor] = useState(() => new Set());

  const dragRef = useRef({
    activeId: null,
    pointerId: null,
    offsetX: 0,
    offsetY: 0
  });

  const CARD_W = 160;
  const CARD_H = 224;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const getPadRect = () => padRef.current?.getBoundingClientRect?.() ?? null;

  // Track pad size so SVG viewBox matches coordinate space of absolute cards
  useEffect(() => {
    const el = padRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setPadSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const parsePayload = (raw) => {
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      if (obj?.kind === "brandos.idea" && obj?.idea) return obj.idea;
      return null;
    } catch {
      return null;
    }
  };

  const ensurePosition = useCallback(
    (id, index = 0) => {
      setPositions((prev) => {
        if (prev[id]) return prev;

        const rect = getPadRect();
        const padW = rect?.width || 800;
        const padH = rect?.height || 500;

        const margin = 16;
        const col = index % 4;
        const row = Math.floor(index / 4);

        const x = clamp(
          margin + col * (CARD_W + 12),
          margin,
          Math.max(margin, padW - CARD_W - margin)
        );
        const y = clamp(
          72 + row * (CARD_H + 12),
          72,
          Math.max(72, padH - CARD_H - margin)
        );

        return { ...prev, [id]: { x, y, z: Date.now() } };
      });
    },
    [CARD_W, CARD_H]
  );

  

  useEffect(() => {
    const ids = new Set();

    items.forEach((it, idx) => {
      const ideaId = String(it.id || it.title || "");
      if (!ideaId) return;

      ids.add(ideaId);
      ensurePosition(ideaId, idx);

      const hasMockup =
        !hiddenMockupFor.has(ideaId) &&
        String(it?.mockup_content ?? "").trim().length > 0;

      // BriefCard shown ONLY when MockupCard is shown + marketing_brief not empty
      const hasBrief =
        hasMockup &&
        !hiddenBriefFor.has(ideaId) &&
        String(it?.marketing_brief ?? "").trim().length > 0;

      if (hasMockup) {
        const mid = `mockup:${ideaId}`;
        ids.add(mid);

        setPositions((prev) => {
          if (prev[mid]) return prev;

          const rect = getPadRect();
          const padW = rect?.width || 800;
          const padH = rect?.height || 500;
          const margin = 16;

          const base = prev[ideaId];
          const baseX = base?.x ?? margin + (idx % 4) * (CARD_W + 12);
          const baseY = base?.y ?? 88 + Math.floor(idx / 4) * (CARD_H + 12);

          // mockup appears to the right of idea
          const x = clamp(
            baseX + CARD_W + 16,
            margin,
            Math.max(margin, padW - CARD_W - margin)
          );
          const y = clamp(
            baseY,
            margin,
            Math.max(margin, padH - CARD_H - margin)
          );

          return { ...prev, [mid]: { x, y, z: Date.now() } };
        });
      }

      if (hasBrief) {
        const bid = `brief:${ideaId}`;
        ids.add(bid);

        setPositions((prev) => {
          if (prev[bid]) return prev;

          const rect = getPadRect();
          const padW = rect?.width || 800;
          const padH = rect?.height || 500;
          const margin = 16;

          const mockPos = prev[`mockup:${ideaId}`];
          const base = mockPos || prev[ideaId];

          const baseX = base?.x ?? margin + (idx % 4) * (CARD_W + 12);
          const baseY = base?.y ?? 88 + Math.floor(idx / 4) * (CARD_H + 12);

          // ✅ brief appears to the right of mockup
          const x = clamp(
            baseX + CARD_W + 16,
            margin,
            Math.max(margin, padW - CARD_W - margin)
          );
          const y = clamp(
            baseY,
            margin,
            Math.max(margin, padH - CARD_H - margin)
          );

          return { ...prev, [bid]: { x, y, z: Date.now() } };
        });
      }
    });

    // cleanup removed ids
    setPositions((prev) => {
      const next = {};
      for (const k of Object.keys(prev)) {
        if (ids.has(k)) next[k] = prev[k];
      }
      return next;
    });

    // cleanup hidden sets when idea removed
    setHiddenMockupFor((prev) => {
      if (!prev.size) return prev;
      const alive = new Set(items.map((it) => String(it.id || it.title || "")));
      const next = new Set();
      prev.forEach((id) => {
        if (alive.has(id)) next.add(id);
      });
      return next;
    });

    setHiddenBriefFor((prev) => {
      if (!prev.size) return prev;
      const alive = new Set(items.map((it) => String(it.id || it.title || "")));
      const next = new Set();
      prev.forEach((id) => {
        if (alive.has(id)) next.add(id);
      });
      return next;
    });
  }, [items, ensurePosition, CARD_W, CARD_H, hiddenMockupFor, hiddenBriefFor]);

  const bringToFront = (id) => {
    setPositions((prev) => {
      const p = prev[id];
      if (!p) return prev;
      return { ...prev, [id]: { ...p, z: Date.now() } };
    });
  };

  const onCardPointerDown = (e, id) => {
    const rect = getPadRect();
    if (!rect) return;

    const p = positions[id];
    if (!p) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    bringToFront(id);

    dragRef.current = {
      activeId: id,
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left - p.x,
      offsetY: e.clientY - rect.top - p.y
    };
  };

  const onCardPointerMove = (e) => {
    const { activeId, pointerId, offsetX, offsetY } = dragRef.current;
    if (!activeId) return;
    if (pointerId != null && e.pointerId !== pointerId) return;

    const rect = getPadRect();
    if (!rect) return;

    const padW = rect.width;
    const padH = rect.height;

    const margin = 12;
    const x = clamp(
      e.clientX - rect.left - offsetX,
      margin,
      Math.max(margin, padW - CARD_W - margin)
    );
    const y = clamp(
      e.clientY - rect.top - offsetY,
      margin,
      Math.max(margin, padH - CARD_H - margin)
    );

    setPositions((prev) => {
      const p = prev[activeId] || {};
      return { ...prev, [activeId]: { ...p, x, y } };
    });
  };

  const onCardPointerUp = (e) => {
    const { activeId, pointerId } = dragRef.current;
    if (!activeId) return;
    if (pointerId != null && e.pointerId !== pointerId) return;

    dragRef.current = { activeId: null, pointerId: null, offsetX: 0, offsetY: 0 };
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);

    const raw =
      e.dataTransfer.getData("application/json") ||
      e.dataTransfer.getData("text/plain");

    const idea = parsePayload(raw);
    if (!idea) return;

    const rect = getPadRect();
    const dropX = rect ? e.clientX - rect.left : 24;
    const dropY = rect ? e.clientY - rect.top : 96;

    onDropIdea?.(idea);

    const id = String(idea.id || idea.title || "");
    if (id) {
      setPositions((prev) => {
        const padW = rect?.width || 800;
        const padH = rect?.height || 500;
        const margin = 12;

        const x = clamp(
          dropX - CARD_W / 2,
          margin,
          Math.max(margin, padW - CARD_W - margin)
        );
        const y = clamp(
          dropY - CARD_H / 3,
          margin,
          Math.max(margin, padH - CARD_H - margin)
        );

        return { ...prev, [id]: { x, y, z: Date.now() } };
      });
    }
  };

  // Remove IdeaCard => dispose MockupCard + BriefCard
  const handleRemove = (ideaId) => {
    if (!ideaId) return;

    onRemoveIdea?.(ideaId);

    setPositions((prev) => {
      const next = { ...prev };
      delete next[ideaId];
      delete next[`mockup:${ideaId}`];
      delete next[`brief:${ideaId}`];
      return next;
    });

    setHiddenMockupFor((prev) => {
      const next = new Set(prev);
      next.add(ideaId);
      return next;
    });

    setHiddenBriefFor((prev) => {
      const next = new Set(prev);
      next.add(ideaId);
      return next;
    });
  };

  const stopDrag = (e) => e.stopPropagation();

  const padShellCls = [
    "rounded-2xl border-2 transition overflow-hidden",
    isOver ? "border-indigo-300" : "border-zinc-300",
    "bg-slate-50"
  ].join(" ");

  // --- Curved arrow helpers (cubic Bézier) ---
  const curvePath = (sx, sy, ex, ey) => {
    const dx = ex - sx;
    const dy = ey - sy;

    // horizontal pull for smooth curve
    const pull = clamp(Math.abs(dx) * 0.35, 50, 140);

    // add some "arbitrary" curvature based on vertical difference
    const bend = clamp(dy * 0.35, -90, 90);

    const c1x = sx + pull;
    const c1y = sy + bend;
    const c2x = ex - pull;
    const c2y = ey - bend;

    return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
  };

  const getAnchorRightMid = (p) => ({ x: (p?.x || 0) + CARD_W, y: (p?.y || 0) + CARD_H / 2 });
  const getAnchorLeftMid = (p) => ({ x: (p?.x || 0), y: (p?.y || 0) + CARD_H / 2 });

  // Build arrow segments per idea
  const arrowSegments = useMemo(() => {
    const segs = [];

    items.forEach((idea) => {
      const ideaId = String(idea.id || idea.title || "");
      if (!ideaId) return;

      const hasMockup =
        !hiddenMockupFor.has(ideaId) &&
        String(idea?.mockup_content ?? "").trim().length > 0;

      const hasBrief =
        hasMockup &&
        !hiddenBriefFor.has(ideaId) &&
        String(idea?.marketing_brief ?? "").trim().length > 0;

      if (!hasMockup) return;

      const pIdea = positions[ideaId];
      const pMock = positions[`mockup:${ideaId}`];

      if (pIdea && pMock) {
        const s = getAnchorRightMid(pIdea);
        const e = getAnchorLeftMid(pMock);
        segs.push({
          key: `i2m:${ideaId}`,
          d: curvePath(s.x, s.y, e.x, e.y)
        });
      }

      if (hasBrief) {
        const pBrief = positions[`brief:${ideaId}`];
        if (pMock && pBrief) {
          const s = getAnchorRightMid(pMock);
          const e = getAnchorLeftMid(pBrief);
          segs.push({
            key: `m2b:${ideaId}`,
            d: curvePath(s.x, s.y, e.x, e.y)
          });
        }
      }
    });

    return segs;
  }, [items, positions, hiddenMockupFor, hiddenBriefFor]);

  return (
    <div className="p-4">
      <div className={padShellCls}>
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900">Idea Innovation Pad</div>
            <div className="mt-1 text-xs text-zinc-600">
              Drag an idea from <span className="font-semibold text-zinc-900">Ideas</span>{" "}
              and drop it here. Then drag cards to arrange.
            </div>
          </div>
          <div className="shrink-0 rounded-xl border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700">
            {items.length} selected
          </div>
        </div>

        <div
          ref={padRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "relative mt-3 h-[560px] w-full overflow-hidden rounded-b-2xl px-4 pb-4",
            "bg-slate-50",
            "bg-[radial-gradient(circle_at_1px_1px,rgba(24,24,27,0.10)_1px,transparent_0)]",
            "bg-[length:18px_18px]"
          ].join(" ")}
        >
          {isOver ? (
            <div className="pointer-events-none absolute inset-0 rounded-b-2xl bg-indigo-500/10" />
          ) : null}

          {/* ✅ SVG overlay for curved arrows */}
          <svg
            className="pointer-events-none absolute inset-0"
            width="100%"
            height="100%"
            viewBox={`0 0 ${padSize.w || 1} ${padSize.h || 1}`}
            preserveAspectRatio="none"
            style={{ zIndex: 1 }}
            aria-hidden="true"
          >
            <defs>
             <marker
  id="arrowHead"
  markerWidth="6"
  markerHeight="6"
  refX="5"
  refY="3"
  orient="auto"
  markerUnits="strokeWidth"
>
  <path d="M0,0 L6,3 L0,6 Z" fill="rgba(107,114,128,0.85)" />
</marker>
            </defs>

            {arrowSegments.map((seg) => (
            <path
  key={seg.key}
  d={seg.d}
  fill="none"
  stroke="rgba(107,114,128,0.65)"
  strokeWidth="1"
  strokeLinecap="round"
  strokeLinejoin="round"
  markerEnd="url(#arrowHead)"
/>

            ))}
          </svg>

          {items.length === 0 ? (
            <div className="relative mt-6 rounded-xl border border-zinc-200 bg-white px-3 py-10 text-center text-sm text-zinc-700">
              Drop ideas here to start building your innovation canvas.
            </div>
          ) : (
            items.map((idea, idx) => {
              const ideaId = String(idea.id || idea.title || "");
              if (!ideaId) return null;

              const pIdea =
                positions[ideaId] || { x: 16 + idx * 12, y: 88 + idx * 12, z: 0 };
              const zIdea = pIdea.z || 0;

              const hasMockup =
                !hiddenMockupFor.has(ideaId) &&
                String(idea?.mockup_content ?? "").trim().length > 0;

              const hasBrief =
                hasMockup &&
                !hiddenBriefFor.has(ideaId) &&
                String(idea?.marketing_brief ?? "").trim().length > 0;

              const mockupId = `mockup:${ideaId}`;
              const pMock =
                positions[mockupId] || {
                  x: (pIdea.x || 0) + CARD_W + 16,
                  y: pIdea.y || 0,
                  z: 0
                };
              const zMock = pMock.z || 0;

              const briefId = `brief:${ideaId}`;
              const pBrief =
                positions[briefId] || {
                  x: (pMock.x || 0) + CARD_W + 16,
                  y: pMock.y || 0,
                  z: 0
                };
              const zBrief = pBrief.z || 0;

              return (
                <div key={`wrap:${ideaId}`}>
                  <IdeaCard
                    idea={idea}
                    id={ideaId}
                    width={CARD_W}
                    height={CARD_H}
                    x={pIdea.x || 0}
                    y={pIdea.y || 0}
                    zIndex={10 + (zIdea % 1000000)}
                    onPointerDown={(e) => onCardPointerDown(e, ideaId)}
                    onPointerMove={onCardPointerMove}
                    onPointerUp={onCardPointerUp}
                    onPointerCancel={onCardPointerUp}
                    onRemove={() => handleRemove(ideaId)}
                    onMockup={() => onMockupIdea?.(idea)}
                    onSubmitComment={(text) => onSubmitIdeaComment?.(idea, text)}
                    stopDrag={stopDrag}
                  />

                  {hasMockup ? (
                    <MockupCard
                      idea={idea}
                      id={mockupId}
                      width={CARD_W}
                      height={CARD_H}
                      x={pMock.x || 0}
                      y={pMock.y || 0}
                      zIndex={10 + (zMock % 1000000)}
                      onPointerDown={(e) => onCardPointerDown(e, mockupId)}
                      onPointerMove={onCardPointerMove}
                      onPointerUp={onCardPointerUp}
                      onPointerCancel={onCardPointerUp}
                      onSubmitComment={(text) => onSubmitIdeaComment?.(idea, text)}
                      onBrief={() => onBriefIdea?.(idea)}
                      stopDrag={stopDrag}
                    />
                  ) : null}

                  {hasBrief ? (
                    <BriefCard
                      idea={idea}
                      id={briefId}
                      width={CARD_W}
                      height={CARD_H}
                      x={pBrief.x || 0}
                      y={pBrief.y || 0}
                      zIndex={10 + (zBrief % 1000000)}
                      onPointerDown={(e) => onCardPointerDown(e, briefId)}
                      onPointerMove={onCardPointerMove}
                      onPointerUp={onCardPointerUp}
                      onPointerCancel={onCardPointerUp}
                      onSubmitComment={(text) => onSubmitIdeaComment?.(idea, text)}
                      stopDrag={stopDrag}
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
