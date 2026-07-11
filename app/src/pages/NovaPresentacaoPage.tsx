import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { WizardShell } from '@/components/creation/WizardShell';
import { WizardNav } from '@/components/creation/WizardNav';
import { StepIdea, MIN_IDEA_CHARS } from '@/components/creation/StepIdea';
import { StepSize } from '@/components/creation/StepSize';
import { StepStyle } from '@/components/creation/StepStyle';
import { StepAssets } from '@/components/creation/StepAssets';
import { StepSummary } from '@/components/creation/StepSummary';
import { EMPTY_DRAFT, type CreationDraft, type DraftAsset, type PresentationSize, type VisualStyle } from '@/types/creation';
import { presentationsStore } from '@/stores/presentationsStore';
import { settingsStore } from '@/stores/settingsStore';
import { TEMPLATES } from '@/data/templates';

const STEP_LABELS = ['Ideia', 'Contexto', 'Estilo', 'Anexos', 'Revisão'] as const;
const TOTAL_STEPS = STEP_LABELS.length;

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.userAgent);

/** Estado de navegação vindo de Templates ou das ações rápidas (importar/colar). */
interface WizardLocationState {
  templateId?: string;
  idea?: string;
}

/** Draft inicial: template (se veio de um) > ideia importada/colada > preferências salvas > vazio. */
function buildInitialDraft(state: WizardLocationState | null): CreationDraft {
  const settings = settingsStore.getState();
  const template = state?.templateId ? TEMPLATES.find((t) => t.id === state.templateId) : undefined;
  if (template) {
    return {
      idea: template.ideaSkeleton,
      size: template.size,
      style: template.style,
      assets: [],
    };
  }
  return {
    ...EMPTY_DRAFT,
    idea: state?.idea?.trim() ?? '',
    size: settings.defaultSize,
    style: settings.defaultStyle,
  };
}

const stepVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 36 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -28 }),
};

export function NovaPresentacaoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  // +1 avançando, -1 voltando: orienta o slide da transição entre passos.
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<CreationDraft>(() =>
    buildInitialDraft(location.state as WizardLocationState | null),
  );
  // Evita criar duas apresentações num duplo clique/Enter no passo final.
  const creatingRef = useRef(false);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return draft.idea.trim().length >= MIN_IDEA_CHARS;
      case 2:
        return draft.size !== null;
      case 3:
        return draft.style !== null;
      case 4:
      case 5:
        return true;
      default:
        return false;
    }
  }, [step, draft]);

  const goNext = useCallback(() => {
    if (!canContinue) return;
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
      return;
    }
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      const id = presentationsStore.createFromDraft(draft);
      navigate(`/workspace/${id}`);
    } catch (error) {
      creatingRef.current = false;
      throw error;
    }
  }, [canContinue, step, draft, navigate]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const goToStep = useCallback(
    (target: number) => {
      if (target < 1 || target > TOTAL_STEPS || target === step) return;
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step],
  );

  // Enter avança de qualquer lugar "neutro" da página; dentro do texto da ideia
  // é ⌘/Ctrl+Enter (Enter puro quebra linha). Botões do app seguem nativos —
  // a exceção são os cards de opção (role="radio"), onde Enter significa seguir.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return;
      const target = event.target as HTMLElement | null;
      const isTypingField =
        target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement || target?.isContentEditable;

      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        goNext();
        return;
      }
      if (isTypingField) return;
      const isNeutralTarget =
        !target || target === document.body || target.getAttribute('role') === 'radio';
      if (!isNeutralTarget) return;
      event.preventDefault();
      goNext();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goNext]);

  const onIdea = useCallback((idea: string) => setDraft((d) => ({ ...d, idea })), []);
  const onSize = useCallback((size: PresentationSize) => setDraft((d) => ({ ...d, size })), []);
  const onStyle = useCallback((style: VisualStyle) => setDraft((d) => ({ ...d, style })), []);
  const onAssets = useCallback((assets: DraftAsset[]) => setDraft((d) => ({ ...d, assets })), []);

  const continueHint = step === 1 ? (IS_MAC ? '⌘ Enter' : 'Ctrl Enter') : 'Enter';

  return (
    <WizardShell step={step} totalSteps={TOTAL_STEPS} stepLabel={STEP_LABELS[step - 1] ?? ''} footer={
      <WizardNav
        step={step}
        stepLabels={STEP_LABELS}
        onBack={step > 1 ? goBack : undefined}
        onContinue={goNext}
        onStepSelect={goToStep}
        canContinue={canContinue}
        continueLabel={step === TOTAL_STEPS ? 'Bora começar' : 'Continuar'}
        continueHint={continueHint}
      />
    }>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 1 && <StepIdea value={draft.idea} onChange={onIdea} />}
          {step === 2 && <StepSize value={draft.size} onChange={onSize} />}
          {step === 3 && <StepStyle value={draft.style} onChange={onStyle} />}
          {step === 4 && <StepAssets assets={draft.assets} onChange={onAssets} />}
          {step === 5 && <StepSummary draft={draft} onEdit={goToStep} />}
        </motion.div>
      </AnimatePresence>
    </WizardShell>
  );
}
