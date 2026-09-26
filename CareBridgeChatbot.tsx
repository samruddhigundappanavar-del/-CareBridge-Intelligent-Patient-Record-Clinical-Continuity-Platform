import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Loader2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, User } from '../firebase';
import { MedicalRecord } from '../types/records';
import { AudioRecorderButton } from './AudioRecorderButton';

export type GeminiChatModel =
  | 'gemini-3.8-flash'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.1-flash-lite';

export interface ChatbotPersona {
  id: string;
  name: string;
  subtitle: string;
  systemInstruction: string;
}

const CHATBOT_PERSONAS: ChatbotPersona[] = [
  {
    id: 'clinical-guide',
    name: 'Clinical Record Guide',
    subtitle: 'Comprehensive CareBridge record navigation & care continuity',
    systemInstruction:
      'You are the CareBridge Clinical Record Guide. Help the patient organize, cross-reference, and understand their uploaded prescriptions, lab reports, discharge summaries, medical reports, and certificates. Provide clear, structured summaries and practical questions they can ask their physician.',
  },
  {
    id: 'lab-interpreter',
    name: 'Lab & Biomarker Interpreter',
    subtitle: 'Explains blood panels, metabolic markers, and reference intervals',
    systemInstruction:
      'You are the CareBridge Lab & Biomarker Interpreter. Explain clinical blood panels, HbA1c, lipid profiles, complete blood counts, and diagnostic terminology in plain, accurate patient-friendly language while maintaining clinical rigor.',
  },
  {
    id: 'rx-educator',
    name: 'Medication & Rx Educator',
    subtitle: 'Dosing schedules, medication classes, and adherence guidance',
    systemInstruction:
      'You are the CareBridge Medication & Rx Educator. Help patients understand their uploaded prescriptions, dosing schedules, administration timing, and potential interactions to discuss with their pharmacist or prescribing doctor.',
  },
];

const MODEL_OPTIONS: Array<{
  id: GeminiChatModel;
  label: string;
  description: string;
}> = [
  {
    id: 'gemini-3.8-flash',
    label: 'Standard Clinical Review',
    description: 'Balanced medical reasoning and clear explanations',
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Deep Multi-Record Synthesis',
    description: 'Cross-references multiple lab panels & prescriptions',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Quick Terminology Lookup',
    description: 'Fast plain-language definitions',
  },
];

interface StoredChatMessage {
  id: string;
  ownerId: string;
  role: 'user' | 'model';
  text: string;
  modelUsed: string;
  assistantPersona: string;
  createdAt?: unknown;
}

export interface CareBridgeChatbotProps {
  user: User | null;
  records: MedicalRecord[];
}

