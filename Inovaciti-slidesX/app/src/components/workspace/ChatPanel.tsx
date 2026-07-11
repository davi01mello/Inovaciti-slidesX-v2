import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { presentationsStore } from '@/stores/presentationsStore';
import { AiClientError, sendChatMessage } from '@/services/aiClient';
import { cn } from '@/lib/cn';
import type { ChatMessage } from '@/types/chat';
import type { PresentationSize, VisualStyle } from '@/types/creation';
import type { Slide } from '@/types/slide';

interface ChatPanelProps {
  presentationId: string;
  messages: ChatMessage[];
  idea: string;
  size: PresentationSize;
  style: VisualStyle;
  slides: Slide[];
}

const SUGGESTIONS = [
  'Deixa mais direto',
  'Adiciona uma métrica',
  'Puxa outra abordagem',
];

export function ChatPanel({ presentationId, messages, idea, size, style, slides }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComposerFocused, setComposerFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  async function submit() {
    const text = input.trim();
    if (!text || isTyping) return;
    const history = messages;
    presentationsStore.appendChatMessage(presentationId, { author: 'user', text });
    setInput('');
    setIsTyping(true);
    try {
      const replyText = await sendChatMessage({ idea, size, style, slides, history, message: text });
      presentationsStore.appendChatMessage(presentationId, { author: 'ai', text: replyText });
    } catch (err) {
      const message = err instanceof AiClientError ? err.message : 'Deu erro ao responder. Tenta de novo.';
      presentationsStore.appendChatMessage(presentationId, { author: 'ai', text: message });
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const canSend = input.trim().length > 0 && !isTyping;

  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden border-r border-white/[0.04] bg-app-bg">
      {/* Ambient gradient — very subtle, gives the panel a distinct feel */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[240px] opacity-70"
        style={{
          background:
            'radial-gradient(80% 100% at 0% 0%, rgba(45,219,96,0.06), transparent 60%), radial-gradient(60% 60% at 100% 0%, rgba(122,242,165,0.04), transparent 65%)',
        }}
      />

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 pb-5 pt-8">
        <div className="flex flex-col gap-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
      </div>

      <div className="relative flex-none px-4 pb-4 pt-2">
        {/* Suggestion chips — quick prompts that seed the composer */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setInput((prev) => (prev.length > 0 ? prev + ' ' + s : s));
                textareaRef.current?.focus();
              }}
              className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-ink-secondary transition-colors duration-150 hover:border-brand/30 hover:bg-brand/[0.06] hover:text-brand"
            >
              {s}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border transition-all duration-200',
            isComposerFocused
              ? 'border-brand/40 bg-surface-2 shadow-[0_0_0_4px_rgba(45,219,96,0.08)]'
              : 'border-white/[0.06] bg-surface',
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            placeholder="Fala comigo. Quer que eu ajuste alguma coisa?"
            rows={1}
            className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14px] leading-[1.5] text-ink outline-none placeholder:text-ink-muted"
          />
          <div className="flex items-center justify-end px-2.5 pb-2.5 pt-1">
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-all duration-150',
                canSend
                  ? 'bg-brand text-[#0A1210] hover:bg-brand-hover'
                  : 'cursor-not-allowed bg-white/[0.05] text-ink-muted',
              )}
            >
              Enviar
              <Icon name="chevron-right" size={12} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAi = message.author === 'ai';
  return (
    <div className={cn('flex flex-col gap-1.5', isAi ? 'items-start' : 'items-end')}>
      {isAi && (
        <div className="mb-0.5 flex items-center gap-2 pl-1 text-[11px] font-medium text-ink-muted">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold"
            style={{ background: 'rgba(45,219,96,0.12)', color: 'var(--color-slide-hl)' }}
          >
            CS
          </span>
          CITi Slides
        </div>
      )}
      <div
        className={cn(
          'max-w-[92%] whitespace-pre-wrap px-4 py-3 text-[13.5px] leading-[1.6]',
          isAi
            ? 'rounded-2xl rounded-tl-md border border-white/[0.05] bg-gradient-to-br from-surface to-surface-2 text-ink shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]'
            : 'rounded-2xl rounded-tr-md bg-brand/[0.12] text-ink ring-1 ring-brand/20',
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2 pl-1 text-[11px] font-medium text-ink-muted">
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold"
          style={{ background: 'rgba(45,219,96,0.12)', color: 'var(--color-slide-hl)' }}
        >
          CS
        </span>
        CITi Slides
      </div>
      <div className="rounded-2xl rounded-tl-md border border-white/[0.05] bg-gradient-to-br from-surface to-surface-2 px-4 py-3">
        <div className="flex items-end gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand/60" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand/60 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand/60 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
