"use client";

import { useMemo } from "react";
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SCORING_CATEGORY, PROJECT_WORKFLOW_STATE, PROJECT_WORKFLOW_STATUS } from "../lib/constants";
import { useBrandStore } from "../lib/store";

/**
 * IdeasStrip (max 10).
 * - Full title + full content (no ...)
 * - Sort by score desc
 * - Evaluation bar chart below each idea (if available)
 * - ✅ The whole strip scrolls when content is long
 * - Selected ideas are highlighted by card background/border
 *
 * Props:
 * - ideas: array of {id,title,summary,tag,score,content,description,body,evaluation,selected}
 * - selectedId: string | null
 * - onSelect: (idea) => void
 */
export default function IdeasStrip({ ideas = [], selectedId = null, onSelect }) {
  // Allow users to select/copy text without triggering the card click.
  const workflowState = useBrandStore((s) => s.activeProject?.workflow_state);
  const workflowStatus = useBrandStore((s) => s.activeProject?.workflow_status);
  const normalize = (v) => String(v ?? "").toUpperCase();
  const isScoringRunning =
    normalize(workflowState) === PROJECT_WORKFLOW_STATE.SCORE &&
    normalize(workflowStatus) === PROJECT_WORKFLOW_STATUS.RUNNING;
  const isSelectingText = () => {
    if (typeof window === "undefined" || !window.getSelection) return false;
    const sel = window.getSelection();
    return (
      !!sel &&
      !sel.isCollapsed &&
      String(sel.toString() || "").trim().length > 0
    );
  };

  const handleCardActivate = (idea) => (e) => {
    // If the user is selecting text, don't treat it as a click.
    if (isSelectingText()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelect?.(idea);
  };

  const handleCardKeyDown = (idea) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(idea);
    }
  };

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

  const evaluationToChartData = (evaluation) => {
    if (!evaluation || typeof evaluation !== 'object') return [];
    const data = [];
    for (const [key, values] of Object.entries(evaluation)) {
      let avgValue = 0;
      if (Array.isArray(values) && values.length > 0) {
        const sum = values.reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
        avgValue = sum / values.length;
      } else if (typeof values === 'number') {
        avgValue = values;
      }
      data.push({
        name: SCORING_CATEGORY[key] || key,
        value: Number(avgValue.toFixed(2)),
      });
    }
    return data;
  };

  const contentOf = (idea) =>
    idea?.summary || idea?.content || idea?.description || idea?.body || "";

  const { top10, minScore, maxScore } = useMemo(() => {
    const list = Array.isArray(ideas) ? ideas : [];

    const scores = list.map(scoreOf).filter((v) => v != null);
    const min = scores.length ? Math.min(...scores) : 0;
    const max = scores.length ? Math.max(...scores) : 1;

    const sorted = list
      .slice()
      .sort((a, b) => {
        const sa = scoreOf(a);
        const sb = scoreOf(b);
        const da = sa == null ? -Infinity : sa;
        const db = sb == null ? -Infinity : sb;
        if (db !== da) return db - da;
        return String(a?.title || "").localeCompare(String(b?.title || ""));
      })
      .slice(0, 10);

    return { top10: sorted, minScore: min, maxScore: max };
  }, [ideas]);

  if (!top10.length) {
    return (
      <div className="px-4 py-6 text-sm text-zinc-600">
        No ideas yet. Click <span className="font-semibold">Generate Ideas</span>{" "}
        to create some.
      </div>
    );
  }

  return (
    <div
      className={[
        "bg-white px-4 py-3",
        "max-h-[70vh] overflow-y-auto",
        "overscroll-contain",
      ].join(" ")}
    >


      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
        {top10.map((idea) => {
          const active = selectedId && selectedId === idea.id;
          const isSelected = idea?.selected === true;
          const highlighted = active || isSelected;

          const s = scoreOf(idea);
          const scoreText = formatScore(s);
          const content = contentOf(idea);

          return (
            <div
              key={idea.id || idea.title}
              role="button"
              tabIndex={0}
              className={[
                "rounded-2xl border p-3 text-left",
                "hover:bg-zinc-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/15",
                "cursor-pointer",
                "select-text",
                highlighted
                  ? "border-indigo-300 bg-indigo-50/40"
                  : "border-zinc-200 bg-white",
              ].join(" ")}
              onClick={handleCardActivate(idea)}
              onKeyDown={handleCardKeyDown(idea)}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-zinc-900 whitespace-normal break-words select-text">
                      {idea.title || "Untitled idea"}
                    </div>
                  </div>
                </div>

                {/* Score: number */}
                <div className="shrink-0 text-xs font-semibold text-zinc-600">
                  {isScoringRunning ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-indigo-600" />
                      Loading
                    </span>
                  ) : (
                    scoreText != null ? `Score: ${scoreText}` : "—"
                  )}
                </div>
              </div>

              {/* full content */}
              {content ? (
                <div className="mt-1 text-xs text-zinc-600 whitespace-normal break-words select-text">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : null}

              {/* Evaluation bar chart */}
              {idea?.evaluation && Object.keys(idea.evaluation).length > 0 ? (
                <div className="mt-3 w-full flex gap-2">
                  {/* Labels on the left */}
                  <div className="flex flex-col justify-around" style={{ minWidth: '140px', height: '160px' }}>
                    {evaluationToChartData(idea.evaluation).map((item, idx) => (
                      <div key={idx} className="text-[10px] text-zinc-600 font-medium truncate leading-none">
                        {item.name}
                      </div>
                    ))}
                  </div>
                  {/* Chart on the right */}
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart
                        layout="vertical"
                        data={evaluationToChartData(idea.evaluation)}
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
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                          labelStyle={{ color: '#000' }}
                          formatter={(value) => value.toFixed(1)}
                        />
                        <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}

              {/* Tag */}
              {idea.tag ? (
                <div className="mt-2">
                  <span className="inline-flex rounded-lg border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 select-text">
                    {idea.tag}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
