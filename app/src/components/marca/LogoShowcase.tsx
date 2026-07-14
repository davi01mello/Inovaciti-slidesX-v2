/**
 * Vitrine de logos da marca: um único palco que troca a arte conforme a versão
 * (Tradicional ou 30 Anos) e a cor (Branco, Preto, Verde) que o usuário escolhe.
 *
 * Os arquivos são os PNGs oficiais com fundo transparente, exibidos exatamente como
 * são: nada de glow, corte ou fundo adicionado ao logo. A única coisa que muda atrás
 * dele é o palco, que alterna entre escuro (pro branco e o verde aparecerem) e claro
 * (pro preto aparecer) — sem isso o logo preto sumiria no fundo preto do app. O que o
 * usuário copia ou baixa é sempre o PNG transparente puro.
 */
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/cn';

import citiBranco from '@/assets/logo-citi-branco.png';
import citiPreto from '@/assets/logo-citi-preto.png';
import citiVerde from '@/assets/logo-citi-verde.png';
import citi30Branco from '@/assets/logo-citi30-branco.png';
import citi30Preto from '@/assets/logo-citi30-preto.png';
import citi30Verde from '@/assets/logo-citi30-verde.png';

type LogoVariant = 'tradicional' | 'aniversario';
type LogoColor = 'branco' | 'preto' | 'verde';

const SOURCES: Record<LogoVariant, Record<LogoColor, string>> = {
  tradicional: { branco: citiBranco, preto: citiPreto, verde: citiVerde },
  aniversario: { branco: citi30Branco, preto: citi30Preto, verde: citi30Verde },
};

const VARIANTS: { value: LogoVariant; label: string; hint: string }[] = [
  { value: 'tradicional', label: 'Tradicional', hint: 'O wordmark citi sozinho' },
  { value: 'aniversario', label: '+30 Anos', hint: 'Assinatura comemorativa' },
];

const COLORS: { value: LogoColor; label: string; swatch: string; ring: string }[] = [
  { value: 'branco', label: 'Branco', swatch: '#f7f7f7', ring: 'rgba(255,255,255,0.5)' },
  { value: 'preto', label: 'Preto', swatch: '#0a0a0a', ring: 'rgba(255,255,255,0.28)' },
  { value: 'verde', label: 'Verde', swatch: '#2ddb60', ring: 'rgba(45,219,96,0.6)' },
];

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
}

export function LogoShowcase() {
  const [variant, setVariant] = useState<LogoVariant>('tradicional');
  const [color, setColor] = useState<LogoColor>('verde');

  const src = SOURCES[variant][color];
  const fileName = `citi-${variant === 'aniversario' ? '30anos' : 'logo'}-${color}.png`;
  const lightStage = color === 'preto';

  return (
    <Card className="p-6 px-7">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="m-0 flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
          <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand/30" />
          Logos do CITi
        </h2>
        <span className="text-[11.5px] text-ink-muted">Escolha a versão e a cor, depois copie</span>
      </div>

      {/* Palco: fundo alterna escuro/claro pra cada cor de logo aparecer. O logo em si
       * é o PNG transparente exato, sem nenhuma alteração. */}
      <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.06]">
        {/* Fundo escuro (padrão, pro branco e verde). */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 120% at 50% 38%, #0d1216 0%, #050708 72%)' }}
        />
        {/* Fundo claro, entra suave quando a cor é preto. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: lightStage ? 1 : 0,
            background: 'radial-gradient(120% 120% at 50% 38%, #ffffff 0%, #e7ebef 100%)',
          }}
        />
        <img
          key={src}
          src={src}
          alt={`Logo CITi ${variant === 'aniversario' ? '30 Anos' : 'tradicional'} ${color}`}
          className="relative z-[1] h-[104px] w-auto max-w-[70%] animate-reveal object-contain"
        />

        <div className="absolute right-3 top-3 z-[2] flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void copyLogo(src)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold backdrop-blur-md transition-colors duration-150',
              lightStage
                ? 'border-black/10 bg-white/70 text-[#0a1210] hover:border-brand/50'
                : 'border-white/10 bg-white/[0.06] text-ink hover:border-brand/35 hover:text-brand',
            )}
          >
            <Icon name="paste" size={13} />
            Copiar
          </button>
          <button
            type="button"
            onClick={() => downloadLogo(src, fileName)}
            aria-label="Baixar logo"
            title="Baixar logo"
            className={cn(
              'flex h-[34px] w-[34px] items-center justify-center rounded-full border backdrop-blur-md transition-colors duration-150',
              lightStage
                ? 'border-black/10 bg-white/70 text-[#0a1210] hover:border-brand/50'
                : 'border-white/10 bg-white/[0.06] text-ink-secondary hover:border-brand/35 hover:text-brand',
            )}
          >
            <Icon name="import" size={14} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        {/* Versão: Tradicional ou 30 Anos. */}
        <div className="inline-flex rounded-full border border-white/[0.07] bg-white/[0.02] p-1">
          {VARIANTS.map((option) => {
            const active = variant === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setVariant(option.value)}
                title={option.hint}
                className={cn(
                  'rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all duration-200',
                  active
                    ? 'bg-gradient-to-b from-[#36E66A] to-brand text-[#07130b] shadow-[0_6px_16px_-8px_rgba(45,219,96,0.8)]'
                    : 'text-ink-secondary hover:text-ink',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Cor da arte. */}
        <div className="flex items-center gap-2">
          {COLORS.map((option) => {
            const active = color === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
                  active
                    ? 'border-brand/40 bg-brand/[0.08] text-ink'
                    : 'border-white/[0.07] bg-white/[0.02] text-ink-secondary hover:border-white/[0.16] hover:text-ink',
                )}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{
                    background: option.swatch,
                    boxShadow: active ? `0 0 0 2px ${option.ring}` : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                  }}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mb-0 mt-4 text-[11.5px] leading-[1.5] text-ink-muted">
        São os arquivos oficiais em PNG com fundo transparente. Copie ou baixe a versão que precisar e use
        do jeito que está.
      </p>
    </Card>
  );
}
