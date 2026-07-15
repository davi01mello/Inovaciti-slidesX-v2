import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useDictation } from '@/hooks/useDictation';
import { cn } from '@/lib/cn';

interface MicButtonProps {
  /** Chamado com o texto transcrito quando a gravação termina com sucesso. */
  onTranscribed: (text: string) => void;
  /** 'icon': círculo compacto (composer de chat). 'pill': botão com rótulo, no
   * estilo do "Importar do Notion" (passo da ideia). */
  variant?: 'icon' | 'pill';
  className?: string;
  size?: number;
  title?: string;
}

const IDLE_LABEL_BY_VARIANT: Record<NonNullable<MicButtonProps['variant']>, string> = {
  icon: 'Ditar por voz',
  pill: 'Ditar por voz',
};

/**
 * Botão de ditado por voz, autocontido: clique começa a gravar, clique de novo
 * para, transcreve (Whisper via api/src/routes/transcribe.ts) e entrega o texto
 * pronto pelo `onTranscribed`. Quem usa não lida com MediaRecorder nem permissão
 * de microfone -- só recebe o texto no fim.
 *
 * `danger` (não `brand`) no estado gravando: é o mesmo vermelho que a Lixeira já
 * usa pra "atenção, ação em andamento" -- gravando é um estado que precisa ficar
 * óbvio à distância, diferente de um hover comum.
 */
export function MicButton({ onTranscribed, variant = 'icon', className, size = 15, title }: MicButtonProps) {
  const { status, start, stop } = useDictation(onTranscribed);

  function handleClick() {
    if (status === 'idle') start();
    else if (status === 'recording') stop();
  }

  const label = status === 'recording' ? 'Parar gravação e transcrever' : IDLE_LABEL_BY_VARIANT[variant];
  const recording = status === 'recording';
  const processing = status === 'processing';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={processing}
        aria-pressed={recording}
        aria-label={title ?? label}
        title={title ?? label}
        className={cn(
          'relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150',
          recording
            ? 'border-danger/35 bg-danger-soft text-danger'
            : 'border-white/[0.08] bg-surface text-ink-secondary hover:border-brand/35 hover:bg-brand/[0.06] hover:text-ink',
          processing && 'cursor-wait opacity-70',
          className,
        )}
      >
        {processing ? <Spinner size="sm" /> : <Icon name="mic" size={12} className={recording ? undefined : 'text-brand'} />}
        {recording ? 'Parar e transcrever…' : processing ? 'Transcrevendo…' : 'Ditar por voz'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={processing}
      aria-pressed={recording}
      aria-label={title ?? label}
      title={title ?? label}
      className={cn(
        'relative inline-flex flex-none items-center justify-center rounded-full transition-all duration-150',
        recording ? 'bg-danger-soft text-danger' : 'text-ink-muted hover:bg-white/[0.06] hover:text-ink',
        processing && 'cursor-wait opacity-70',
        className,
      )}
    >
      {processing ? <Spinner size="sm" /> : <Icon name="mic" size={size} />}
      {recording && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-breathe rounded-full bg-danger/25" />
      )}
    </button>
  );
}
