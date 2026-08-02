import { useMemo } from 'react';
import { TransformBox } from '@/components/present/TransformBox';
import { useLayerSelection } from '@/components/present/useLayerSelection';
import { elementByKey } from '@/services/elementsManifest';
import { iconByKey } from '@/services/iconsManifest';
import { companyLogoByKey } from '@/services/companyLogosManifest';
import type { BlockRect, Decoration } from '@/types/slide';

/**
 * Camada de imagens soltas sobre o slide (elementos 3D da marca e uploads do
 * usuário — ver types/slide.ts Decoration).
 *
 * Em leitura, só as imagens. Em edição, cada uma vira um TransformBox: arrasta
 * pra mover, oito alças pra redimensionar (cantos preservam a proporção da arte,
 * lados esticam livre) e Delete remove a selecionada.
 */

interface DecorationsLayerProps {
  decorations: Decoration[];
  editable: boolean;
  onMove: (id: string, rect: BlockRect) => void;
  onDelete: (id: string) => void;
}

export function DecorationsLayer({ decorations, editable, onMove, onDelete }: DecorationsLayerProps) {
  const ids = useMemo(() => decorations.map((d) => d.id), [decorations]);
  const [selectedId, setSelectedId] = useLayerSelection({ kind: 'decoration', editable, ids, onDelete });

  if (decorations.length === 0) return null;

  return (
    // pointer-events-none: a camada cobre o slide inteiro, então só as caixas
    // capturam o ponteiro — os textos do template abaixo continuam clicáveis.
    <div className="pointer-events-none absolute inset-0">
      {decorations.map((decoration) => {
        // Três famílias visuais no mesmo assetKey namespace: blob ("cor/forma"),
        // ícone ("categoria/nome") e logo de empresa ("cases|alumni|parceiros/slug")
        // não colidem, então tenta as três sem prefixo.
        const src =
          decoration.src ??
          elementByKey(decoration.assetKey)?.src ??
          iconByKey(decoration.assetKey)?.src ??
          companyLogoByKey(decoration.assetKey)?.src;
        if (!src) return null;
        return (
          <TransformBox
            key={decoration.id}
            kind="decoration"
            rect={decoration.rect}
            onChange={(rect) => onMove(decoration.id, rect)}
            interactive={editable}
            selected={selectedId === decoration.id}
            onSelect={() => setSelectedId(decoration.id)}
            onDelete={() => {
              onDelete(decoration.id);
              setSelectedId(null);
            }}
            lockAspectOnCorners
            style={decoration.rotation ? { transform: `rotate(${decoration.rotation}deg)` } : undefined}
          >
            <img
              src={src}
              alt=""
              draggable={false}
              // data-export-decoration: marca essa arte pro export (ver
              // lib/slideRaster.tsx). Ela some do PNG de fundo — vira imagem
              // própria e editável no PPTX, com posição/rotação vindas
              // diretamente de decoration.rect/.rotation (não do DOM).
              data-export-decoration=""
              // object-fill: a arte ocupa exatamente o rect — é o que faz esticar
              // um lado ter efeito visível. Os cantos preservam a proporção, então
              // o gesto padrão nunca distorce.
              className="h-full w-full select-none object-fill"
            />
          </TransformBox>
        );
      })}
    </div>
  );
}
