import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useUserProfile } from '@/stores/userStore';
import heroBlob from '@/assets/hero-blob.png';

const HOW_IT_WORKS = [
  { title: 'Conte sua ideia', description: 'Descreva o tema e objetivo da apresentação.' },
  { title: 'IA estrutura para você', description: 'Nossa IA cria a estrutura ideal de slides.' },
  { title: 'Você revisa e ajusta', description: 'Edite o conteúdo nos cards como preferir.' },
  { title: 'Design de alto nível', description: 'Geramos slides incríveis com identidade CITi.' },
];

export function Hero() {
  const navigate = useNavigate();
  const user = useUserProfile();
  const firstName = user.name.split(' ')[0];

  return (
    <section className="relative isolate grid min-h-[360px] grid-cols-[1fr_440px] items-center gap-8 overflow-hidden rounded-[20px] border border-white/5 bg-[#050608] p-11 pr-7">
      {/* Camada da imagem: a escultura 3D é o fundo do banner inteiro.
       * A bolha vive no centro da arte; ancorar o corte um pouco abaixo do centro
       * mantém a escultura sempre inteira, mesmo quando a sidebar recolhe e o banner
       * fica mais largo (o corte come só o preto de cima e de baixo, nunca a bolha). */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src={heroBlob}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-95"
          style={{ objectPosition: '50% 65%' }}
        />
      </div>

      {/* Dark overlay bem suave sobre a imagem toda: deixa o banner mais preto e premium. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(90deg, rgba(3,4,5,0.62) 0%, rgba(3,4,5,0.30) 42%, rgba(3,4,5,0.14) 100%)',
        }}
      />

      {/* Realce de leitura: uma sombra bem suave só atrás do título, o suficiente pra o
       * texto destacar da arte sem escurecer o banner. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[58%]"
        style={{
          background:
            'radial-gradient(110% 90% at 24% 44%, rgba(3,4,5,0.40) 0%, rgba(3,4,5,0.18) 50%, transparent 76%)',
        }}
      />

      {/* Scrim radial: escurece só o lado direito, onde vivem os 4 passos. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 top-0 z-[2] w-[54%]"
        style={{
          background:
            'radial-gradient(ellipse at 88% 50%, rgba(5,7,10,0.88) 0%, rgba(5,7,10,0.58) 34%, rgba(5,7,10,0.18) 64%, transparent 92%)',
        }}
      />

      {/* Vinheta: escurece as quatro bordas até quase preto, com queda suave pro centro,
       * mantendo a escultura visível no meio. Inset box-shadow abraça os cantos arredondados. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] rounded-[20px]"
        style={{ boxShadow: 'inset 0 0 100px 10px rgba(3,4,5,0.94)' }}
      />

      <div className="relative z-[3]">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[0.06] py-1.5 pl-3 pr-4 text-[12.5px] font-medium text-brand backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-glow rounded-full bg-brand shadow-[0_0_10px_rgba(45,219,96,0.7)]" />
          Bem-vindo de volta, {firstName}.
        </div>
        <h1 className="m-0 max-w-[560px] text-[44px] font-bold leading-[1.06] tracking-[-0.03em] text-balance">
          Vamos transformar ideias em apresentações{' '}
          <span className="bg-gradient-to-r from-brand to-brand-glow bg-clip-text text-transparent">
            extraordinárias.
          </span>
        </h1>
        <p className="my-[18px] whitespace-nowrap text-[15px] leading-[1.55] tracking-[-0.005em] text-ink-secondary">
          Você descreve a ideia e a gente faz a mágica acontecer.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/nova')}>
            <Icon name="plus" size={15} />
            Nova apresentação com IA
          </Button>
          <Button variant="ghost" onClick={() => navigate('/templates')}>
            Explorar templates
            <Icon name="chevron-right" size={12} />
          </Button>
        </div>
      </div>

      {/* Como Funciona: o bloco fica bem à direita. O empurrão fino pra direita vem de
       * duas alavancas: ml-[92px] dentro da coluna e a folga direita do banner reduzida
       * (pr-7), que desloca a coluna inteira mais pra direita sem cortar as descrições em
       * nowrap. O texto e o tracinho seguem alinhados à esquerda dentro do bloco. */}
      <div className="relative z-[3] ml-[92px] pl-[22px] text-left">
        <div
          aria-hidden="true"
          className="absolute bottom-1.5 left-0 top-1.5 w-px"
          style={{
            background:
              'linear-gradient(180deg, transparent, rgba(45,219,96,0.55) 20%, rgba(45,219,96,0.32) 80%, transparent)',
          }}
        />
        <div className="text-[13px] font-semibold tracking-[-0.005em] text-ink">Como Funciona</div>
        <ol className="m-0 mt-4 flex list-none flex-col gap-[18px] p-0">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-brand/25 bg-brand/[0.08] text-[12px] font-bold text-brand shadow-[0_0_16px_-6px_rgba(45,219,96,0.7)]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold tracking-[-0.005em] text-ink">{step.title}</div>
                <div className="mt-0.5 whitespace-nowrap text-[12px] leading-[1.5] text-ink-secondary">
                  {step.description}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
