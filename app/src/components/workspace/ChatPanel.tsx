import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { CitiOrb } from '@/components/ui/CitiOrb';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { presentationsStore } from '@/stores/presentationsStore';
import { AiClientError, sendChatMessage } from '@/services/aiClient';
import { fileToChatAttachment, pickImageFiles, type ChatImageAttachment } from '@/lib/imageFile';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import type { ChatMessage } from '@/types/chat';
import type { PresentationGoal, VisualStyle } from '@/types/creation';
import type { Slide } from '@/types/slide';

interface ChatPanelProps {
  presentationId: string;
  messages: ChatMessage[];
  idea: string;
  goal: PresentationGoal;
  style: VisualStyle;
  slides: Slide[];
  /** Geração inicial em andamento — a orb pensa antes mesmo da primeira mensagem. */
  busy?: boolean;
}

const SUGGESTIONS = ['Deixa mais direto', 'Adiciona uma métrica', 'Puxa outra abordagem'];

/** Teto do schema da API: no máximo 4 imagens por mensagem. */
const MAX_ATTACHMENTS = 4;

/** O que a API recebe quando o usuário manda só imagem, sem texto (message é obrigatório lá). */
const IMAGE_ONLY_MESSAGE = '(anexei imagem como referência)';

export function ChatPanel({ presentationId, messages, idea, goal, style, slides, busy = false }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<ChatImageAttachment[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isComposerFocused, setComposerFocused] = useState(false);
  const [isDragging, setDragging] = useState(false);
  /** id da resposta que acabou de chegar NESTA sessão — só ela ganha o reveal palavra a palavra. */
  const [freshMessageId, setFreshMessageId] = useState<string | null>(null);
  const dragDepthRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showThinking = isTyping || busy;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, showThinking]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const images = pickImageFiles(files);
      if (files.length > 0 && images.length === 0) {
        pushToast('Só consigo receber imagens (JPEG, PNG ou WebP).');
        return;
      }
      const room = MAX_ATTACHMENTS - attachments.length;
      if (room <= 0) {
        pushToast(`Máximo de ${MAX_ATTACHMENTS} imagens por mensagem.`);
        return;
      }
      if (images.length > room) pushToast(`Anexei só ${room}, porque o limite é ${MAX_ATTACHMENTS} imagens por mensagem.`);
      setIsReadingFiles(true);
      try {
        const prepared = await Promise.all(images.slice(0, room).map(fileToChatAttachment));
        setAttachments((prev) => [...prev, ...prepared].slice(0, MAX_ATTACHMENTS));
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'Não consegui ler essa imagem.');
      } finally {
        setIsReadingFiles(false);
      }
    },
    [attachments.length],
  );

  async function submit() {
    const text = input.trim();
    if ((text.length === 0 && attachments.length === 0) || isTyping || busy) return;
    const history = messages;
    const outgoing = attachments;
    presentationsStore.appendChatMessage(presentationId, {
      author: 'user',
      text,
      ...(outgoing.length > 0
        ? { attachments: outgoing.map((a) => ({ name: a.name, thumb: a.thumbUrl })) }
        : {}),
    });
    setInput('');
    setAttachments([]);
    setIsTyping(true);
    try {
      const replyText = await sendChatMessage({
        idea,
        goal,
        style,
        slides,
        history,
        message: text.length > 0 ? text : IMAGE_ONLY_MESSAGE,
        attachments: outgoing.map((a) => ({ name: a.name, mimeType: a.mimeType, dataBase64: a.dataBase64 })),
      });
      const saved = presentationsStore.appendChatMessage(presentationId, { author: 'ai', text: replyText });
      setFreshMessageId(saved.id);
    } catch (err) {
      const message = err instanceof AiClientError ? err.message : 'Deu erro ao responder. Tenta de novo.';
      const saved = presentationsStore.appendChatMessage(presentationId, { author: 'ai', text: message });
      setFreshMessageId(saved.id);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length === 0) return;
    event.preventDefault();
    void addFiles(files);
  }

  function handleFilePick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void addFiles(files);
  }

  function handleDragEnter(event: DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isTyping && !busy && !isReadingFiles;

  return (
    <aside
      className="relative flex h-full min-h-0 flex-col overflow-hidden border-r border-white/[0.04] bg-app-bg"
      onDragEnter={handleDragEnter}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Luz ambiente do painel — verde da marca respirando no topo. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[260px] opacity-70"
        style={{
          background:
            'radial-gradient(80% 100% at 0% 0%, rgba(45,219,96,0.07), transparent 60%), radial-gradient(60% 60% at 100% 0%, rgba(122,242,165,0.04), transparent 65%)',
        }}
      />

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 pb-4 pt-7">
        <div className="flex flex-col gap-6">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} fresh={message.id === freshMessageId} />
          ))}
          {showThinking && <ThinkingRow />}
        </div>
      </div>

      <div className="relative flex-none px-4 pb-4 pt-1.5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setInput((prev) => (prev.length > 0 ? `${prev} ${s}` : s));
                textareaRef.current?.focus();
              }}
              className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-ink-muted transition-colors duration-150 hover:border-brand/30 hover:bg-brand/[0.06] hover:text-brand"
            >
              {s}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-[20px] border transition-all duration-200',
            isComposerFocused
              ? 'border-brand/40 bg-surface-2 shadow-[0_0_0_4px_rgba(45,219,96,0.08),0_18px_40px_-24px_rgba(0,0,0,0.8)]'
              : 'border-white/[0.07] bg-surface shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)]',
          )}
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachments.map((attachment, index) => (
                <AttachmentChip
                  key={`${attachment.name}-${index}`}
                  attachment={attachment}
                  onRemove={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                />
              ))}
              {isReadingFiles && (
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            placeholder="Peça qualquer ajuste, ou solte uma imagem aqui…"
            rows={1}
            className="block w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[14px] leading-[1.5] text-ink outline-none placeholder:text-ink-muted"
          />

          <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFilePick}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_ATTACHMENTS}
              title="Anexar imagem (ou arraste/cole aqui)"
              aria-label="Anexar imagem"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Icon name="attach" size={15} />
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSend}
              aria-label="Enviar mensagem"
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200',
                canSend
                  ? 'bg-gradient-to-b from-[#36E66A] to-brand text-[#0A1210] shadow-[0_6px_16px_-6px_rgba(45,219,96,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-px hover:shadow-[0_8px_20px_-6px_rgba(45,219,96,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-0'
                  : 'cursor-not-allowed bg-white/[0.05] text-ink-muted',
              )}
            >
              <Icon name="arrow-up" size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-2 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand/50 bg-[#040705]/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/[0.10] text-brand">
              <Icon name="file-image" size={22} />
            </div>
            <div className="text-[13.5px] font-semibold text-ink">Solte a imagem aqui</div>
            <div className="text-[12px] text-ink-muted">Ela vai junto com a sua próxima mensagem</div>
          </div>
        </div>
      )}
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Mensagens                                                                   */
/* -------------------------------------------------------------------------- */

