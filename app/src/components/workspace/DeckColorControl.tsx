import { ToneBar } from '@/components/creation/ToneBar';
import { useLiveTone } from '@/hooks/useLiveTone';
import { presentationsStore } from '@/stores/presentationsStore';

/**
 * O CONTROLE DE COR DO DECK, no workspace.
 *
 * A barra de tom fica SEMPRE À VISTA, ao lado do palco — não é mais um botão que a
 * esconde atrás de um popover. No modo compacto ela é autocontida: amostra + nome da
 * cor à esquerda, trilho e agulha à direita. O nome nunca é coberto pela agulha.
 * Arrastar troca as ARTES e o CROMO do deck inteiro EM TEMPO REAL, sem tocar numa
 * letra do texto: o próprio palco é o preview.
 *
 * O tempo real vem do useLiveTone: o valor local move a barra a 60fps enquanto o
 * commit no store (debounced por frame) replaneja a arte do deck.
 */
export function DeckColorControl({ presentationId, tone }: { presentationId: string; tone: number }) {
  const [liveTone, setLiveTone] = useLiveTone(tone, (next) =>
    presentationsStore.setTone(presentationId, next),
  );

  return (
    <div className="w-[210px]" title="Arraste e veja sua apresentação mudar">
      <ToneBar value={liveTone} onChange={setLiveTone} compact showPreview={false} />
    </div>
  );
}
