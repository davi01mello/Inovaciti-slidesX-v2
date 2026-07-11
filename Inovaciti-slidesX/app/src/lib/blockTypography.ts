import type { Block, BlockAlign } from '@/types/slide';

export const ALIGN_CLASS: Record<BlockAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

/** Typographic classes for each block kind, used both in the editor and the presentation renderer. */
export function typographyClassFor(kind: Block['kind']): string {
  switch (kind) {
    case 'title-1':
      return 'text-[52px] font-bold leading-[1.03] tracking-[-0.035em]';
    case 'title-2':
      return 'text-[32px] font-bold leading-[1.15] tracking-[-0.02em]';
    case 'title-3':
      return 'text-[22px] font-semibold leading-[1.25] tracking-[-0.01em]';
    case 'subtitle':
      return 'text-[16px] leading-[1.55] text-white/60';
    case 'body':
      return 'text-[15px] leading-[1.6] text-white/85';
    case 'section-label':
      return 'text-[11px] font-semibold uppercase tracking-[0.24em]';
    case 'highlight':
      return 'text-[22px] font-medium leading-[1.4] tracking-[-0.01em]';
    case 'bullets':
      return 'text-[17px] leading-[1.55]';
  }
}

/** Slightly different scale used inside slide thumbnails. */
export function thumbnailClassFor(kind: Block['kind']): string {
  switch (kind) {
    case 'title-1':
      return 'text-[10.5px] font-bold leading-[1.1]';
    case 'title-2':
      return 'text-[9.5px] font-semibold leading-[1.15]';
    case 'title-3':
      return 'text-[8.5px] font-semibold leading-[1.2]';
    case 'subtitle':
      return 'text-[7px] leading-[1.3] text-white/55';
    case 'body':
      return 'text-[7px] leading-[1.35] text-white/70';
    case 'section-label':
      return 'text-[6.5px] font-semibold uppercase tracking-widest';
    case 'highlight':
      return 'text-[8px] leading-[1.3]';
    case 'bullets':
      return 'text-[7px] leading-[1.3]';
  }
}

export function labelForKind(kind: Block['kind']): string {
  switch (kind) {
    case 'title-1':
      return 'T1';
    case 'title-2':
      return 'T2';
    case 'title-3':
      return 'T3';
    case 'subtitle':
      return 'Sub';
    case 'body':
      return 'Texto';
    case 'bullets':
      return 'Tópicos';
    case 'highlight':
      return 'Destaque';
    case 'section-label':
      return 'Rótulo';
  }
}
