/**
 * Card de onboarding do rodapé da sidebar, logo acima do card de perfil.
 * O botão "Ver guia rápido" abre o tour imersivo (OnboardingTour) via
 * onboardingStore — é a porta de entrada do onboarding de verdade.
 *
 * Dimensões TRAVADAS em 200x220 (box-sizing border-box) e a imagem posicionada em
 * pixels absolutos (left:25.6px / width:280px / height:220px). Como o recorte do
 * object-fit:cover depende da proporção exata da caixa, fixar tudo em px garante que
 * a arte caia sempre no mesmo lugar, sem depender da largura do container.
 *
 * left:25.6 empurra a arte bem mais pra direita (o pedido do Bernardo); nesse ponto a
 * imagem original expõe sua própria borda cinza-esverdeada (vinheta do arquivo-fonte)
 * na quina esquerda. Em vez de aceitar isso, uma máscara sólida (mesma cor do fundo do
 * card, #050708) cobre exatamente essa faixa antes do scrim — o resultado é preto
 * puro ali, indistinguível do fundo do próprio card, então a arte parece deliberadamente
 * ancorada à direita, sem nenhum resquício de cinza.
 */
import { openOnboarding } from '@/stores/onboardingStore';
import onboardingBg from '@/assets/onboarding-bg.png';

export function OnboardingCard() {
  return (
    <div
      style={{
        position: 'relative',
        width: 200,
        height: 220,
        boxSizing: 'border-box',
        padding: '16px 14px 14px',
        borderRadius: 14,
        background: '#050708',
        border: '1px solid rgba(45,219,96,0.20)',
        overflow: 'hidden',
        boxShadow: '0 12px 32px -12px rgba(45,219,96,0.30)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Camada da imagem de fundo + scrim. */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <img
          src={onboardingBg}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 25.6,
            width: 280,
            height: 220,
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 1,
            display: 'block',
          }}
        />
        {/* Máscara da quina esquerda: neutraliza a vinheta cinza-esverdeada que o
         * deslocamento pra direita expõe, fundindo com o preto do card. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #050708 0px, #050708 54.6px, transparent 74.6px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(5,7,8,0.15) 0%, rgba(5,7,8,0.35) 45%, rgba(5,7,8,0.85) 82%, rgba(5,7,8,0.95) 100%)',
          }}
        />
      </div>

      {/* Título + subtítulo. */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', marginBottom: 4 }}>
          Novo por aqui?
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: '#C3CBD4',
            lineHeight: 1.5,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          Crie sua primeira apresentação
          <br />
          em dois minutos.
        </div>
      </div>

      {/* Botão glass verde: abre o guia rápido em tela cheia. */}
      <button type="button" onClick={openOnboarding} className="onboarding-cta">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              background: 'linear-gradient(180deg,#36E66A,#2DDB60)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(45,219,96,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
              flex: 'none',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="#0A1210" style={{ marginLeft: 1 }}>
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </span>
          Ver guia rápido
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2DDB60"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
