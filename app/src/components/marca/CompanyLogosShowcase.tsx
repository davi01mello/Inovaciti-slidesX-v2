/**
 * Vitrine dos logos de empresas ligadas ao CITi: Cases (quem já confiou),
 * Alumni (onde os ex-membros estão) e Parceiros. Mesma lógica das vitrines de
 * ícones/elementos — escolhe a categoria, vê a grade, copia ou baixa. Só
 * exibição; o picker de inserir no slide vive no InsertDock do workspace
 * (aba "Marca" > "Logos de Empresas").
 *
 * Fundo escuro nos cartões, igual às outras vitrines: os logos vêm com fundo
 * transparente (recortados das artes oficiais), então lê bem no escuro.
 */
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { pushToast } from '@/lib/toast';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/cn';
import {
  COMPANY_LOGOS,
  COMPANY_LOGO_CATEGORIES,
  companyLogoCategoryLabel,
  companyLogoNameLabel,
  hasCompanyLogos,
} from '@/services/companyLogosManifest';

async function copyLogo(src: string) {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('no clipboard');
    const blob = await (await fetch(src)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('encode failed');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    pushToast('Logo copiado. Cole onde quiser.');
    playSound('assetSaved');
  } catch {
    pushToast('Não consegui copiar aqui. Use o botão de baixar.');
  }
}

function downloadLogo(src: string, name: string) {
  const link = document.createElement('a');
  link.href = src;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  playSound('assetSaved');
}

export function CompanyLogosShowcase() {
  const categories = COMPANY_LOGO_CATEGORIES;
  const [category, setCategory] = useState(categories[0] ?? '');

  if (!hasCompanyLogos() || categories.length === 0) return null;

  const items = COMPANY_LOGOS.filter((i) => i.category === category);

  return (
    <Card className="p-6 px-7">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="m-0 flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
          <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand/30" />
          Logos de Empresas
        </h2>
        <span className="text-[11.5px] text-ink-muted">Escolha a categoria, depois copie ou baixe</span>
      </div>

      {/* Categoria: Cases, Alumni ou Parceiros. */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((option) => {
          const active = category === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
                active
                  ? 'border-brand/40 bg-brand/[0.08] text-ink'
                  : 'border-white/[0.07] bg-white/[0.02] text-ink-secondary hover:border-white/[0.16] hover:text-ink',
              )}
            >
              {companyLogoCategoryLabel(option)}
            </button>
          );
        })}
      </div>

      {/* Grade dos logos na categoria escolhida. */}
      <div className="mt-5 grid grid-cols-4 gap-3">
        {items.map((item) => {
          const fileName = `citi-logo-${item.key.replace(/\//g, '-')}.png`;
          return (
            <div
              key={item.key}
              className="group relative flex h-[140px] flex-col overflow-hidden rounded-2xl border border-white/[0.06]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'radial-gradient(120% 120% at 50% 38%, #0d1216 0%, #050708 72%)' }}
              />
              <img
                src={item.src}
                alt={companyLogoNameLabel(item.name)}
                className="relative z-[1] m-auto h-[74px] w-auto max-w-[70%] object-contain"
              />
              <div className="relative z-[1] px-3 pb-2.5 text-[11px] font-medium text-ink-secondary">
                {companyLogoNameLabel(item.name)}
              </div>

              <div className="absolute right-2 top-2 z-[2] flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => void copyLogo(item.src)}
                  aria-label="Copiar logo"
                  title="Copiar"
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-ink-secondary backdrop-blur-md transition-colors duration-150 hover:border-brand/35 hover:text-brand"
                >
                  <Icon name="paste" size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => downloadLogo(item.src, fileName)}
                  aria-label="Baixar logo"
                  title="Baixar"
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-ink-secondary backdrop-blur-md transition-colors duration-150 hover:border-brand/35 hover:text-brand"
                >
                  <Icon name="import" size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mb-0 mt-4 text-[11.5px] leading-[1.5] text-ink-muted">
        Os mesmos logos que você insere solto num slide pelo editor (aba Marca), aqui só pra visualizar,
        copiar ou baixar em PNG.
      </p>
    </Card>
  );
}
