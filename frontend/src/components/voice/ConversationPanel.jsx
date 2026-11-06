import { useEffect, useRef } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import ChatMessage from './ChatMessage';

export default function ConversationPanel({ messages, thinking, audioEnabled, loadAudio }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  // Only the newest successful assistant reply loads/plays audio.
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !m.error);

  return (
    <section
      aria-live="polite"
      className="flex min-h-[360px] flex-col gap-4 rounded-[28px] border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur-xl"
    >
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Conversation</span>
      {messages.length === 0 && !thinking && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center text-slate-600">
          <MessageSquare size={22} />
          <p className="max-w-sm text-sm">
            Mic dabaakar ya likhkar poochhein, jaise: “Patna mein dhaan ki buwai ke liye baarish kaisi rahegi?”
          </p>
        </div>
      )}
      <div className="flex flex-col gap-5">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} audioEnabled={audioEnabled} loadAudio={loadAudio} isLatest={m === lastAssistant} />
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={14} className="animate-spin" /> Forecast aur salah dhoondh rahe hain…
          </div>
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
