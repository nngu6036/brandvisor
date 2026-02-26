"use client";

import { memo, useEffect, useState } from "react";
import { clarifyProjectObjective, reviseProjectIdeas } from "../lib/api";

function IdeasRevision({
  brandId,
  projectId,
  objective = "",
  open = false,
  onFinished,
}) {
  const [value, setValue] = useState(objective || "");
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const normalizeQuestions = (payload) => {
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.questions)
        ? payload.questions
        : Array.isArray(payload?.question)
          ? payload.question
          : [];

    return source
      .map((item) => {
        let q = item;
        if (typeof q === "string") {
          try {
            q = JSON.parse(q);
          } catch {
            return null;
          }
        }
        if (!q || typeof q !== "object") return null;
        const type = String(q.type || "").trim();
        const description = String(q.description || "").trim();
        const options = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
        if (!type || !description) return null;
        return { type, description, options };
      })
      .filter(Boolean);
  };
  const estimateRows = (text) => {
    const value = String(text ?? "");
    if (!value) return 2;
    const lines = value.split("\n");
    const visualLines = lines.reduce((acc, line) => {
      // Rough wrap estimate for current width/font.
      return acc + Math.max(1, Math.ceil(line.length / 80));
    }, 0);
    return Math.min(12, Math.max(2, visualLines));
  };

  useEffect(() => {
    if (!open) return;

    setValue(objective || "");
    setAnswers({});
    setError("");
    setQuestionsError("");
    setSubmitted(false);
  }, [open, projectId, objective]);

  useEffect(() => {
    if (!open) return;
    if (!brandId || !projectId) {
      setQuestions([]);
      return;
    }

    let cancelled = false;
    const loadQuestions = async () => {
      try {
        setQuestionsLoading(true);
        setQuestionsError("");
        const res = await clarifyProjectObjective(brandId, projectId);
        if (cancelled) return;
        setQuestions(normalizeQuestions(res));
      } catch (e) {
        if (cancelled) return;
        setQuestionsError(e?.message || "Failed to clarify project objective.");
        setQuestions([]);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    };

    void loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [open, brandId, projectId]);

  useEffect(() => {
    if (!Array.isArray(questions) || !questions.length) {
      setAnswers({});
      return;
    }
    setAnswers((prev) =>
      questions.reduce((acc, q, idx) => {
        const existing = prev?.[idx];
        if (q.type === "multiple-choice") {
          acc[idx] = Array.isArray(existing) ? existing : [];
        } else {
          acc[idx] = typeof existing === "string" ? existing : "";
        }
        return acc;
      }, {})
    );
  }, [questions]);



  const handleSave = async () => {
    const nextValue = String(value || "").trim();
    if (!brandId || !projectId) {
      setError("No active project selected.");
      return;
    }
    if (!nextValue) {
      setError("Objective cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSubmitted(true);
      const questionPairs = questions.map((q, idx) => {
        const raw = answers[idx];
        const answer = Array.isArray(raw)
          ? raw.join(", ")
          : String(raw ?? "").trim();
        return {
          question: q.description,
          answer,
        };
      });

      await reviseProjectIdeas(brandId, projectId, nextValue, questionPairs);
      onFinished?.();
    } catch (e) {
      setSubmitted(false);
      setError(e?.message || "Failed to revise project ideas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative rounded-2xl border border-zinc-200 bg-white shadow-sm p-4">
      <>
        <div className="text-sm font-semibold text-zinc-900">Project Objective</div>

        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSubmitted(false);
          }}
          rows={estimateRows(value)}
          placeholder="Enter project objective..."
          className="mt-3 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:ring-4 focus:ring-indigo-500/15"
        />

        {questionsLoading ? (
          <div className="mt-3 text-xs text-zinc-500">Loading clarification questions...</div>
        ) : null}

        {questions.length > 0 ? (
          <div className="mt-4 space-y-3">
            <div className="text-sm font-semibold text-zinc-900">Clarification Questions</div>
            {questions.map((q, idx) => (
              <div key={`${idx}-${q.description}`} className="rounded-xl border border-zinc-200 p-3">
                <div className="text-xs font-medium text-zinc-800">{q.description}</div>

                {q.type === "open" ? (
                  <input
                    type="text"
                    value={String(answers[idx] ?? "")}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                    }
                    className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 outline-none focus:ring-4 focus:ring-indigo-500/15"
                    placeholder="Type your answer..."
                  />
                ) : null}

                {q.type === "single-choice" ? (
                  <div className="mt-2 space-y-1">
                    {q.options.map((option, optIdx) => (
                      <label key={`${idx}-${optIdx}`} className="flex items-center gap-2 text-xs text-zinc-700">
                        <input
                          type="radio"
                          name={`question-${idx}`}
                          value={option}
                          checked={answers[idx] === option}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [idx]: option }))
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : null}

                {q.type === "multiple-choice" ? (
                  <div className="mt-2 space-y-1">
                    {q.options.map((option, optIdx) => {
                      const selected = Array.isArray(answers[idx]) && answers[idx].includes(option);
                      return (
                        <label key={`${idx}-${optIdx}`} className="flex items-center gap-2 text-xs text-zinc-700">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              setAnswers((prev) => {
                                const current = Array.isArray(prev[idx]) ? prev[idx] : [];
                                const next = e.target.checked
                                  ? [...current, option]
                                  : current.filter((x) => x !== option);
                                return { ...prev, [idx]: next };
                              });
                            }}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {questionsError || error ? (
          <div className="mt-2 text-xs text-red-600">{questionsError || error}</div>
        ) : null}
        {submitted ? (
          <div className="mt-2 text-xs text-emerald-600">Revision request submitted.</div>
        ) : null}

        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || questionsLoading || !brandId || !projectId}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Revising..." : "Revise Objective"}
          </button>
        </div>
      </>
    </div>
  );
}

export default memo(IdeasRevision);
