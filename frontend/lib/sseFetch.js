
export async function ssePost(url, body, handlers) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  function emit(event, data) {
    const fn = handlers?.[event] || handlers?.message;
    if (fn) fn(data);
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE messages end with double newline
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";

    for (const chunk of parts) {
      let event = "message";
      let data = "";

      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim() + "\n";
      }
      data = data.trimEnd();
      if (data) emit(event, data);
    }
  }
}
