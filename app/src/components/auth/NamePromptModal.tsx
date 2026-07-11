/**
 * Popup que aparece uma única vez, logo após o primeiro login bem-sucedido neste
 * navegador: pede o nome da pessoa e salva no userStore. Mesmo padrão visual do
 * ConfirmDialog (glass-deep, portal, animate-dialog-in), sem opção de cancelar --
 * o nome é obrigatório pra UI parar de mostrar "Equipe CITi" genérico.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { userStore } from '@/stores/userStore';

interface NamePromptModalProps {
  onDone: () => void;
}

export function NamePromptModal({ onDone }: NamePromptModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    userStore.update({ name: trimmed });
    onDone();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Como podemos te chamar?"
        className="glass-deep w-full max-w-[400px] animate-dialog-in rounded-2xl p-6"
      >
        <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-ink">Como podemos te chamar?</h2>
        <p className="mb-0 mt-2 text-[13px] leading-[1.55] text-ink-muted">
          É a primeira vez que você entra neste navegador. Seu nome aparece na sidebar e no perfil.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder="Seu nome"
          className="mt-4 w-full rounded-control border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-brand/40"
        />
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-control bg-gradient-to-b from-[#36E66A] to-brand px-4 py-2.5 text-[13px] font-semibold text-[#0A1210] shadow-[0_8px_20px_-8px_rgba(45,219,96,0.5)] transition-all duration-150 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
