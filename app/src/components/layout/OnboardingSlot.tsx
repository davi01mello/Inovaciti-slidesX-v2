/**
 * Presença do card de onboarding na sidebar, animada com motion:
 * - Entrada: cresce em altura + fade + leve subida com escala, numa curva suave.
 * - Saída: o inverso, um pouco mais rápida.
 * A altura animada faz o card de perfil abaixo deslizar junto, em vez de pular.
 * O overflow-hidden recorta o card durante a transição, então nada vaza do
 * painel mesmo se a sidebar estiver mudando de largura ao mesmo tempo.
 */
import { AnimatePresence, motion } from 'motion/react';
import { OnboardingCard } from '@/components/layout/OnboardingCard';

export function OnboardingSlot({ active }: { active: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {active && (
        <motion.div
          key="onboarding-card"
          initial={{ opacity: 0, height: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, height: 'auto', scale: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="flex justify-center py-3">
            <OnboardingCard />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
