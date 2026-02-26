"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatBox from "../../components/ChatBox";
import { useBrandStore } from "../../lib/store";
import { useAuthStore } from "../../lib/authStore";
import { postChat } from "../../lib/api";

export default function ChatPage() {
  const router = useRouter();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const activeBrand = useBrandStore((s) => s.activeBrand);

  useEffect(() => {
    if (!isAuthed) router.replace("/login");
    else if (!activeBrand) router.replace("/brands");
  }, [isAuthed, activeBrand, router]);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Tell me your marketing goal (e.g., grow followers, increase leads, launch a product) and I’ll help create content for this brand."
    }
  ]);
  const [loading, setLoading] = useState(false);

  async function onSend(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const data = await postChat({
        message: trimmed,
        brand: {
          name: activeBrand.name,
          logo_url: activeBrand.logo_url
        }
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${e.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthed || !activeBrand) return null;

  return (
    <div className="space-y-4">
      {/* Brand header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {activeBrand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeBrand.logo_url}
                alt={`${activeBrand.name} logo`}
                className="h-full w-full object-contain p-1"
                loading="lazy"
              />
            ) : (
              <div className="text-xs font-medium text-zinc-500">
                {initials(activeBrand.name)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-zinc-900">
              {activeBrand.name}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-600">
              Create marketing content for this brand — captions, ad copy, email
              campaigns, landing page text, and content ideas.
            </p>
          </div>
        </div>
      </div>

      {/* Chat */}
      <ChatBox messages={messages} onSend={onSend} loading={loading} />
    </div>
  );
}

function initials(name = "") {
  const s = name.trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}