export const CareBridgeChatbot: React.FC<CareBridgeChatbotProps> = ({
  user,
  records,
}) => {
  const [selectedModel, setSelectedModel] = useState<GeminiChatModel>('gemini-3.8-flash');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(CHATBOT_PERSONAS[0].id);
  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);

  const activePersona =
    CHATBOT_PERSONAS.find((p) => p.id === selectedPersonaId) || CHATBOT_PERSONAS[0];

  // Subscribe to Firestore chatMessages for authenticated user
  useEffect(() => {
    if (!user) {
      setMessages([
        {
          id: 'welcome-local',
          ownerId: 'guest',
          role: 'model',
          text: 'Hello! I am your CareBridge Clinical Assistant. Ask me anything about your uploaded prescriptions, blood/lab reports, discharge summaries, or medical certificates.',
          modelUsed: 'gemini-3.8-flash',
          assistantPersona: CHATBOT_PERSONAS[0].name,
        },
      ]);
      return;
    }

    const q = query(
      collection(db, 'chatMessages'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: StoredChatMessage[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: data.ownerId,
            role: data.role,
            text: data.text,
            modelUsed: data.modelUsed,
            assistantPersona: data.assistantPersona,
            createdAt: data.createdAt,
          };
        });
        setMessages(fetched);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'chatMessages');
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const persistChatMessage = async (
    role: 'user' | 'model',
    text: string,
    modelUsed: string,
    personaName: string
  ) => {
    if (!user) return;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const path = `chatMessages/${messageId}`;
    try {
      await setDoc(doc(db, 'chatMessages', messageId), {
        ownerId: user.uid,
        role,
        text: text.slice(0, 15500),
        modelUsed,
        assistantPersona: personaName,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? inputText).trim();
    if (!textToSend || isSending) return;

    setInputText('');
    setError(null);
    setIsSending(true);

    const userMsg: StoredChatMessage = {
      id: `local_u_${Date.now()}`,
      ownerId: user?.uid || 'guest',
      role: 'user',
      text: textToSend,
      modelUsed: selectedModel,
      assistantPersona: activePersona.name,
    };

    const updatedHistory = [...messages, userMsg];
    if (!user) {
      setMessages(updatedHistory);
    } else {
      await persistChatMessage('user', textToSend, selectedModel, activePersona.name);
    }

    try {
      const recordsContext = records
        .slice(0, 10)
        .map(
          (r) =>
            `- [${r.category}] ${r.title} (${r.fileName}, ${r.uploadedAt}, Provider: ${r.provider}): ${
              r.notes || 'No notes'
            }`
        )
        .join('\n');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          systemInstruction: activePersona.systemInstruction,
          assistantPersona: activePersona.name,
          recordsContext,
          messages: updatedHistory.map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate response.');
      }

      const replyText = data.text || 'No response received.';
      const actualModelUsed = data.modelUsed || selectedModel;

      if (!user) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local_m_${Date.now()}`,
            ownerId: 'guest',
            role: 'model',
            text: replyText,
            modelUsed: actualModelUsed,
            assistantPersona: activePersona.name,
          },
        ]);
      } else {
        await persistChatMessage('model', replyText, actualModelUsed, activePersona.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat error.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user) {
      setMessages([]);
      return;
    }
    try {
      for (const msg of messages) {
        if (!msg.id.startsWith('welcome-') && !msg.id.startsWith('local_')) {
          await deleteDoc(doc(db, 'chatMessages', msg.id));
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'chatMessages');
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
      <div className="h-1 w-full bg-gradient-to-r from-teal-600 via-teal-500 to-sky-600" />

      {/* Chatbot Header & Controls */}
      <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-1">
              <span>Multi-Turn Clinical Assistant</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">
                {user ? 'Synced to Firestore' : 'Session Mode'}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              CareBridge Gemini Health Advisor
            </h2>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Thread</span>
            </button>
          )}
        </div>

        {/* Persona Selector & Model Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Specialist Focus
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CHATBOT_PERSONAS.map((persona) => {
                const active = persona.id === selectedPersonaId;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setSelectedPersonaId(persona.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    {persona.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="gemini-model-select"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Response Depth
            </label>
            <select
              id="gemini-model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GeminiChatModel)}
              className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-teal-600"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable Conversation Thread */}
      <div className="h-[380px] overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageSquare className="w-6 h-6 text-teal-600 mb-2" />
            <p className="text-sm font-semibold text-slate-900">
              Start a conversation with {activePersona.name}
            </p>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              {activePersona.subtitle}. You can type a question below or dictate with your microphone.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                'Summarize my uploaded CareBridge records and key dates',
                'What questions should I ask my doctor about my lipid panel and Atorvastatin?',
                'Explain what a discharge summary includes for follow-up care',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1.5 text-xs text-teal-700 bg-white border border-slate-200/90 hover:border-teal-400 rounded-lg transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                <span>{msg.role === 'user' ? 'You' : msg.assistantPersona}</span>
              </div>
              <div
                className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span>{activePersona.name} is reviewing your clinical records...</span>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {error && (
        <div className="px-6 py-2.5 bg-red-50 border-t border-red-200 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input & Microphone Dictation Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask ${activePersona.name} about your medical records...`}
          className="flex-1 px-4 py-2.5 text-sm bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 transition-all"
        />

        <div className="flex items-center gap-2 justify-end">
          <AudioRecorderButton
            label="Voice input"
            onTranscriptionComplete={(transcript) => {
              setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
            }}
          />

          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </section>
  );
};
