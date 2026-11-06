import { useCallback, useEffect, useRef, useState } from 'react';
import { WifiOff, Check } from 'lucide-react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { transcribeAudio, askQuestion, speak } from '../../services/voiceService';
import VoiceComposerCard from '../dashboard/VoiceComposerCard';
import TranscriptEditor from '../voice/TranscriptEditor';
import ConversationPanel from '../voice/ConversationPanel';

// Confirm accepted language codes with the backend. Hinglish is sent as a hint; TTS falls back to hi-IN.
const LANGS = [
  { code: 'hi-IN', label: 'हिंदी', chip: 'हिंदी · hi-IN' },
  { code: 'hi-EN', label: 'Hinglish', chip: 'Hinglish' },
];

let idSeq = 0;
const nid = () => `m${++idSeq}`;

export default function VoiceAssistantPage({ initialQuestion = "" }) {
  const [mode, setMode] = useState('voice'); // 'voice' | 'text'
  const [language, setLanguage] = useState('hi-IN');
  const [showSettings, setShowSettings] = useState(false);

  const [transcript, setTranscript] = useState(''); // editable STT result
  const [reviewing, setReviewing] = useState(false); // transcript panel visible
  const [transcribing, setTranscribing] = useState(false);
  const [sttError, setSttError] = useState(null);
  const [typed, setTyped] = useState(''); // text-mode input

  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [context, setContext] = useState({}); // last extracted context, sent back as known context

  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const lastBlobRef = useRef(null);
  const aliveRef = useRef(true);
  const [voiceInitialQuestion, setVoiceInitialQuestion] = useState("");
  useEffect(() => {
    if (initialQuestion) {
      setMode("text");
      setTyped(initialQuestion);
    }
  }, [initialQuestion]);
  useEffect(() => {
    aliveRef.current = true;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      aliveRef.current = false;
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const runTranscribe = useCallback(
    async (blob) => {
      lastBlobRef.current = blob;
      setSttError(null);
      setTranscribing(true);
      try {
        const res = await transcribeAudio(blob, language);
        if (!aliveRef.current) return;
        if (!res?.transcript?.trim()) {
          setSttError('Could not hear anything clear. Record again or switch to Text mode.');
          return;
        }
        setTranscript(res.transcript); // review first; never auto-sent
        setReviewing(true);
      } catch (e) {
        if (aliveRef.current) setSttError(`${e.message} You can switch to Text mode and type instead.`);
      } finally {
        if (aliveRef.current) setTranscribing(false);
      }
    },
    [language]
  );

  const recorder = useVoiceRecorder({ onComplete: runTranscribe });

  const send = useCallback(
    async (question) => {
      const q = question.trim();
      if (!q || asking) return;
      setMessages((m) => [...m, { id: nid(), role: 'user', text: q, at: Date.now() }]);
      setAsking(true);
      try {
        const data = await askQuestion({
          question: q,
          conversationId,
          language,
          location: context.location,
          crop: context.crop,
          growthStage: context.growth_stage,
        });
        if (!aliveRef.current) return;
        if (data.conversation_id) setConversationId(data.conversation_id);
        if (data.extracted_context) {
          const known = Object.fromEntries(Object.entries(data.extracted_context).filter(([, v]) => v));
          setContext((c) => ({ ...c, ...known }));
        }
        setMessages((m) => [...m, { id: nid(), role: 'assistant', data, at: Date.now() }]);
      } catch (e) {
        if (aliveRef.current)
          setMessages((m) => [
            ...m,
            { id: nid(), role: 'assistant', at: Date.now(), error: e.message, onRetry: () => send(q) },
          ]);
      } finally {
        if (aliveRef.current) setAsking(false);
      }
    },
    [asking, conversationId, language, context]
  );

  const sendTranscript = () => {
    const q = transcript;
    setTranscript('');
    setReviewing(false);
    recorder.reset();
    send(q);
  };

  const sendTyped = () => {
    const q = typed;
    setTyped('');
    send(q);
  };

  const loadAudio = useCallback(
    (text) => speak({ text, language: language === 'hi-EN' ? 'hi-IN' : language }),
    [language]
  );

  const startRecording = () => {
    setTranscript('');
    setReviewing(false);
    setSttError(null);
    recorder.start();
  };

  const onMicClick = () => {
    if (recorder.status === 'recording') recorder.stop();
    else startRecording();
  };

  const switchMode = (m) => {
    if (m === mode) return;
    setMode(m);
    setSttError(null);
    recorder.reset();
    if (m === 'text') setReviewing(false); // keep voice available when switching back
  };

  const cardStatus = transcribing ? 'processing' : recorder.status === 'recorded' ? 'idle' : recorder.status === 'error' ? 'idle' : recorder.status;
  const cardError = mode === 'voice' ? sttError || recorder.error?.message || null : null;
  const lang = LANGS.find((l) => l.code === language);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 text-[#0f1b3d] sm:px-8 sm:py-10">
      <header className="mb-8">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          Monsoon Intelligence · Voice
        </span>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
          Voice Assistant <span className="text-xl font-medium text-slate-500">/ आवाज सहायक</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          हिंदी या Hinglish में पूछें, मौसम और फसल की सलाह पाएं · Ask in Hindi or Hinglish for grounded weather and crop advice.
        </p>
      </header>

      {!online && (
        <div role="alert" className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <WifiOff size={16} /> You appear to be offline. Requests will fail until you reconnect.
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
        {/* Input column */}
        <div className="flex w-full flex-col gap-4 lg:w-[34rem] lg:shrink-0">
          <VoiceComposerCard
            mode={mode}
            onModeChange={switchMode}
            status={cardStatus}
            elapsed={recorder.elapsed}
            level={recorder.level}
            onMicClick={onMicClick}
            onSettingsClick={() => setShowSettings((v) => !v)}
            languageLabel={lang.chip}
            value={typed}
            onValueChange={setTyped}
            onSend={sendTyped}
            error={cardError}
            disabled={asking}
          />

          {showSettings && (
            <div className="w-full max-w-xl rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Language</span>
              <div role="group" aria-label="Language" className="mt-2 flex gap-2">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    aria-pressed={language === l.code}
                    onClick={() => setLanguage(l.code)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      language === l.code ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-[#0f1b3d]'
                    }`}
                  >
                    {language === l.code && <Check size={14} />} {l.label}
                  </button>
                ))}
              </div>
              {mode === 'text' && <p className="mt-3 text-xs text-slate-600">Text mode: no microphone or spoken audio is used.</p>}
            </div>
          )}

          {sttError && lastBlobRef.current && mode === 'voice' && (
            <button
              type="button"
              onClick={() => runTranscribe(lastBlobRef.current)}
              disabled={transcribing}
              className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
            >
              Retry transcription
            </button>
          )}

          {mode === 'voice' && reviewing && (
            <TranscriptEditor
              value={transcript}
              onChange={setTranscript}
              onSend={sendTranscript}
              onRerecord={startRecording}
              sending={asking}
            />
          )}
        </div>

        {/* Conversation column */}
        <div className="min-w-0 flex-1 basis-96">
          <ConversationPanel messages={messages} thinking={asking} audioEnabled={mode === 'voice'} loadAudio={loadAudio} />
        </div>
      </div>
    </div>
  );
}