/** Avatar da IA: a própria esfera do CITi Slides, pequena — sem selo, sem nome. */
function OrbAvatar({ thinking = false, entering = false }: { thinking?: boolean; entering?: boolean }) {
  return (
    <div className={cn('relative mt-[1px] h-[26px] w-[26px] flex-none', entering && 'animate-orb-pop')}>
      <CitiOrb size={26} active={thinking} glow={false} still={!thinking} />
      {entering && (
        <span className="pointer-events-none absolute inset-0 animate-orb-ping rounded-full border border-brand/60" />
      )}
      {thinking && (
        <span className="pointer-events-none absolute inset-[-5px] animate-breathe rounded-full bg-brand/20 blur-[7px]" />
      )}
    </div>
  );
}

function MessageRow({ message, fresh }: { message: ChatMessage; fresh: boolean }) {
  if (message.author === 'ai') {
    return (
      <div className="flex animate-message-in items-start gap-3">
        <OrbAvatar entering={fresh} />
        <div className="min-w-0 flex-1 whitespace-pre-wrap pt-[3px] text-[13.5px] leading-[1.65] text-ink">
          {fresh ? <RevealText text={message.text} /> : message.text}
        </div>
      </div>
    );
  }

  const attachments = message.attachments ?? [];
  return (
    <div className="flex animate-message-in flex-col items-end gap-1.5">
      <div className="max-w-[88%] overflow-hidden rounded-2xl rounded-br-md border border-brand/[0.22] bg-gradient-to-br from-brand/[0.13] to-brand/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {attachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-1.5 p-2', message.text.length > 0 && 'pb-0')}>
            {attachments.map((attachment, index) => (
              <img
                key={`${attachment.name}-${index}`}
                src={attachment.thumb}
                alt={attachment.name}
                title={attachment.name}
                className="h-[72px] w-[72px] rounded-lg border border-white/[0.08] object-cover"
              />
            ))}
          </div>
        )}
        {message.text.length > 0 && (
          <div className="whitespace-pre-wrap px-3.5 py-2.5 text-[13.5px] leading-[1.6] text-ink">{message.text}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Reveal progressivo do texto da IA: cada palavra se materializa em sequência.
 * Só a resposta recém-chegada passa por aqui — histórico renderiza direto.
 */
function RevealText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  let wordIndex = 0;
  return (
    <>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part) || part.length === 0) {
          // Espaços e quebras ficam fora dos spans — whitespace-pre-wrap preserva.
          return part;
        }
        const delay = Math.min(wordIndex * 26, 1100);
        wordIndex += 1;
        return (
          <span
            key={i}
            className="inline-block"
            style={{ animation: `word-in 360ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both` }}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

/**
 * A orb acelera e "Pensando" varre luz — o estado de espera é a própria marca viva.
 *
 * O texto é o degradê recortado nas letras (background-clip: text), com uma faixa
 * verde que corre de uma ponta à outra, como um radar passando no nome.
 *
 * ARMADILHA que já quebrou este efeito: um <span> INLINE fragmenta o fundo por linha,
 * e a animação de background-position não varre. Tem que ser inline-block. E o clip
 * precisa do prefixo -webkit-* explícito (mais o text-fill-color) pra funcionar em
 * todos os motores, senão o texto some (transparente sem recorte) e parece "não fazer nada".
 */
function ThinkingRow() {
  return (
    <div className="flex animate-message-in items-center gap-3">
      <OrbAvatar thinking />
      <span
        className="inline-block text-[13px] font-medium"
        style={{
          backgroundImage:
            'linear-gradient(100deg, #7c8794 0%, #7c8794 38%, #57f7a8 50%, #7c8794 62%, #7c8794 100%)',
          backgroundSize: '220% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          animation: 'thinking-sweep 1.5s linear infinite',
        }}
      >
        Pensando…
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Anexos no composer                                                          */
/* -------------------------------------------------------------------------- */

function AttachmentChip({ attachment, onRemove }: { attachment: ChatImageAttachment; onRemove: () => void }) {
  return (
    <div className="group relative h-[52px] w-[52px] animate-menu-in">
      <img
        src={attachment.previewUrl}
        alt={attachment.name}
        title={attachment.name}
        className="h-full w-full rounded-xl border border-white/[0.10] object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${attachment.name}`}
        className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/15 bg-surface-3 text-ink-secondary opacity-0 shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-opacity duration-150 hover:text-ink group-hover:opacity-100"
      >
        <Icon name="x" size={9} strokeWidth={2.6} />
      </button>
    </div>
  );
}
