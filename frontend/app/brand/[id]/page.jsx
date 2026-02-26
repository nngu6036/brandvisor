"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { DocumentTextIcon, MinusIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";

import MaterialSidebar from "../../../components/MaterialSidebar";
import IdeasStrip from "../../../components/IdeasStrip";
import IdeasRevision from "../../../components/IdeasRevision";
import IdeasNav from "../../../components/IdeasNav";
import IdeaInnovationPad from "../../../components/IdeaInnovationPad";

import { useAuthStore } from "../../../lib/authStore";
import { useBrandStore } from "../../../lib/store";
import {
  fetchBrandById,
  fetchProjectById, 
  projectStreamUrl,
  fetchProjectIdeas,
  commentProjectIdea,
  generateMockupProjectIdea,
  generateBriefProjectIdea,
  selectProjectIdea,
  unselectProjectIdea,
  updateProjectObjective,
} from "../../../lib/api";
import {
  PROJECT_WORKFLOW_STATE,
  PROJECT_WORKFLOW_STATUS,
} from "../../../lib/constants";

function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

export default function BrandWorkspacePage() {
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const isAuthed = useAuthStore((s) => s.isAuthed);

  const activeProjectId = useBrandStore((s) => s.activeProject?.id);
  const setActiveProject = useBrandStore((s) => s.setActiveProject);

  // ✅ Local activeProject loaded from API
  const [activeProject, setActiveProjectLocal] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [projectErr, setProjectErr] = useState("");
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [objectiveDraft, setObjectiveDraft] = useState("");
  const [savingObjective, setSavingObjective] = useState(false);

  // Ideas store state (single source of truth)
  const storedIdeas = useBrandStore((s) => s.projectIdeas);
  const storedIdeasProjectId = useBrandStore((s) => s.projectIdeasProjectId);
  const setIdeasState = useBrandStore((s) => s.setProjectIdeasState);
  const clearIdeas = useBrandStore((s) => s.clearProjectIdeas);
  const sseConnected = useBrandStore((s) => s.sseConnected);
  const sseConnecting = useBrandStore((s) => s.sseConnecting);
  const sseUI = useBrandStore((s) => s.sseUI);
  const sseLog = useBrandStore((s) => s.sseLog);
  const setSseState = useBrandStore((s) => s.setSseState);
  const pushSseLog = useBrandStore((s) => s.pushSseLog);
  const resetSseState = useBrandStore((s) => s.resetSseState);

  const [brand, setBrand] = useState(null);
  const [loadingBrand, setLoadingBrand] = useState(true);
  const [brandErr, setBrandErr] = useState("");

  // Mobile drawer (left column)
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);

  // Innovation pad selected ideas (dropped)
  const [padIdeas, setPadIdeas] = useState([]);

  // IdeasStrip modal
  const [ideasStripOpen, setIdeasStripOpen] = useState(false);

  // Only for highlight in IdeasStrip (NO add-to-pad on click)
  const [ideasStripSelectedId, setIdeasStripSelectedId] = useState(null);

  // IdeasRefine modal
  const [ideasRefineOpen, setIdeasRefineOpen] = useState(false);
  const [initStatusMinimized, setInitStatusMinimized] = useState(false);
  const [workspaceUpdatesLoading, setWorkspaceUpdatesLoading] = useState(false);
  const [showUpdatesDialog, setShowUpdatesDialog] = useState(false);

  // SSE
  const eventSourceRef = useRef(null);
  const streamingProjectIdRef = useRef(null);
  const lastWorkflowStateRef = useRef(null);

  // Avoid spamming refetch during RUNNING/COMPLETE
  const lastMaterialsRefetchKeyRef = useRef("");
  const lastIdeasRefetchKeyRef = useRef("");

  const normalize = (v) => String(v ?? "").toUpperCase();
  const closeIdeasStripDialog = useCallback(() => {
    setIdeasStripOpen(false);
    setIdeasStripSelectedId(null);
  }, []);

  const closeIdeasRefineDialog = useCallback(() => {
    setIdeasRefineOpen(false);
  }, []);

  // ESC to close dialog
  useEffect(() => {
    if (!ideasStripOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeIdeasStripDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ideasStripOpen, closeIdeasStripDialog]);

  useEffect(() => {
    if (!ideasRefineOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeIdeasRefineDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ideasRefineOpen, closeIdeasRefineDialog]);

  useEffect(() => {
    if (isEditingObjective) return;
    setObjectiveDraft(activeProject?.objective || "");
  }, [isEditingObjective, activeProjectId, activeProject?.objective]);

  const closeStream = useCallback(() => {
    const es = eventSourceRef.current;
    if (es) {
      try {
        es.close();
      } catch {}
    }
    eventSourceRef.current = null;
    streamingProjectIdRef.current = null;

    resetSseState();
  }, [resetSseState]);

  const refetchMaterials = useCallback(
    (projectId, key) => {
      if (!projectId) return;
      if (key && lastMaterialsRefetchKeyRef.current === key) return;
      if (key) lastMaterialsRefetchKeyRef.current = key;

      queryClient.invalidateQueries({ queryKey: ["materials", projectId] });
    },
    [queryClient],
  );

  const refetchIdeas = useCallback(
    async (projectId, key) => {
      if (!projectId) return;
      if (key && lastIdeasRefetchKeyRef.current === key) return;
      if (key) lastIdeasRefetchKeyRef.current = key;
      try {
        setIdeasState({
          projectIdeasLoading: true,
          projectIdeasError: null,
          projectIdeasProjectId: projectId,
        });

        const data = await fetchProjectIdeas(projectId);
        const list = Array.isArray(data?.ideas) ? data.ideas : [];

        setIdeasState({
          projectIdeas: list,
          projectIdeasLoading: false,
          projectIdeasError: null,
          projectIdeasProjectId: projectId,
        });
      } catch (e) {
        setIdeasState({
          projectIdeas: [],
          projectIdeasLoading: false,
          projectIdeasError: e?.message || "Failed to load ideas",
          projectIdeasProjectId: projectId,
        });
      }
    },
    [setIdeasState],
  );

  const mergeUpdatedIdea = useCallback(
    (ideaId, updatedIdea) => {
      if (!ideaId || !updatedIdea) return;

      setPadIdeas((prev) =>
        prev.map((x) => (x?.id === ideaId ? { ...x, ...updatedIdea } : x)),
      );

      const st = useBrandStore.getState();
      const list = Array.isArray(st?.projectIdeas) ? st.projectIdeas : null;
      if (!list) return;

      setIdeasState({
        projectIdeas: list.map((x) =>
          x?.id === ideaId ? { ...x, ...updatedIdea } : x,
        ),
      });
    },
    [setIdeasState],
  );

  const syncIdeasFromResponseOrRefetch = useCallback(
    async (projectId, response, key) => {
      if (Array.isArray(response?.ideas)) {
        setIdeasState({
          projectIdeas: response.ideas,
          projectIdeasLoading: false,
          projectIdeasError: null,
          projectIdeasProjectId: projectId,
        });
        return;
      }
      await refetchIdeas(projectId, key);
    },
    [refetchIdeas, setIdeasState],
  );

  // ✅ Fetch full active project into LOCAL state (based on store project id)
  useEffect(() => {
    let alive = true;

    async function loadProject() {
      if (!activeProjectId) {
        setActiveProjectLocal(null);
        setLoadingProject(false);
        setProjectErr("");
        return;
      }

      setLoadingProject(true);
      setProjectErr("");

      try {
        const data = await fetchProjectById(id,activeProjectId);
        const proj = data?.project ?? data; // support either {project} or raw project
        if (!alive) return;

        setActiveProjectLocal(proj || null);

        // Optional: keep store in sync for other components
        if (proj) setActiveProject(proj);
      } catch (e) {
        if (!alive) return;
        setActiveProjectLocal(null);
        setProjectErr(e?.message || "Failed to load project");
      } finally {
        if (alive) setLoadingProject(false);
      }
    }

    void loadProject();
    return () => {
      alive = false;
    };
  }, [activeProjectId, id, setActiveProject]);

  const connectToProjectStream = useCallback(
    (projectId) => {
      if (!projectId) return;

      closeStream();

      setSseState({ sseConnected: false, sseConnecting: true });

      const es = new EventSource(projectStreamUrl(projectId));
      eventSourceRef.current = es;
      streamingProjectIdRef.current = projectId;

      const logEvent = (e) => {
        console.log(`[SSE:${e.type}]`, {
          lastEventId: e.lastEventId,
          data: e.data,
        });
      };

      es.onopen = () => {
        setSseState({ sseConnected: true, sseConnecting: false });
      };

      es.onmessage = (e) => {
        logEvent(e);
      };

      es.addEventListener("workflow", (e) => {
        logEvent(e);

        let payload = null;
        try {
          payload = JSON.parse(e.data || "{}");
        } catch (err) {
          console.warn("[SSE:workflow] JSON parse failed:", err, e.data);
          return;
        }

        const message = payload?.message != null ? String(payload.message) : "";
        const title = payload?.title != null ? String(payload.title) : "";
        const type = payload?.type ?? null;;
        const status = payload?.status ?? null;
        const state = payload?.state ?? null;
        const nextState = payload?.state ?? null;
        const nextStatus = payload?.status ?? null;
        const nextType = payload?.type ?? null;
        const isStartState =
          normalize(nextState) === normalize(PROJECT_WORKFLOW_STATE.START);
        const isFinishState =
          normalize(nextState) === normalize(PROJECT_WORKFLOW_STATE.FINISH);
        const prevState = lastWorkflowStateRef.current;
        const hasWorkflowStateChanged =
          nextState != null && String(prevState ?? "") !== String(nextState);
        const prevTitle =
          (useBrandStore.getState()?.sseUI?.title != null
            ? String(useBrandStore.getState().sseUI.title)
            : "");
        const hasTitleChanged = String(title || "") !== prevTitle;

        if (hasWorkflowStateChanged) {
          setShowUpdatesDialog(true);
          lastWorkflowStateRef.current = nextState;
        }

        if (isStartState) setWorkspaceUpdatesLoading(true);
        if (isStartState) setInitStatusMinimized(false);
        if (isFinishState) setWorkspaceUpdatesLoading(false);

        if (streamingProjectIdRef.current === projectId) {
          setSseState({
            sseUI: {
              title,
              message,
              workflow_type:type,
              workflow_status: status,
              workflow_state: state,
            },
            sseConnected: true,
            sseConnecting: false,
            ...(hasTitleChanged ? { sseLog: [] } : {}),
          });

          if (message) {
            pushSseLog({ id: `${Date.now()}-${Math.random()}`, text: message });
          }
        }
        if (!nextState && !nextStatus && !nextType) return;
        if (streamingProjectIdRef.current !== projectId) return;

        // Merge into STORE project (for other components)
        const current = useBrandStore.getState().activeProject;
        if (current && current.id === projectId) {
          const mergedType = nextType ?? current.workflow_type;
          const mergedState = nextState ?? current.workflow_state;
          const mergedStatus = nextStatus ?? current.workflow_status;
          const runId = payload?.run_id ?? current.workflow_run_id ?? "";

          setActiveProject({
            ...current,
            workflow_type:mergedType,
            workflow_state: mergedState,
            workflow_status: mergedStatus,
            workflow_run_id: runId,
          });
        }

        // Merge into LOCAL project (used by this page)
        setActiveProjectLocal((prev) => {
          if (!prev || prev.id !== projectId) return prev;
          return {
            ...prev,
            workflow_type: nextType ?? prev.workflow_type,
            workflow_state: nextState ?? prev.workflow_state,
            workflow_status: nextStatus ?? prev.workflow_status,
            workflow_run_id: payload?.run_id ?? prev.workflow_run_id ?? "",
          };
        });

        // --- existing refresh logic kept as-is ---
        const mergedForChecks =
          (useBrandStore.getState().activeProject &&
            useBrandStore.getState().activeProject.id === projectId &&
            useBrandStore.getState().activeProject) ||
          null;

        if (!mergedForChecks) return;

        const mergedState =
          payload?.state ?? mergedForChecks.workflow_state ?? null;
        const mergedStatus =
          payload?.status ?? mergedForChecks.workflow_status ?? null;
        const runId = payload?.run_id ?? mergedForChecks.workflow_run_id ?? "";

        const isRunning =
          normalize(mergedStatus) === normalize(PROJECT_WORKFLOW_STATUS.RUNNING);
        console.log("SSE workflow event processed", {
          projectId,
          mergedState,
          mergedStatus,
          runId
        });
        // Materials refresh: only during RUNNING collect_input
        if (
          isRunning &&
          normalize(mergedStatus) === PROJECT_WORKFLOW_STATE.COLLECT_INPUT
        ) {
          const key = `${projectId}:${runId}:${mergedState}:${mergedStatus}`;
          refetchMaterials(projectId, key);
        }
        
        // Ideas refresh: only when GENERATE_CONTENT is COMPLETE
        if (
          normalize(mergedStatus) ===
            normalize(PROJECT_WORKFLOW_STATUS.COMPLETE) &&
          normalize(mergedState) === PROJECT_WORKFLOW_STATE.SCORE
        ) {
          const key = `${projectId}:${runId}:${mergedState}:${mergedStatus}`;
          void refetchIdeas(projectId, key);
        }

        if (
          normalize(mergedStatus) ===
            normalize(PROJECT_WORKFLOW_STATUS.COMPLETE) &&
          normalize(mergedState) === PROJECT_WORKFLOW_STATE.GENERATE_BASE_IDEAS
        ) {
          const key = `${projectId}:${runId}:${mergedState}:${mergedStatus}`;
          void refetchIdeas(projectId, key);
        }
      });

      es.onerror = (e) => {
        console.log("[SSE] error", e);
        setSseState({ sseConnected: false, sseConnecting: false });
        closeStream();
      };
    },
    [
      closeStream,
      normalize,
      pushSseLog,
      refetchIdeas,
      refetchMaterials,
      setActiveProject,
      setSseState,
    ],
  );

  // auth redirect
  useEffect(() => {
    if (!isAuthed) router.replace("/login");
  }, [isAuthed, router]);

  // load brand
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoadingBrand(true);
      setBrandErr("");
      try {
        const data = await fetchBrandById(id);
        if (!alive) return;
        setBrand(data.brand);
      } catch (e) {
        if (!alive) return;
        setBrandErr(e.message || "Failed to load brand");
      } finally {
        if (alive) setLoadingBrand(false);
      }
    }

    if (id) load();
    return () => {
      alive = false;
    };
  }, [id]);

  // ✅ on project open/switch (based on activeProjectId)
  useEffect(() => {
    const newPid = activeProjectId || null;
    const currentPid = streamingProjectIdRef.current;

    setIdeasStripOpen(false);
    setIdeasStripSelectedId(null);
    setIdeasRefineOpen(false);
    setPadIdeas([]);
    setWorkspaceUpdatesLoading(false);
    setShowUpdatesDialog(false);
    lastWorkflowStateRef.current = null;

    resetSseState();

    if (!newPid) {
      clearIdeas();
      closeStream();
      return;
    }

    refetchMaterials(newPid, `open:${newPid}`);
    if (storedIdeasProjectId !== newPid || !Array.isArray(storedIdeas)) {
      void refetchIdeas(newPid, `open:${newPid}`);
    }

    if (currentPid && currentPid !== newPid) closeStream();
    connectToProjectStream(newPid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  // cleanup stream on unmount
  useEffect(() => {
    return () => closeStream();
  }, [closeStream]);

  // Safety net: ensure SSE stream is connected on page open when an active project
  // already exists in global store (e.g. restored session/navigation reload).
  useEffect(() => {
    if (!activeProjectId) return;
    if (streamingProjectIdRef.current === activeProjectId) return;
    connectToProjectStream(activeProjectId);
  }, [activeProjectId, connectToProjectStream]);

  const hasProject = !!activeProjectId;

  const ideas = Array.isArray(storedIdeas) ? storedIdeas : [];
  const hasIdeas = ideas.length > 0;

  // ✅ When ideas are loaded, auto-populate the pad with ideas already selected on the backend
  useEffect(() => {
    if (!hasProject) return;
    if (!Array.isArray(ideas) || ideas.length === 0) return;

    const selectedIdeas = ideas.filter((x) => x?.selected === true);
    if (selectedIdeas.length === 0) return;

    // merge selected ideas into current pad (do not remove existing)
    setPadIdeas((prev) => {
      const map = new Map();
      (prev || []).forEach((x) => {
        const k = x?.id ?? x?.title;
        if (k != null) map.set(String(k), x);
      });
      selectedIdeas.forEach((x) => {
        const k = x?.id ?? x?.title;
        if (k != null && !map.has(String(k))) map.set(String(k), x);
      });
      return Array.from(map.values());
    });
  }, [hasProject, activeProjectId, ideas]);

  const isRunning =
    normalize(sseUI.workflow_status) ===
    normalize(PROJECT_WORKFLOW_STATUS.RUNNING);

  const openIdeasStripDialog = () => {
    if (!hasProject) return;
    setIdeasStripOpen(true);
  };

  const openIdeasRefineDialog = useCallback(() => {
    if (!hasProject) return;
    if (!hasIdeas) return;
    setIdeasStripOpen(false);
    setIdeasStripSelectedId(null);
    setIdeasRefineOpen(true);
  }, [hasProject, hasIdeas]);

  const startEditObjective = useCallback(() => {
    if (!hasProject || loadingProject) return;
    setObjectiveDraft(activeProject?.objective || "");
    setIsEditingObjective(true);
  }, [hasProject, loadingProject, activeProject?.objective]);

  const saveObjectiveInline = useCallback(async () => {
    if (!hasProject || !activeProjectId) {
      setIsEditingObjective(false);
      return;
    }

    const nextObjective = String(objectiveDraft || "").trim();
    const currentObjective = String(activeProject?.objective || "").trim();
    setIsEditingObjective(false);

    if (nextObjective === currentObjective) return;

    try {
      setSavingObjective(true);
      await updateProjectObjective(id, activeProjectId, nextObjective);

      setActiveProjectLocal((prev) =>
        prev ? { ...prev, objective: nextObjective } : prev
      );
      const current = useBrandStore.getState().activeProject;
      if (current && current.id === activeProjectId) {
        setActiveProject({ ...current, objective: nextObjective });
      }
    } catch (e) {
      window.alert(e?.message || "Failed to update objective");
      setObjectiveDraft(currentObjective);
    } finally {
      setSavingObjective(false);
    }
  }, [hasProject, activeProjectId, objectiveDraft, activeProject?.objective, id, setActiveProject]);

  // called by IdeaInnovationPad on drop
  const handleDropIdeaToPad = useCallback(
    (idea) => {
      if (!idea) return;

      const projectId = activeProjectId;
      const ideaId = idea?.id;

      let added = false;

      // optimistic add
      setPadIdeas((prev) => {
        const key = idea?.id ?? idea?.title;
        if (!key) return prev;
        if (prev.some((x) => (x?.id ?? x?.title) === key)) return prev;
        added = true;
        return [...prev, idea];
      });

      // if already on pad, don't call API again
      if (!added) return;
      if (!projectId || !ideaId) return;

      void (async () => {
        try {
          const res = await selectProjectIdea(projectId, ideaId);
          await syncIdeasFromResponseOrRefetch(
            projectId,
            res,
            `select:${projectId}:${ideaId}:${Date.now()}`,
          );
        } catch (e) {
          console.warn("[selectProjectIdea] failed:", e);
        }
      })();
    },
    [activeProjectId, syncIdeasFromResponseOrRefetch],
  );

  const handleBriefIdea = useCallback(
    async (idea) => {
      const projectId = activeProjectId;
      const ideaId = idea?.id;
      if (!projectId || !ideaId) return;

      try {
        const res = await generateBriefProjectIdea(projectId, ideaId);

        const updatedIdea =
          res?.idea ||
          (Array.isArray(res?.ideas)
            ? res.ideas.find((x) => x?.id === ideaId)
            : null) ||
          res?.updated ||
          null;

        if (updatedIdea) mergeUpdatedIdea(ideaId, updatedIdea);
      } catch (e) {
        window.alert(e?.message || "Failed to generate brief");
      }
    },
    [activeProjectId, mergeUpdatedIdea],
  );

  const handleMockupIdea = useCallback(
    async (idea) => {
      const projectId = activeProjectId;
      const ideaId = idea?.id;
      if (!projectId || !ideaId) return;

      try {
        const res = await generateMockupProjectIdea(projectId, ideaId);

        const updatedIdea =
          res?.idea ||
          (Array.isArray(res?.ideas)
            ? res.ideas.find((x) => x?.id === ideaId)
            : null) ||
          res?.updated ||
          null;

        if (updatedIdea) mergeUpdatedIdea(ideaId, updatedIdea);
      } catch (e) {
        window.alert(e?.message || "Failed to generate mockup");
      }
    },
    [activeProjectId, mergeUpdatedIdea],
  );

  const handleRemovePadIdea = useCallback(
    (ideaId) => {
      if (!ideaId) return;

      const projectId = activeProjectId;

      // optimistic remove
      setPadIdeas((prev) =>
        prev.filter((x) => String(x?.id ?? x?.title ?? "") !== String(ideaId)),
      );

      if (!projectId) return;

      void (async () => {
        try {
          const res = await unselectProjectIdea(projectId, ideaId);
          await syncIdeasFromResponseOrRefetch(
            projectId,
            res,
            `unselect:${projectId}:${ideaId}:${Date.now()}`,
          );
        } catch (e) {
          console.warn("[unselectProjectIdea] failed:", e);
        }
      })();
    },
    [activeProjectId, syncIdeasFromResponseOrRefetch],
  );

  // Comment flow: prompt -> API -> update idea in pad (and in store list)
  const handleCommentIdea = useCallback(
    async (idea, commentText) => {
      const projectId = activeProjectId;
      const ideaId = idea?.id;
      const comment = (commentText ?? "").trim();

      if (!projectId || !ideaId || !comment) return;

      try {
        const res = await commentProjectIdea(projectId, ideaId, comment);

        const updatedIdea =
          res?.idea ||
          (Array.isArray(res?.ideas)
            ? res.ideas.find((x) => x?.id === ideaId)
            : null) ||
          res?.updated ||
          null;

        if (updatedIdea) mergeUpdatedIdea(ideaId, updatedIdea);
      } catch (e) {
        window.alert(e?.message || "Failed to submit comment");
      }
    },
    [activeProjectId, mergeUpdatedIdea],
  );

  const Breakout = ({ children }) => (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      {children}
    </div>
  );

  if (!isAuthed) return null;

  if (loadingBrand) {
    return (
      <Breakout>
        <div className="px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            Loading brand…
          </div>
        </div>
      </Breakout>
    );
  }

  if (brandErr) {
    return (
      <Breakout>
        <div className="px-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {brandErr}
          </div>
        </div>
      </Breakout>
    );
  }

  if (!brand) {
    return (
      <Breakout>
        <div className="px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
            Brand not found.
          </div>
        </div>
      </Breakout>
    );
  }

  const fallbackLine = sseConnecting
    ? "Connecting to live updates…"
    : isRunning
      ? "Working on it…"
      : "Waiting for updates…";

  const showInitSpinner = sseConnecting || isRunning || !sseConnected;

  return (
    <Breakout>
      <div className="px-6">
        <div className="h-[calc(100vh-64px)] min-h-[calc(100vh-64px)] w-full">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* LEFT */}
            <div className="hidden min-h-0 lg:block">
              <div className="h-full min-h-0 overflow-y-auto pr-1">
                <div className="flex flex-col gap-4">
                  {hasProject ? (
                    <MaterialSidebar />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                      <div className="font-semibold text-zinc-900">
                        Materials
                      </div>
                      <p className="mt-1">
                        Select a project to view materials.
                      </p>
                    </div>
                  )}

                  {hasProject ? (
                    <IdeasNav
                      projectId={activeProjectId}
                      selectedId={null}
                      onMaximize={openIdeasStripDialog}
                      onRevise={openIdeasRefineDialog}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                      <div className="font-semibold text-zinc-900">Ideas</div>
                      <p className="mt-1">Select a project to browse ideas.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER */}
            <div className="min-h-0 overflow-hidden">
              <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 backdrop-blur px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold text-indigo-700">
                        {brand.name || "Brand"}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
                        <div className="flex items-center gap-2">
                          <span>Current project:</span>
                          <span
                            className={[
                              "font-medium",
                              hasProject ? "text-emerald-600" : "text-zinc-800",
                            ].join(" ")}
                          >
                            {!hasProject
                              ? "None selected"
                              : loadingProject
                                ? "Loading…"
                                : `${activeProject?.name || "Unnamed project"}`}
                          </span>
                          {hasProject && !loadingProject ? (
                            <div className="flex items-center gap-1 min-w-0">
                              {isEditingObjective ? (
                                <input
                                  type="text"
                                  value={objectiveDraft}
                                  onChange={(e) => setObjectiveDraft(e.target.value)}
                                  onBlur={() => void saveObjectiveInline()}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      e.currentTarget.blur();
                                    }
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      setObjectiveDraft(activeProject?.objective || "");
                                      setIsEditingObjective(false);
                                    }
                                  }}
                                  autoFocus
                                  className="w-[min(42rem,58vw)] rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  placeholder="Add objective"
                                  disabled={savingObjective}
                                />
                              ) : (
                                <>
                                  <span className="max-w-[42rem] truncate text-zinc-700">
                                    {` ${activeProject?.objective || "-"}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={startEditObjective}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                                    title="Edit objective"
                                    aria-label="Edit objective"
                                    disabled={savingObjective}
                                  >
                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                        {projectErr ? (
                          <span className="text-red-600">{projectErr}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 lg:hidden">
                      <button
                        type="button"
                        onClick={() => setShowLeftDrawer(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                        disabled={!hasProject}
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        Left Panel
                      </button>
                    </div>
                  </div>
                </div>

                {!hasProject ? (
                  <div className="p-6 text-sm text-zinc-600">
                    Select a project to begin.
                  </div>
                ) : (
                  <IdeaInnovationPad
                    droppedIdeas={padIdeas}
                    onDropIdea={handleDropIdeaToPad}
                    onRemoveIdea={handleRemovePadIdea}
                    onSubmitIdeaComment={handleCommentIdea}
                    onMockupIdea={handleMockupIdea}
                    onBriefIdea={handleBriefIdea}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mobile drawer */}
          {showLeftDrawer && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/30"
                onClick={() => setShowLeftDrawer(false)}
              />
              <div className="absolute inset-y-0 left-0 w-[320px] max-w-[85vw] bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">
                    Materials & Ideas
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLeftDrawer(false)}
                    className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
                  >
                    Close
                  </button>
                </div>

                <div className="h-[calc(100vh-80px)] overflow-auto">
                  {hasProject ? (
                    <div className="space-y-3">
                      <MaterialSidebar />
                      <IdeasNav
                        projectId={activeProjectId}
                        selectedId={null}
                        onMaximize={() => {
                          setShowLeftDrawer(false);
                          openIdeasStripDialog();
                        }}
                        onRevise={() => {
                          setShowLeftDrawer(false);
                          openIdeasRefineDialog();
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                      Select a project to view materials and ideas.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Init SSE status popup (non-closeable, minimizable) */}
          <ModalPortal>
            {showUpdatesDialog ? (
              <div
                className="fixed bottom-4 right-4 transition-opacity"
                style={{ zIndex: 2147483646 }}
                aria-hidden={false}
              >
                {initStatusMinimized ? (
                  <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => setInitStatusMinimized(false)}
                      className="text-xs font-semibold text-zinc-700 hover:text-zinc-900"
                    >
                      Show workspace updates
                    </button>
                  </div>
                ) : (
                  <div className="w-[min(460px,92vw)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <span>{sseUI?.title || "Workspace Updates"}</span>
                        {workspaceUpdatesLoading ? (
                          <Spinner className="h-3.5 w-3.5 text-zinc-500" />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setInitStatusMinimized(true)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        aria-label="Minimize updates"
                        title="Minimize"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto px-4 py-3">
                      <div className="space-y-1 text-xs italic text-zinc-600">
                        {sseLog.length > 0 ? (
                          sseLog
                            .slice()
                            .reverse()
                            .map((item) => (
                              <div key={item.id} className="break-words">
                                {item.text}
                              </div>
                            ))
                        ) : (
                          <div>{fallbackLine}</div>
                        )}
                      </div>
                      {!sseConnected && !sseConnecting && (
                        <div className="mt-3 text-xs italic text-zinc-400">
                          Live updates disconnected. Re-enter the project to reconnect.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </ModalPortal>

          {/* Ideas revision modal rendered in a portal to BODY so it always stays on top */}
          <ModalPortal>
            <div
              className={[
                "fixed inset-0 transition-opacity",
                ideasRefineOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
              ].join(" ")}
              style={{ zIndex: 2147483647 }}
              aria-hidden={!ideasRefineOpen}
            >
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={closeIdeasRefineDialog}
                />

              <div className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2">
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl max-h-[86vh]">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-900">
                        Revise Project Ideas
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeIdeasRefineDialog}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="max-h-[calc(86vh-56px)] overflow-y-auto p-1">
                    <IdeasRevision
                      brandId={id}
                      projectId={activeProjectId}
                      objective={activeProject?.objective || ""}
                      open={ideasRefineOpen}
                      onFinished={closeIdeasRefineDialog}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>

          {/* IdeasStrip modal rendered in a portal to BODY so it always stays on top */}
          {ideasStripOpen && (
            <ModalPortal>
              <div className="fixed inset-0" style={{ zIndex: 2147483647 }}>
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={closeIdeasStripDialog}
                />

                <div className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2">
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-900">
                          Project Ideas
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={closeIdeasStripDialog}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                      >
                        Close
                      </button>
                    </div>

                    {/* Clicking an idea ONLY highlights it */}
                    <IdeasStrip
                      ideas={ideas}
                      selectedId={ideasStripSelectedId}
                      onSelect={(idea) =>
                        setIdeasStripSelectedId(idea?.id ?? null)
                      }
                    />
                  </div>
                </div>
              </div>
            </ModalPortal>
          )}
        </div>
      </div>
    </Breakout>
  );
}

function Spinner({ className = "" }) {
  return (
    <svg
      className={["h-4 w-4 animate-spin", className].join(" ")}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v2a6 6 0 00-6 6H4z"
      />
    </svg>
  );
}
