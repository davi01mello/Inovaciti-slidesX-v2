/**
 * Perfil local: edita o que assina a interface (sidebar, hero, menu).
 * Persistido no navegador — o app não tem backend de contas, e a página diz isso.
 * O cartão de identidade à esquerda reage ao vivo enquanto o formulário muda.
 */
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IdentityCard } from '@/components/perfil/IdentityCard';
import { ProfileField } from '@/components/perfil/ProfileField';
import { userStore, useUserProfile } from '@/stores/userStore';
import { pushToast } from '@/lib/toast';

export function PerfilPage() {
  const saved = useUserProfile();
  const [name, setName] = useState(saved.name);
  const [department, setDepartment] = useState(saved.department);
  const [email, setEmail] = useState(saved.email);

  const dirty = name !== saved.name || department !== saved.department || email !== saved.email;

  function save(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    userStore.update({ name, department, email });
    pushToast('Perfil atualizado.');
  }

  function discard() {
    setName(saved.name);
    setDepartment(saved.department);
    setEmail(saved.email);
  }

  return (
    <>
      <div>
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="h-px w-6 bg-gradient-to-r from-brand to-transparent" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Conta</span>
        </div>
        <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em] text-ink">Perfil</h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          É assim que a plataforma te chama. Fica salvo só neste navegador.
        </p>
      </div>

      <div className="grid max-w-[960px] items-start gap-5 lg:grid-cols-[320px_1fr]">
        <div className="animate-fade-up">
          <IdentityCard name={name} department={department} email={email} />
        </div>

        <Card as="div" className="animate-fade-up p-7" style={{ animationDelay: '60ms' }}>
          <form onSubmit={save}>
            <div className="mb-6 border-b border-white/[0.05] pb-4">
              <h2 className="m-0 text-[15.5px] font-semibold tracking-[-0.01em] text-ink">Identidade</h2>
              <p className="mb-0 mt-0.5 text-[12px] text-ink-muted">
                O cartão ao lado reage enquanto você digita — salve pra valer na interface.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <ProfileField
                label="Nome"
                icon="user"
                value={name}
                onChange={setName}
                placeholder="Como você quer ser chamado"
              />
              <ProfileField
                label="Área"
                icon="compass"
                value={department}
                onChange={setDepartment}
                placeholder="Ex.: Inovação · CITi"
              />
              <ProfileField
                label="E-mail"
                icon="mail"
                value={email}
                onChange={setEmail}
                placeholder="voce@citi.org.br"
                type="email"
              />
            </div>

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-5">
              <span className="text-[11.5px] text-ink-muted">Salvo só neste navegador.</span>
              <div className="flex items-center gap-3">
                {dirty && (
                  <button
                    type="button"
                    onClick={discard}
                    className="text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
                  >
                    Descartar
                  </button>
                )}
                <Button type="submit" disabled={!dirty} className="disabled:cursor-not-allowed disabled:opacity-40">
                  Salvar alterações
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
