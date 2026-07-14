import { useEffect, useState } from 'react';
import type { TransformKind } from '@/components/present/TransformBox';

/**
 * Seleção de uma camada livre do slide (caixas de texto, elementos).
 *
 * Cuida das três formas de perder a seleção, iguais pras duas camadas:
 * - clicar no palco fora de uma caixa DESTA camada (inclusive numa caixa de
 *   outra camada — selecionar um elemento tira a seleção do texto);
 * - Delete/Backspace, que remove a caixa selecionada;
 * - a caixa deixar de existir (undo, remoção pela toolbar).
 *
 * Cliques FORA do palco (toolbar de formatação, dock, header) não mexem em nada —
 * senão clicar em "negrito" derrubaria a própria seleção que se quer formatar.
 */
export function useLayerSelection(params: {
  kind: TransformKind;
  editable: boolean;
  ids: string[];
  onDelete: (id: string) => void;
  /** Trava o Delete (ex.: caixa de texto em edição — a tecla é do texto, não da caixa). */
  deleteDisabled?: boolean;
}): [string | null, (id: string | null) => void] {
  const { kind, editable, ids, onDelete, deleteDisabled = false } = params;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const idsKey = ids.join(',');

  useEffect(() => {
    if (!editable) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-slide-stage]')) return;
      if (target.closest(`[data-transform-box="${kind}"]`)) return;
      setSelectedId(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [editable, kind]);

  useEffect(() => {
    if (!editable || !selectedId || deleteDisabled) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      if (selectedId) onDelete(selectedId);
      setSelectedId(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editable, selectedId, deleteDisabled, onDelete]);

  useEffect(() => {
    if (selectedId && !ids.includes(selectedId)) setSelectedId(null);
    // idsKey evita re-rodar a cada render (o array `ids` é novo toda vez).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, selectedId]);

  return [selectedId, setSelectedId];
}
