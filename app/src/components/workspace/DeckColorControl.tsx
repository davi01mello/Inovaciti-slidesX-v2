import { ToneBar } from '@/components/creation/ToneBar';
import { useLiveTone } from '@/hooks/useLiveTone';
import { presentationsStore } from '@/stores/presentationsStore';
import { accentFor, toneBandOf } from '@/services/tone';

/**
 * O CONTROLE DE COR DO DECK, no workspace.
 *
 * A barra de tom fica SEMPRE À VISTA, ao lado do palco: não é mais um botão que
 * esconde a barra atrás de um popover. Arrastar aqui troca as ARTES e o CROMO do
 * deck inteiro EM TEMPO REAL, sem tocar numa letra do texto: o próprio palco é o
 * preview, a decisão acontece na frente da pessoa.
 *
 * O tempo real vem do useLiveTone: o valor local move a barra a 60fps enquanto o
 * commit no store (debounced por frame) replaneja a arte do deck. Sem isso, cada
 * pixel do arrasto reescreveria o localStorage e a barra engasgaria.
 */
export function DeckColorControl({ presentationId, tone }: { presentationId: string; tone: number }) {
  const [liveTone, setLiveTone] = useLiveTone(tone, (next) =>
    presentationsStore.setTone(presentationId, next),
  );

  const band = toneBandOf(liveTone);
  const accent = accentFor(liveTone);

  return (
    <div
      className="flex items-center gap-2.5"
      title="Arraste e veja sua apresentação mudar"
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Cor</span>
      <div className="w-[160px]">
        <ToneBar
          value={liveTone}
          onChange={setLiveTone}
          compact
          showPreview={false}
          showLabels={false}
        />
      </div>
      <span className="min-w-[38px] text-[11.5px] font-semibold" style={{ color: accent }}>
        {band.label}
      </span>
    </div>
  );
}
