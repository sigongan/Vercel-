"use client";

import { useEffect, useState } from "react";
import { AvocadoMark } from "@/lib/avocadoMark";

/** The while-you-wait state for an extraction — shown by the Extract tab and
 *  by Home's one-tap shortcut, so both waits look like the same app. */
export function ExtractionProgress({ messages }: { messages: readonly string[] }) {
  return (
    <div className="flex flex-col items-center gap-4 py-14 animate-fade-in-up">
      <div className="animate-avocado-bounce">
        <AvocadoMark size={56} />
      </div>
      <LoadingMessages messages={messages} />
    </div>
  );
}

/** Cycles through the playful extraction-progress lines while loading. */
function LoadingMessages({ messages }: { messages: readonly string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <p key={index} className="animate-fade-in-up text-sm font-medium text-[#5D6551] dark:text-stone-400">
      {messages[index]}
    </p>
  );
}
