import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { TransformBox } from '@/components/present/TransformBox';
import { useLayerSelection } from '@/components/present/useLayerSelection';
import { RichEditable } from '@/components/workspace/RichEditable';
import { isEmpty, renderRich, type RichText } from '@/lib/richText';
import type { BlockRect, TextBlock } from '@/types/slide';

/**
 * Camada de caixas de texto livres (estilo Canva) sobre o slide.
 *
 * Cada caixa é um TransformBox: arrasta pra mover, oito alças pra redimensionar
 * (cantos e lados), um clique seleciona, o segundo (ou duplo clique) entra na
 * edição do texto, Delete remove. Caixa recém-criada já nasce em edição.
 * Em leitura/export não há chrome nenhum — só o texto posicionado, com
 * data-export-text pra virar caixa de texto REAL no PPTX.
 */

interface FloatingTextLayerProps {
  blocks: TextBlock[];
  editable: boolean;
  onContentChange: (blockId: string, content: RichText) => void;
  onMove: (blockId: string, rect: BlockRect) => void;
  onDelete: (blockId: string) => void;
}

/** Tipografia de cada tipo de caixa — os mesmos tamanhos dos previews do dock. */
function specFor(kind: TextBlock['kind']): CSSProperties {
  switch (kind) {
    case 'title-1':
      return { fontSize: '3.4cqw', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.025em', color: 'rgba(247,247,247,0.98)' };
    case 'title-2':
    case 'title-3':
      return { fontSize: '2.5cqw', fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.02em', color: 'rgba(247,247,247,0.96)' };
    case 'subtitle':
      return { fontSize: '1.75cqw', fontWeight: 500, lineHeight: 1.45, color: 'rgba(247,247,247,0.82)' };
    default:
      return { fontSize: '1.5cqw', fontWeight: 400, lineHeight: 1.5, color: 'rgba(247,247,247,0.78)' };
  }
}

function placeholderFor(kind: TextBlock['kind']): string {
  if (kind === 'title-1' || kind === 'title-2' || kind === 'title-3') return 'Título';
  if (kind === 'subtitle') return 'Subtítulo';
  return 'Escreva aqui';
}

export function FloatingTextLayer({ blocks, editable, onContentChange, onMove, onDelete }: FloatingTextLayerProps) {
  const ids = useMemo(() => blocks.map((b) => b.id), [blocks]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useLayerSelection({
    kind: 'text',
    editable,
    ids,
    onDelete,
    // Em edição, Delete/Backspace é do texto — não pode apagar a caixa inteira.
    deleteDisabled: editingId !== null,
  });
  const knownIdsRef = useRef<Set<string> | null>(null);

  // Caixa recém-criada (vazia) já entra em edição: inseriu, digita. Na primeira
  // renderização nada é "novo" — só o que aparecer depois disso.
  useEffect(() => {
    if (!editable) return;
    const next = new Set(ids);
    const known = knownIdsRef.current;
    knownIdsRef.current = next;
    if (!known) return;
    const fresh = blocks.find((b) => !known.has(b.id) && isEmpty(b.content));
    if (fresh) {
      setSelectedId(fresh.id);
      setEditingId(fresh.id);
    }
  }, [blocks, ids, editable, setSelectedId]);

  // Sair da caixa (clique fora, outra caixa) encerra a edição junto com a seleção.
  useEffect(() => {
    if (editingId && editingId !== selectedId) setEditingId(null);
  }, [selectedId, editingId]);

  if (blocks.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {blocks.map((block) => {
        const editing = editingId === block.id;
        const placeholder = placeholderFor(block.kind);
        const textStyle: CSSProperties = {
          fontFamily: 'var(--font-slide)',
          ...specFor(block.kind),
          textAlign: block.align,
        };

        if (!editable) {
          if (isEmpty(block.content)) return null;
          return (
            <TransformBox
              key={block.id}
              kind="text"
              rect={block.rect}
              onChange={() => {}}
              interactive={false}
              selected={false}
              onSelect={() => {}}
              style={{ ...textStyle, height: 'auto', minHeight: `${block.rect.height * 100}%` }}
            >
              <div data-block-id={block.id} data-export-text="" style={{ textWrap: 'pretty' } as CSSProperties}>
                {renderRich(block.content)}
              </div>
            </TransformBox>
          );
        }

        return (
          <TransformBox
            key={block.id}
            kind="text"
            rect={block.rect}
            onChange={(rect) => onMove(block.id, rect)}
            interactive
            selected={selectedId === block.id}
            frozen={editing}
            onSelect={() => setSelectedId(block.id)}
            onActivate={() => setEditingId(block.id)}
            onDelete={() => {
              onDelete(block.id);
              setSelectedId(null);
            }}
            minWidth={0.08}
            minHeight={0.05}
            style={textStyle}
          >
            <div
              data-block-id={block.id}
              data-align={block.align}
              className="h-full w-full"
              onDoubleClick={() => setEditingId(block.id)}
            >
              {editing ? (
                <RichEditable
                  value={block.content}
                  onCommit={(next) => {
                    onContentChange(block.id, next);
                    setEditingId((id) => (id === block.id ? null : id));
                  }}
                  placeholder={placeholder}
                  multiline
                  autoFocus
                  ariaLabel={placeholder}
                  className="cursor-text"
                  style={{ textWrap: 'pretty' } as CSSProperties}
                />
              ) : (
                <div className="pointer-events-none" style={{ textWrap: 'pretty' } as CSSProperties}>
                  {isEmpty(block.content) ? (
                    <span style={{ color: 'rgba(255,255,255,0.28)' }}>{placeholder}</span>
                  ) : (
                    renderRich(block.content)
                  )}
                </div>
              )}
            </div>
          </TransformBox>
        );
      })}
    </div>
  );
}
