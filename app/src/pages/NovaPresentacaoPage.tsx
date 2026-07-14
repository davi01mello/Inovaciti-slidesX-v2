import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { WizardShell } from '@/components/creation/WizardShell';
import { WizardNav } from '@/components/creation/WizardNav';
import { StepIdea, MIN_IDEA_CHARS } from '@/components/creation/StepIdea';
import { StepDirection } from '@/components/creation/StepDirection';
import { StepSlides } from '@/components/creation/StepSlides';
import { StepAssets } from '@/components/creation/StepAssets';
import { StepSummary } from '@/components/creation/StepSummary';
import {
  EMPTY_DRAFT,
  type CreationDraft,
  type DraftAsset,
  type PresentationGoal,
  type VisualStyle,
} from '@/types/creation';
import { presentationsStore } from '@/stores/presentationsStore';
import { settingsStore } from '@/stores/settingsStore';
import { suggestSlideCount } from '@/lib/slidePlan';
import { TEMPLATES } from '@/data/templates';
import { DEFAULT_TONE } from '@/services/tone';

/**
 * A ordem tem intenção. A ideia vem primeiro porque é a matéria bruta. A direção
 * vem antes da extensão porque o objetivo muda quantos slides a história pede
 * (capacitar precisa de espaço, inspirar precisa de corte), e é isso que deixa a
 * recomendação do passo 3 nascer já calibrada.
 */
const STEP_LABELS = ['Ideia', 'Direção', 'Extensão', 'Anexos', 'Revisão'] as const;
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
      slideCount: template.slideCount,
      goal: template.goal,
      audience: '',
      style: template.style,
      tone: DEFAULT_TONE,
      assets: [],
    };
  }

  return {
    ...EMPTY_DRAFT,
    idea: state?.idea?.trim() ?? '',
    goal: settings.defaultGoal,
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
  // A quantidade é a recomendação do sistema até alguém encostar nela. Depois
  // disso a escolha manda, e nenhuma edição de briefing sobrescreve.
  // Vindo de um template, a contagem JÁ foi escolhida a dedo por quem escreveu o
  // template: isso conta como decisão tomada, e a heurística não passa por cima.
  const slideCountTouched = useRef(
    Boolean((location.state as WizardLocationState | null)?.templateId),
  );
  // Evita criar duas apresentações num duplo clique ou Enter no passo final.
  const creatingRef = useRef(false);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return draft.idea.trim().length >= MIN_IDEA_CHARS;
      case 2:
        return draft.goal !== null && draft.style !== null;
      case 3:
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
      // Ao entrar na Extensão, a recomendação já vem aplicada: a pessoa encontra
      // o número ideal na tela em vez de um palpite genérico esperando por ela.
      if (step === 2 && !slideCountTouched.current) {
        setDraft((d) => ({ ...d, slideCount: suggestSlideCount(d.idea, d.goal).count }));
      }
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
  // é ⌘/Ctrl+Enter (Enter puro quebra linha). Botões do app seguem nativos, e a
  // exceção são os cards de opção (role="radio"), onde Enter significa seguir.
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
      const isNeutralTarget = !target || target === document.body || target.getAttribute('role') === 'radio';
      if (!isNeutralTarget) return;
      event.preventDefault();
      goNext();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goNext]);

  const onIdea = useCallback((idea: string) => setDraft((d) => ({ ...d, idea })), []);
  // Importar de outra página do Notion depois de já ter vindo de uma substitui o alvo
  // do link de volta — só a página mais recente importada recebe a escrita.
  const onNotionPageId = useCallback(
    (notionPageId: string) => setDraft((d) => ({ ...d, notionPageId })),
    [],
  );
  const onGoal = useCallback((goal: PresentationGoal) => setDraft((d) => ({ ...d, goal })), []);
  const onAudience = useCallback((audience: string) => setDraft((d) => ({ ...d, audience })), []);
  const onStyle = useCallback((style: VisualStyle) => setDraft((d) => ({ ...d, style })), []);
  const onAssets = useCallback((assets: DraftAsset[]) => setDraft((d) => ({ ...d, assets })), []);
  const onSlideCount = useCallback((slideCount: number) => {
    slideCountTouched.current = true;
    setDraft((d) => ({ ...d, slideCount }));
  }, []);

  const continueHint = step === 1 ? (IS_MAC ? '⌘ Enter' : 'Ctrl Enter') : 'Enter';

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      stepLabel={STEP_LABELS[step - 1] ?? ''}
      footer={
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
      }
    >
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
          {step === 1 && <StepIdea value={draft.idea} onChange={onIdea} onNotionPageId={onNotionPageId} />}
          {step === 2 && (
            <StepDirection
              goal={draft.goal}
              audience={draft.audience}
              style={draft.style}
              onGoalChange={onGoal}
              onAudienceChange={onAudience}
              onStyleChange={onStyle}
            />
          )}
          {step === 3 && (
            <StepSlides idea={draft.idea} goal={draft.goal} value={draft.slideCount} onChange={onSlideCount} />
          )}
          {step === 4 && <StepAssets assets={draft.assets} onChange={onAssets} />}
          {step === 5 && <StepSummary draft={draft} onEdit={goToStep} />}
        </motion.div>
      </AnimatePresence>
    </WizardShell>
  );
}
