/**
 * Cena de boas-vindas: o logo flutua no centro com anéis de luz se expandindo,
 * cercado por quatro chips de vidro que resumem o fluxo inteiro. Puro clima —
 * o detalhe fica pros próximos passos.
 */
import { motion } from 'motion/react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import logo from '@/assets/citi-slides-logo.png';

const ORBIT_CHIPS: { icon: IconName; label: string; position: string; delay: number }[] = [
  { icon: 'idea', label: 'Briefing em texto', position: 'left-[9%] top-[20%]', delay: 0.15 },
  { icon: 'structure', label: 'IA estrutura', position: 'right-[7%] top-[28%]', delay: 0.3 },
  { icon: 'edit', label: 'Você refina', position: 'left-[13%] bottom-[22%]', delay: 0.45 },
  { icon: 'sparkles', label: 'Marca CITi aplicada', position: 'right-[9%] bottom-[16%]', delay: 0.6 },
];

export function WelcomeDemo() {
  return (
    <div className="relative h-full w-full">
      {/* Halo central: a luz da marca respirando atrás do logo. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(45,219,96,0.18) 0%, transparent 65%)', filter: 'blur(8px)' }}
      />

      {/* Anéis de luz que nascem no logo e se dissolvem, em três tempos. */}
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2">
        {[0, 1.1, 2.2].map((delay) => (
          <motion.div
            key={delay}
            className="absolute inset-0 rounded-full border border-brand/25"
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: 1.9, opacity: [0, 0.5, 0] }}
            transition={{ duration: 3.3, delay, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
      </div>

      {/* O logo, flutuando devagar como a bolha líquida da casa. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.img
          src={logo}
          alt=""
          className="w-44 object-contain drop-shadow-[0_0_30px_rgba(45,219,96,0.35)]"
          animate={{ y: [-8, 8, -8] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Chips satélites: o fluxo do app em quatro palavras, orbitando o logo. */}
      {ORBIT_CHIPS.map((chip) => (
        <motion.div
          key={chip.label}
          className={cn('glass absolute flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4', chip.position)}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: [0, -9, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: chip.delay },
            y: { duration: 4.6, delay: chip.delay, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-brand/25 bg-brand/[0.09] text-brand">
            <Icon name={chip.icon} size={13} />
          </span>
          <span className="text-[12.5px] font-medium text-ink-secondary">{chip.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
