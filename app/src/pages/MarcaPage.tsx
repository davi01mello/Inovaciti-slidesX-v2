/**
 * Central da marca CITi dentro do gerador: as cores, os logos, a tipografia e as regras
 * que o sistema de geração aplica nos slides. Tudo interativo de verdade
 * (clicou numa cor, hex copiado) e honesto (as regras são as mesmas do prompt mestre).
 */
import { Card } from '@/components/ui/Card';
import { LogoShowcase } from '@/components/marca/LogoShowcase';
import { pushToast } from '@/lib/toast';
import heroBlob from '@/assets/marca-banner.jpg';

interface BrandColor {
  name: string;
  hex: string;
  role: string;
  text?: string;
  feature?: boolean;
}

const PALETTE: BrandColor[] = [
  { name: 'Verde CITi', hex: '#2DDB60', role: 'A cor principal do CITi', text: '#0A1210', feature: true },
  { name: 'Verde Slide', hex: '#10E06B', role: 'Acento nos slides', text: '#0A1210' },
  { name: 'Verde Glow', hex: '#7AF2A5', role: 'Brilhos e gradientes', text: '#0A1210' },
  { name: 'Preto Profundo', hex: '#050607', role: 'Fundo dos slides' },
  { name: 'Branco Primário', hex: '#F5F7FA', role: 'Títulos e texto', text: '#0A1210' },
  { name: 'Cinza Secundário', hex: '#AEB6BF', role: 'Texto de apoio', text: '#0A1210' },
  { name: 'Cinza Mudo', hex: '#7E8791', role: 'Legendas e rótulos', text: '#0A1210' },
];

const RULES: { title: string; body: string }[] = [
  {
    title: 'O verde é acento',
    body: 'Ele aparece em pouca coisa, uma palavra do título ou um número, nunca no slide todo.',
  },
  {
    title: 'O vazio é premium',
    body: 'Cada slide respira com um terço livre, e quando fica cheio a gente tira ou reduz o texto.',
  },
  {
    title: 'A escultura recua',
    body: 'O chrome líquido toca uma borda só e, se chega perto do texto, ele mesmo diminui.',
  },
  {
    title: 'A capa é o show',
    body: 'Aqui vale ir grande, tipografia enorme e logo em destaque, enquanto o miolo fica contido.',
  },
];

async function copyHex(color: BrandColor) {
  try {
    await navigator.clipboard.writeText(color.hex);
    pushToast(`${color.hex} copiado.`);
  } catch {
    pushToast('Não consegui acessar a área de transferência.');
  }
}

export function MarcaPage() {
  return (
    <>
      {/* Cabeçalho com a escultura da casa como fundo, a bolha assentada à direita. */}
      <section className="relative isolate overflow-hidden rounded-[20px] border border-white/5 bg-[#050608] p-10">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src={heroBlob}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-95"
            style={{ objectPosition: '100% 50%' }}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[70%]"
          style={{
            background: 'linear-gradient(90deg, rgba(5,7,10,0.92) 0%, rgba(5,7,10,0.6) 55%, transparent 100%)',
          }}
        />
        <div className="relative z-[2] max-w-[540px]">
          <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em] text-ink">
            Sobre a Marca{' '}
            <span className="bg-gradient-to-r from-brand to-brand-glow bg-clip-text text-transparent">CITi</span>
          </h1>
          <p
            className="mt-2.5 text-[14.5px] leading-[1.65] text-ink-secondary"
            style={{ textAlign: 'justify', textAlignLast: 'justify', textWrap: 'balance' }}
          >
            A identidade visual que dá voz ao CITi, reunindo as cores, os logos e os princípios que mantêm a
            marca inconfundível em tudo que a gente cria.
          </p>
        </div>
      </section>

      {/* Paleta: clique copia o hex. */}
      <Card className="p-6 px-7">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="m-0 flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
            <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand/30" />
            Cores do CITi
          </h2>
          <span className="text-[11.5px] text-ink-muted">Clique pra copiar o hex</span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {PALETTE.map((color) => (
            <button
              key={color.hex}
              type="button"
              onClick={() => void copyHex(color)}
              className={`group overflow-hidden rounded-2xl border border-white/[0.07] text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.16]${
                color.feature ? ' col-span-2' : ''
              }`}
            >
              <div className="flex h-[76px] items-end p-3" style={{ background: color.hex }}>
                <span
                  className="font-mono text-[11px] font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ color: color.text ?? '#F5F7FA' }}
                >
                  Copiar {color.hex}
                </span>
              </div>
              <div className="bg-surface-2 px-3.5 py-3">
                <div className="text-[12.5px] font-semibold text-ink">{color.name}</div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-muted">{color.hex}</span>
                </div>
                <div className="mt-1 text-[11px] leading-[1.4] text-ink-muted">{color.role}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Logos: vitrine interativa com as versões e cores. */}
      <LogoShowcase />

      {/* Tipografia dos slides. */}
      <Card className="p-6 px-7">
        <h2 className="m-0 flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
          <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand/30" />
          Tipografia do CITi
        </h2>
        <p
          className="mt-2 max-w-[560px] text-[12.5px] leading-[1.65] text-ink-muted"
          style={{ textAlign: 'justify', textAlignLast: 'justify', textWrap: 'balance' }}
        >
          A tipografia dos decks é a <b className="text-ink-secondary">Neue Haas Grotesk Display</b>, de traços
          limpos e geométricos. A geração de slides segue essa família, e a interface usa Inter, da mesma linhagem.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-4 rounded-2xl border border-white/[0.05] bg-[#050607] p-6">
          <div className="col-span-3 sm:col-span-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Display · capa</div>
            <div className="mt-1.5 text-[34px] font-bold leading-[1.02] tracking-[-0.03em] text-slide-fg">
              Play no <span className="text-slide-hl">futuro</span>
            </div>
          </div>
          <div className="col-span-3 sm:col-span-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Título · conteúdo</div>
            <div className="mt-1.5 text-[21px] font-semibold leading-[1.15] tracking-[-0.02em] text-slide-fg">
              O problema que mapeamos
            </div>
          </div>
          <div className="col-span-3 sm:col-span-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Apoio</div>
            <div className="mt-1.5 text-[13px] leading-[1.55] text-[#AEB6BF]">
              Texto secundário curto, cinza, com muito ar ao redor. Nunca parágrafos longos.
            </div>
          </div>
        </div>
      </Card>

      {/* Regras que a geração aplica. */}
      <Card className="p-6 px-7">
        <h2 className="m-0 flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
          <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand/30" />
          Regras da Geração
        </h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          {RULES.map((rule) => (
            <div key={rule.title} className="glass rounded-2xl p-4">
              <div className="text-[13px] font-semibold leading-[1.3] text-ink">{rule.title}</div>
              <p className="mb-0 mt-2 text-[12px] leading-[1.55] text-ink-muted">{rule.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
