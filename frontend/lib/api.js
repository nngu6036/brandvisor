const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";


export function projectStreamUrl(projectId) {
  // IMPORTANT: adjust this to your actual backend endpoint that triggers the job (Celery etc.)
  // Example suggestion:
  return `${API_BASE}/api/projects/${projectId}/workflow/events/stream`;
}

export async function fetchProjectMaterials(projectId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/materials`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load materials (${res.status})`);
  }
  return res.json(); // { materials: [...] }
}

export async function fetchProjectIdeas(projectId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/ideas`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load ideas (${res.status})`);
  }
  return res.json(); // { ideas: [...] }
}


export async function fetchBrands() {
  const res = await fetch(`${API_BASE}/api/brands`);
  if (!res.ok) throw new Error(`Failed to load brands (${res.status})`);
  return res.json();
}

export async function fetchProjectById(brandId,projectId) {
  const res = await fetch(`${API_BASE}/api/brands/${brandId}/projects/${projectId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load project (${res.status})`);
  }
  return res.json(); // { project: {...} }
}

export async function fetchBrandById(brandId) {
  const res = await fetch(`${API_BASE}/api/brands/${brandId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load brand (${res.status})`);
  }
  return res.json(); // { brand: {...} }
}

export async function fetchProjects(brandId) {
  const res = await fetch(`${API_BASE}/api/brands/${brandId}/projects`);
  if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
  return res.json();
}

export async function createProject(brandId, name, projectType, objective, brainstormCount) {
  const payload = {
    name,
    type: projectType,  
    objective: objective,
    brainstorm_count: brainstormCount
  };

  const res = await fetch(`${API_BASE}/api/brands/${brandId}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Create failed (${res.status})`);
  }

  return res.json();
}


export async function deleteProject(brandId,projectId) {
  const res = await fetch(`${API_BASE}/api/brands/${brandId}/projects/${projectId}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Failed to delete project (${res.status})`);
  }
  return res.json().catch(() => ({}));
}



export async function commentProjectIdea(projectId, ideaId, comment) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/idea/${ideaId}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load idea (${res.status})`);
  }
  return res.json(); // { ideas: [...] }
}

export async function commentProjectIdeaMockup(projectId, ideaId, comment, mockup_content) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/idea/${ideaId}/mockup/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, mockup_content })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load idea (${res.status})`);
  }
  return res.json(); // { ideas: [...] }
}

export async function generateMockupProjectIdea(projectId, ideaId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/idea/${ideaId}/mockup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load idea (${res.status})`);
  }
  return res.json(); // { ideas: [...] }
}

export async function generateBriefProjectIdea(projectId, ideaId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/idea/${ideaId}/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load idea (${res.status})`);
  }
  return res.json(); // { ideas: [...] }
}



export async function selectProjectIdea(projectId, ideaId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/idea/${ideaId}/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load idea (${res.status})`);
  }
  return res.json(); // { ideas: [...] }
}

export async function unselectProjectIdea(projectId, ideaId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/idea/${ideaId}/unselect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load idea (${res.status})`);
  }
  return res.json(); // { ideas: [...] }
}

export async function updateProjectObjective(brandId, projectId, objective) {
  const res = await fetch(`${API_BASE}/api/brands/${brandId}/projects/${projectId}/objective`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objective })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update project objective (${res.status})`);
  }
  return res.json(); // { project: [...] }
}

export async function clarifyProjectObjective(brandId, projectId) {
  const res = await fetch(`${API_BASE}/api/brands/${brandId}/projects/${projectId}/objective/clarify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to clarify project objective (${res.status})`);
  }
  return res.json(); // { question: [...] }
}

export async function reviseProjectIdeas(brandId, projectId, objective, questions) {
  const res = await fetch(`${API_BASE}/api/brands/${brandId}/projects/${projectId}/ideas/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objective, questions })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to revise project ideas (${res.status})`);
  }
  return res.json(); // { question: [...] }
}


