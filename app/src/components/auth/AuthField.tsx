/**
 * A pílula: UM campo, que troca de conteúdo a cada passo sem nunca sair da tela.
 *
 * A moldura de vidro e o botão redondo ficam parados; só o input desliza pra fora
 * e o do próximo passo entra. É esse detalhe que costura usuário → senha → nome
 * num gesto contínuo (e o que faz a pergunta do nome não parecer um modal).
 *
 * Por isso a moldura tem altura fixa e o input é absoluto lá dentro: durante a
 * troca (AnimatePresence mode="wait") existe um instante SEM input nenhum, e sem
 * altura fixa a pílula colapsaria no meio da animação.
 *
 * O erro não empurra a página: ele dá um tranco no campo e escreve numa linha que
 * já estava reservada embaixo.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { EASE } from './easing';
import type { AuthStep } from './authSteps';

interface AuthFieldProps {
  step: AuthStep;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  errorNonce: number;
}

export function AuthField({ step, value, onChange, onSubmit, submitting, error, errorNonce }: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const shell = useAnimationControls();
  const ready = value.trim().length > 0 && !submitting;

  // O tranco. Dispara pelo nonce (e não pela mensagem) pra funcionar também quando
  // a pessoa erra a senha duas vezes seguidas — mensagem igual, tranco de novo.
  useEffect(() => {
    if (errorNonce === 0) return;
    void shell.start({
      x: [0, -10, 10, -7, 7, -3, 3, 0],
      transition: { duration: 0.45, ease: 'easeInOut' },
    });
  }, [errorNonce, shell]);

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <motion.div animate={shell} className="relative">
        {/* Halo: acende no foco e some quando há erro (aí quem fala é a borda vermelha). */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -inset-[3px] rounded-full blur-lg transition-opacity duration-500',
            focused && !error ? 'opacity-60' : 'opacity-0',
          )}
          style={{
            background:
              'linear-gradient(90deg, rgba(122,242,165,0.45), rgba(45,219,96,0.8), rgba(122,242,165,0.45))',
          }}
        />

        {/* O vidro da pílula é ESCURO, não branco translúcido. Com vidro claro, tanto
            o halo quanto os veios acesos do shader vazam pra dentro do campo: o texto
            fica sobre uma placa verde e o botão da marca (verde) some no fundo. Com
            piso escuro, o halo só brilha por fora, o shader borra atrás e o contraste
            do texto e do botão é garantido — não importa o que o fundo esteja fazendo. */}
        <div
          className={cn(
            'relative h-16 rounded-full border transition-colors duration-300',
            error ? 'border-danger/60' : focused ? 'border-brand/60' : 'border-white/12',
          )}
          style={{
            background: 'linear-gradient(165deg, rgba(13,15,18,0.72), rgba(5,6,7,0.82))',
            backdropFilter: 'blur(24px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.input
              key={step.id}
              type={step.type}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={step.placeholder}
              aria-label={step.label}
              aria-invalid={error ? true : undefined}
              autoComplete={step.autoComplete}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              // autoFocus é seguro aqui: a tela existe só pra este campo, e com
              // mode="wait" o input novo só monta depois que o antigo saiu.
              autoFocus
              disabled={submitting}
              initial={{ opacity: 0, x: 20, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(6px)' }}
              transition={{ duration: 0.3, ease: EASE }}
              className="absolute inset-0 w-full rounded-full bg-transparent pl-6 pr-[4.5rem] text-[17px] text-ink outline-none placeholder:text-ink-muted disabled:opacity-60"
            />
          </AnimatePresence>

          <button
            type="submit"
            disabled={!ready}
            aria-label={step.action}
            // Desabilitado NÃO é o botão verde a 40% de opacidade: sobre um fundo
            // verde claro ele sumiria por completo. Vira um disco de vidro escuro,
            // que continua legível como afordância em qualquer ponto do shader.
            className={cn(
              'group absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full',
              'transition-all duration-300',
              ready
                ? 'bg-brand text-[#0A1210] shadow-[0_0_24px_rgba(45,219,96,0.45)] hover:scale-110 hover:bg-brand-glow'
                : 'cursor-not-allowed border border-white/15 bg-black/45 text-white/45 backdrop-blur-md',
            )}
          >
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <Icon
                name="chevron-right"
                size={20}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            )}
          </button>
        </div>
      </motion.div>

      {/* Linha do erro: a altura é reservada sempre, então a mensagem nunca empurra
          o que está embaixo dela. */}
      <div className="mt-3 flex h-5 items-center justify-center" aria-live="polite">
        <AnimatePresence>
          {error && (
            <motion.p
              key={errorNonce}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="m-0 text-[13px] font-medium text-danger"
              style={{ textShadow: '0 1px 10px rgba(0,0,0,0.85)' }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
