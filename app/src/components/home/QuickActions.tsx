import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { pushToast } from '@/lib/toast';

interface ActionTile {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  run: () => void;
}

/** Briefings colados ou importados não precisam ser gigantes pro wizard funcionar. */
const MAX_IDEA_CHARS = 4000;

export function QuickActions() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function startWithIdea(idea: string) {
    navigate('/nova', { state: { idea: idea.slice(0, MAX_IDEA_CHARS) } });
  }

  async function pasteContent() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        pushToast('Sua área de transferência está vazia. Copie um texto e tente de novo.');
        return;
      }
      pushToast('Conteúdo colado no briefing.');
      startWithIdea(text);
    } catch {
      pushToast('Não consegui ler a área de transferência. Cole o texto direto no briefing.');
      navigate('/nova');
    }
  }

  async function importFile(file: File) {
    const text = (await file.text()).trim();
    if (!text) {
      pushToast(`"${file.name}" está vazio. Escolha um arquivo com texto.`);
      return;
    }
    pushToast(`"${file.name}" virou o briefing da apresentação.`);
    startWithIdea(text);
  }

  const actions: ActionTile[] = [
    {
      id: 'create-ai',
      icon: 'sparkles',
      title: 'Criar com IA',
      description: 'A partir de um briefing',
      run: () => navigate('/nova'),
    },
    {
      id: 'use-template',
      icon: 'templates',
      title: 'Usar Template',
      description: 'Escolha um modelo pronto',
      run: () => navigate('/templates'),
    },
    {
      id: 'import-file',
      icon: 'import',
      title: 'Importar Arquivo',
      description: 'Um .txt ou .md vira briefing',
      run: () => fileInputRef.current?.click(),
    },
    {
      id: 'paste-content',
      icon: 'paste',
      title: 'Colar Conteúdo',
      description: 'Da sua área de transferência',
      run: () => void pasteContent(),
    },
  ];

  return (
    <section>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,text/plain,text/markdown"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
          event.target.value = '';
        }}
      />
      <div className="mb-3.5 text-[13px] font-semibold tracking-[-0.005em] text-ink-secondary">Comece Rápido</div>
      <div className="grid grid-cols-4 gap-3.5">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.run}
            className="glass group flex items-center gap-3.5 rounded-2xl px-[18px] py-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-brand/25 hover:shadow-[0_0_0_1px_var(--color-brand-glow-soft),0_20px_40px_-20px_rgba(0,0,0,0.6)]"
          >
            <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl border border-brand/20 bg-brand/6 text-brand transition-all duration-200 group-hover:border-brand/40 group-hover:bg-brand/[0.12] group-hover:shadow-[0_0_16px_-4px_rgba(45,219,96,0.5)]">
              <Icon name={action.icon} size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold tracking-[-0.005em] text-ink">{action.title}</div>
              <div className="mt-0.5 truncate text-[11.5px] text-ink-muted">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
