/**
 * Configurações que fazem coisa de verdade:
 * - Reduzir animações → data attribute no <html> que zera animações/transições (index.css).
 * - Padrões do wizard → pré-selecionam os passos 2 e 3 de toda apresentação nova.
 * - Confirmação de Lixeira → liga/desliga o diálogo antes de mover.
 * - Zona de risco → limpar os dados locais (apresentações, perfil, preferências).
 * Layout: duas colunas simétricas + a zona de risco em faixa própria embaixo.
 */
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SettingsSection, SettingRow } from '@/components/settings/SettingsSection';
import { Toggle, ChipGroup } from '@/components/settings/SettingsControls';
import { settingsStore, useSettings } from '@/stores/settingsStore';
import { GOAL_OPTIONS, STYLE_OPTIONS } from '@/data/creationOptions';
import { pushToast } from '@/lib/toast';
import type { PresentationGoal, VisualStyle } from '@/types/creation';

export function ConfiguracoesPage() {
  const settings = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);

  function resetAll() {
    setConfirmReset(false);
    localStorage.clear();
    pushToast('Dados locais apagados. Recarregando…');
    window.setTimeout(() => window.location.assign('/'), 600);
  }

  return (
    <>
      <div>
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="h-px w-6 bg-gradient-to-r from-brand to-transparent" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Preferências</span>
        </div>
        <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em] text-ink">Configurações</h1>
        <p className="mt-1 text-[14px] text-ink-muted">Preferências desta máquina, cada uma com efeito imediato.</p>
      </div>

      <div className="grid max-w-[1160px] items-start gap-5 xl:grid-cols-2">
        <SettingsSection
          icon="sparkle-design"
          title="Experiência"
          caption="Como a plataforma se comporta no dia a dia."
          className="animate-fade-up"
        >
          <SettingRow
            title="Reduzir animações"
            description="Desliga brilhos, derivas e transições. Vale pra plataforma inteira, na hora."
          >
            <Toggle
              on={settings.reduceMotion}
              onChange={(next) => settingsStore.update({ reduceMotion: next })}
              label="Reduzir animações"
            />
          </SettingRow>

          <SettingRow
            title="Confirmar antes de mover pra Lixeira"
            description="Com isso desligado, apresentações vão pra Lixeira em um clique (dá pra restaurar por 30 dias)."
          >
            <Toggle
              on={settings.confirmBeforeTrash}
              onChange={(next) => settingsStore.update({ confirmBeforeTrash: next })}
              label="Confirmar antes de mover pra Lixeira"
            />
          </SettingRow>

          <SettingRow
            title="Sons do sistema"
            description="Um aviso sonoro curto quando a apresentação fica pronta, ao copiar ou baixar da Marca, e ao esvaziar a Lixeira."
          >
            <Toggle
              on={settings.soundEffects}
              onChange={(next) => settingsStore.update({ soundEffects: next })}
              label="Sons do sistema"
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          icon="structure"
          title="Padrões de Criação"
          caption="Pré-seleções pra toda apresentação nova."
          className="animate-fade-up"
        >
          <SettingRow
            layout="stacked"
            title="Objetivo padrão"
            description="Pré-seleciona o objetivo no passo Direção do wizard. Clique de novo pra tirar o padrão."
          >
            <ChipGroup<PresentationGoal>
              options={GOAL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={settings.defaultGoal}
              onChange={(next) => settingsStore.update({ defaultGoal: next })}
            />
          </SettingRow>

          <SettingRow
            layout="stacked"
            title="Voz padrão"
            description="Pré-seleciona o tom da escrita no passo Direção do wizard."
          >
            <ChipGroup<VisualStyle>
              options={STYLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={settings.defaultStyle}
              onChange={(next) => settingsStore.update({ defaultStyle: next })}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          icon="trash"
          title="Zona de Risco"
          caption="Ações sem volta. Respire antes de clicar."
          tone="danger"
          className="animate-fade-up xl:col-span-2"
        >
          <SettingRow
            title="Apagar todos os dados locais"
            description="Remove apresentações, Lixeira, perfil e preferências deste navegador. Sem volta. As imagens já geradas continuam no servidor."
          >
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex-none rounded-control border border-danger/30 bg-danger-soft px-4 py-2.5 text-[13px] font-semibold text-danger transition-colors duration-150 hover:bg-danger/[0.18]"
            >
              Apagar tudo
            </button>
          </SettingRow>
        </SettingsSection>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Apagar todos os dados locais?"
        description="Todas as apresentações, o conteúdo da Lixeira, seu perfil e preferências somem deste navegador. Essa ação não tem volta."
        confirmLabel="Apagar tudo"
        tone="danger"
        onConfirm={resetAll}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
