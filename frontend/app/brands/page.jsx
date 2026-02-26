"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../lib/authStore";
import { useBrandStore } from "../../lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

import {
  fetchBrands,
  fetchProjects,
  createProject,
  deleteProject
} from "../../lib/api";
import { PROJECT_TYPES } from "../../lib/constants";

function typeLabelFor(project) {
  const raw =
    project?.type ??
    project?.project_type ??
    project?.projectType ??
    project?.project_type_value ??
    "";
  const val = String(raw || "").trim();
  if (!val) return "";
  const found = PROJECT_TYPES.find((t) => t.value === val);
  return found?.label || val.replaceAll("_", " ");
}

function getProjectId(p) {
  if (!p) return null;
  return (
    p.id ??
    p._id ??
    p.project_id ??
    p.projectId ??
    p.projectID ??
    p.project?.id ??
    p.project?._id ??
    null
  );
}

export default function BrandsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const isAuthed = useAuthStore((s) => s.isAuthed);

  const activeBrand = useBrandStore((s) => s.activeBrand);
  const setActiveBrand = useBrandStore((s) => s.setActiveBrand);

  const activeProject = useBrandStore((s) => s.activeProject);
  const setActiveProject = useBrandStore((s) => s.setActiveProject);

  const [selectedBrandId, setSelectedBrandId] = useState(activeBrand?.id || null);

  // Create dialog
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState(PROJECT_TYPES?.[0]?.value ?? "");
  const [objective, setObjective] = useState("Generate world-first ideas that fit the materials");

  // brainstorm count (only used when projectType === "innovation")
  const [brainstormCount, setBrainstormCount] = useState(10);

  const isInnovation = projectType === "innovation";

  useEffect(() => {
    if (!isAuthed) router.replace("/login");
  }, [isAuthed, router]);

  useEffect(() => {
    if (activeBrand?.id) setSelectedBrandId(activeBrand.id);
  }, [activeBrand?.id]);

  // If user switches away from innovation type, reset brainstorm count
  useEffect(() => {
    if (!isInnovation) {
      setBrainstormCount(10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInnovation]);

  const brandsQ = useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands
  });

  const brands = brandsQ.data?.brands ?? [];

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId) || null,
    [brands, selectedBrandId]
  );

  const projectsQ = useQuery({
    queryKey: ["projects", selectedBrandId],
    queryFn: () => fetchProjects(selectedBrandId),
    enabled: !!selectedBrandId
  });

  const projects = projectsQ.data?.projects ?? [];

  const sortedProjects = useMemo(() => {
    const ts = (p) => toTimeMs(getCreatedAt(p));
    return [...projects].sort((a, b) => ts(b) - ts(a));
  }, [projects]);

  const createMut = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!selectedBrandId) throw new Error("No brand selected");
      if (!n) throw new Error("Project name is required");
      if (!projectType) throw new Error("Project type is required");

      const brainstorm_count = isInnovation ? brainstormCount : 0;

      return createProject(selectedBrandId, n, projectType, objective, brainstorm_count);
    },
    onSuccess: (data) => {
      const created = data?.project ?? data;

      qc.invalidateQueries({ queryKey: ["projects", selectedBrandId] });

      if (selectedBrand) setActiveBrand(selectedBrand);
      setActiveProject(created);

      setName("");
      setProjectType(PROJECT_TYPES?.[0]?.value ?? "");
      setObjective("Generate world-first ideas that fit the materials");
      setBrainstormCount(10);
      setOpen(false);

      router.push(`/brand/${selectedBrandId}`);
    }
  });

  const deleteMut = useMutation({
    mutationFn: async (projectId) => deleteProject(selectedBrandId, projectId),
    onSuccess: (_, projectId) => {
      const activeId = String(getProjectId(activeProject) ?? "");
      if (activeId && activeId === String(projectId)) {
        setActiveProject(null);
      }
      qc.invalidateQueries({ queryKey: ["projects", selectedBrandId] });
    }
  });

  const activeProjectIdStr = String(getProjectId(activeProject) ?? "");

  if (!isAuthed) return null;

  return (
    <div className="w-full py-6">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Brands
          </h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          {/* LEFT: Brands */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-3">
              <div className="text-sm font-semibold text-zinc-900">Brands</div>
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-auto p-3">
              {!brandsQ.isLoading &&
                !brandsQ.error &&
                brands.length > 0 &&
                brands.map((b) => {
                  const selected = b.id === selectedBrandId;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBrandId(b.id)}
                      className={[
                        "mb-2 w-full rounded-xl border p-3 text-left transition last:mb-0",
                        "hover:bg-zinc-50 focus:outline-none focus:ring-4 focus:ring-zinc-900/10",
                        selected
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-zinc-200 bg-white"
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
                          {b.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={b.logo_url}
                              alt={`${b.name} logo`}
                              className="h-full w-full object-contain p-1"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-xs font-semibold text-zinc-500">
                              {initials(b.name)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {b.name}
                          </div>
                        </div>

                        <div className="text-xs text-zinc-400">{selected ? "✓" : "→"}</div>
                      </div>
                    </button>
                  );
                })}

              {brandsQ.isLoading && (
                <div className="text-sm text-zinc-600">Loading…</div>
              )}

              {brandsQ.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Failed to load brands: {String(brandsQ.error.message || brandsQ.error)}
                </div>
              )}

              {!brandsQ.isLoading && !brandsQ.error && brands.length === 0 && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-700">
                  No brands
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Projects */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-900">
                    Projects
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setName("");
                    setProjectType(PROJECT_TYPES?.[0]?.value ?? "");
                    setObjective("Generate world-first ideas that fit the materials");
                    setBrainstormCount(10);
                    setOpen(true);
                  }}
                  disabled={!selectedBrandId}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-zinc-800
                             disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-zinc-900/10"
                  title="New project"
                >
                  <PlusIcon className="h-4 w-4" />
                  New project
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-auto p-3">
              {!selectedBrandId && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-700">
                  Select a brand
                </div>
              )}

              {selectedBrandId &&
                !projectsQ.isLoading &&
                !projectsQ.error &&
                sortedProjects.length > 0 && (
                  <div className="space-y-2">
                    {sortedProjects.map((p, idx) => {
                      const pidStr = String(getProjectId(p) ?? `${idx}`);
                      const selected = pidStr && pidStr === activeProjectIdStr;

                      const typeLabel = typeLabelFor(p);
                      const createdAt = getCreatedAt(p);
                      const createdText = createdAt ? formatDateTime(createdAt) : "—";

                      return (
                        <div
                          key={pidStr}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (selectedBrand) setActiveBrand(selectedBrand);
                            setActiveProject(p);
                            router.push(`/brand/${selectedBrandId}`);
                          }}
                          className={[
                            "group cursor-pointer rounded-xl border p-3 text-left transition",
                            "hover:bg-zinc-50 focus:outline-none focus:ring-4 focus:ring-emerald-500/15",
                            selected
                              ? "border-emerald-300 bg-emerald-50/40"
                              : "border-zinc-200 bg-white"
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={[
                                    "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-lg border px-1.5 text-[11px] font-semibold",
                                    selected
                                      ? "border-emerald-300 bg-white text-emerald-700"
                                      : "border-zinc-200 bg-white text-zinc-600"
                                  ].join(" ")}
                                >
                                  {idx + 1}
                                </span>

                                <div
                                  className={[
                                    "truncate text-sm",
                                    selected
                                      ? "font-semibold text-zinc-900"
                                      : "font-medium text-zinc-900"
                                  ].join(" ")}
                                >
                                  {p?.name}
                                </div>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                                <span className="font-semibold text-zinc-700">
                                  {typeLabel || "—"}
                                </span>
                                <span className="text-zinc-300">•</span>
                                <span>{createdText}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              title="Delete project"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const id = getProjectId(p);
                                if (!id) return;
                                deleteMut.mutate(id);
                              }}
                              className={[
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                                "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                selected ? "opacity-100" : ""
                              ].join(" ")}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              {selectedBrandId && projectsQ.isLoading && (
                <div className="text-sm text-zinc-600">Loading…</div>
              )}

              {selectedBrandId && projectsQ.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Failed to load projects: {String(projectsQ.error.message || projectsQ.error)}
                </div>
              )}

              {selectedBrandId &&
                !projectsQ.isLoading &&
                !projectsQ.error &&
                sortedProjects.length === 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-700">
                    No projects
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Create project dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <DialogTitle className="text-base font-semibold text-zinc-900">
                Create new project
              </DialogTitle>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-700">
                  Project name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Product Launch Campaign"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-zinc-900/10"
                />
                {createMut.isError && (
                  <div className="mt-2 text-sm text-red-700">
                    {String(createMut.error.message)}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-700">
                  Objective
                </label>
                <input
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Generate world-first ideas that fit the materials"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-zinc-900/10"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-700">
                    Project type
                  </label>
                  {!projectType && <span className="text-xs text-red-600">Required</span>}
                </div>

                <div className="mt-2 grid gap-2">
                  {PROJECT_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={[
                        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2",
                        projectType === t.value
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 bg-white hover:bg-zinc-50"
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="projectType"
                        value={t.value}
                        checked={projectType === t.value}
                        onChange={() => setProjectType(t.value)}
                        className="h-4 w-4 accent-zinc-900"
                      />
                      <span className="text-sm text-zinc-800">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ✅ Only show when project type is innovation */}
              {isInnovation && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-700">
                    Brainstorm count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={brainstormCount}
                    onChange={(e) => setBrainstormCount(parseInt(e.target.value) || 10)}
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-zinc-900/10"
                  />
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending || !name.trim() || !projectType}
                  className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {createMut.isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </div>
    </div>
  );
}

function initials(name = "") {
  const s = String(name || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function getCreatedAt(p) {
  return p?.created_at ?? p?.createdAt ?? p?.created ?? p?.inserted_at ?? null;
}

function toTimeMs(v) {
  if (!v) return 0;
  const d = new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatDateTime(v) {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}
