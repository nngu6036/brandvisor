"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { createProject, fetchProjects, deleteProject } from "../lib/api";
import { useBrandStore } from "../lib/store";
import { PROJECT_TYPES } from "../lib/constants";

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

/**
 * Normalize project id across different backend shapes.
 * Supports: id, _id, project_id, projectId, etc.
 */
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

export default function ProjectsSidebar() {
  const qc = useQueryClient();
  const setActiveProject = useBrandStore((s) => s.setActiveProject);
  const activeProject = useBrandStore((s) => s.activeProject);
  const brandId = useBrandStore((s) => s.activeBrand?.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState(PROJECT_TYPES?.[0]?.value ?? "");

  const projectsQuery = useQuery({
    queryKey: ["projects", brandId],
    queryFn: () => fetchProjects(brandId),
    enabled: !!brandId
  });

  const projects = projectsQuery.data?.projects ?? [];

  // Keep existing order, just memoize
  const sorted = useMemo(() => projects, [projects]);

  const createMut = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error("Project name is required");
      if (!projectType) throw new Error("Project type is required");
      return createProject(brandId, n, projectType);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["projects", brandId] });
      // Some APIs return { project }, others return the project directly
      setActiveProject(data?.project ?? data);
      setName("");
      setProjectType(PROJECT_TYPES?.[0]?.value ?? "");
      setOpen(false);
    }
  });

  const deleteMut = useMutation({
    mutationFn: async (projectId) => deleteProject(brandId, projectId),
    onSuccess: (_, projectId) => {
      const activeId = String(getProjectId(activeProject) ?? "");
      if (activeId && activeId === String(projectId)) {
        setActiveProject(null);
      }
      qc.invalidateQueries({ queryKey: ["projects", brandId] });
    }
  });

  const deletingId = deleteMut.variables;

  const activeIdStr = String(getProjectId(activeProject) ?? "");

  return (
    <div className="h-full min-h-0">
      <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5">
          <div className="text-sm font-semibold text-zinc-900">Projects</div>

          <button
            type="button"
            onClick={() => {
              setName("");
              setProjectType(PROJECT_TYPES?.[0]?.value ?? "");
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            title="New project"
          >
            <PlusIcon className="h-4 w-4" />
            New
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto py-2">
          {projectsQuery.isLoading && (
            <div className="px-3 py-2 text-sm text-zinc-600">Loading…</div>
          )}

          {projectsQuery.error && (
            <div className="mx-3 my-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Failed to load projects: {String(projectsQuery.error.message)}
            </div>
          )}

          {!projectsQuery.isLoading && !projectsQuery.error && sorted.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-600">
              No projects yet. Click <span className="font-medium">New</span> to create one.
            </div>
          )}

          {sorted.map((p, idx) => {
            const pidStr = String(getProjectId(p) ?? "");
            const selected = !!pidStr && pidStr === activeIdStr;
            const isDeleting = deleteMut.isPending && String(deletingId) === pidStr;

            const typeLabel = typeLabelFor(p);
            const orderNo = idx + 1;

            return (
              <div
                key={pidStr || `${p?.name ?? "project"}-${idx}`}
                role="button"
                tabIndex={0}
                onClick={() => setActiveProject(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveProject(p);
                  }
                }}
                className={[
                  "group mx-2 my-1 rounded-xl border px-3 py-2 text-left transition",
                  "focus:outline-none focus:ring-4 focus:ring-emerald-500/15",
                  selected
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-transparent hover:border-zinc-200 hover:bg-zinc-50",
                  "cursor-pointer"
                ].join(" ")}
                aria-pressed={selected}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Title row with order number */}
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={[
                          "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-lg border px-1.5 text-[11px] font-semibold",
                          selected
                            ? "border-emerald-300 bg-white text-emerald-700"
                            : "border-zinc-200 bg-white text-zinc-600"
                        ].join(" ")}
                        aria-label={`Project ${orderNo}`}
                      >
                        {orderNo}
                      </span>

                      <div
                        className={[
                          "min-w-0 truncate text-sm",
                          selected ? "font-semibold text-zinc-900" : "font-medium text-zinc-800"
                        ].join(" ")}
                      >
                        {p.name}
                      </div>
                    </div>

                    {/* Type */}
                    <div
                      className={[
                        "mt-0.5 truncate text-[11px]",
                        selected ? "text-zinc-600" : "text-zinc-500"
                      ].join(" ")}
                    >
                      {typeLabel ? `Type: ${typeLabel}` : "Type: —"}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Delete project"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isDeleting) return;
                        // Use normalized id for delete
                        const rawId = getProjectId(p);
                        if (!rawId) return;
                        deleteMut.mutate(rawId);
                      }}
                      className={[
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                        "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        selected ? "opacity-100" : ""
                      ].join(" ")}
                      disabled={isDeleting}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>

                    <div
                      className={[
                        "ml-1 text-xs text-zinc-400 opacity-0 transition-opacity",
                        "group-hover:opacity-100",
                        selected ? "opacity-100" : ""
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      →
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create project dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <DialogTitle className="text-base font-semibold text-zinc-900">
                Create new project
              </DialogTitle>
              <p className="mt-1 text-sm text-zinc-600">
                Name this marketing project (e.g., “Q1 Social Campaign”).
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-700">Project name</label>
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

              {/* Project type radio group */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-700">Project type</label>
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
      </aside>
    </div>
  );
}
