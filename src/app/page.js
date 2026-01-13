"use client";

import { useEffect, useState } from "react";
import ChatWidget from "@/component/ChatWidget";

export default function Page() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Fallback (when opened directly without SDK)
    setSession({
      sessionId: crypto.randomUUID(),
      context: {},
    });

    // Listen for SDK -> iframe message
    const handler = (event) => {
      if (event.data?.type === "INIT_VET_CHAT") {
        setSession(event.data.payload);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (!session) return null;

  return <ChatWidget session={session} />;
}
