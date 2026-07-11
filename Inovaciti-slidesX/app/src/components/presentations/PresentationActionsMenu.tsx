/**
 * Menu de ações de uma apresentação (abrir, renomear, duplicar, exportar,
 * lixeira). Extraído do card pra ser o MESMO menu na grade e na lista —
 * comportamento e confirmação idênticos nos dois lugares.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { MenuItem } from '@/components/ui/MenuItem';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { presentationsStore } from '@/stores/presentationsStore';
import { useSettings } from '@/stores/settingsStore';
import { canExportPresentation, exportPresentationAsPptx } from '@/lib/exportPptx';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import type { Presentation } from '@/types/presentation';

interface PresentationActionsMenuProps {
  presentation: Presentation;
  /** O dono do título (card ou linha) decide como renomear inline. */
  onRenameRequest: () => void;
  /** 'up' pros cards da grade (menu abre acima), 'down' pras linhas da lista. */
  placement?: 'up' | 'down';
}

export function PresentationActionsMenu({
  presentation,
  onRenameRequest,
  placement = 'up',
}: PresentationActionsMenuProps) {
  const navigate = useNavigate();
  const settings = useSettings();
  const menu = useDisclosure();
  const menuRef = useRef<HTMLDivElement>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);
  useOnClickOutside([menuRef], menu.close, menu.isOpen);

  const exportBlocked = !canExportPresentation(presentation);

  function open() {
    navigate(`/workspace/${presentation.id}`);
  }

  function duplicate() {
    menu.close();
    const copyId = presentationsStore.duplicate(presentation.id);
    if (copyId) pushToast('Cópia criada logo abaixo da original.');
  }

  async function exportPptx() {
    menu.close();
    try {
      await exportPresentationAsPptx(presentation);
      pushToast('PPTX exportado. Confere na pasta de downloads.');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Não consegui exportar agora.');
    }
  }

  function trash() {
    setConfirmTrash(false);
    menu.close();
    presentationsStore.moveToTrash(presentation.id);
    pushToast('Movida pra Lixeira. Dá pra restaurar por 30 dias.');
  }

  function requestTrash() {
    if (settings.confirmBeforeTrash) setConfirmTrash(true);
    else trash();
  }

  return (
    <div className="relative" ref={menuRef}>
      <IconButton
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        className="h-[26px] w-[26px] rounded-lg"
        onClick={(event) => {
          event.stopPropagation();
          menu.toggle();
        }}
      >
        <Icon name="dots" size={14} />
      </IconButton>

      {menu.isOpen && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'glass-deep absolute right-0 z-30 w-[190px] animate-menu-in rounded-xl p-1.5',
            placement === 'up' ? 'bottom-9' : 'top-9',
          )}
        >
          <MenuItem icon={<Icon name="presentations" size={14} />} onClick={open}>
            Abrir
          </MenuItem>
          <MenuItem
            icon={<Icon name="edit" size={14} />}
            onClick={() => {
              menu.close();
              onRenameRequest();
            }}
          >
            Renomear
          </MenuItem>
          <MenuItem icon={<Icon name="paste" size={14} />} onClick={duplicate}>
            Duplicar
          </MenuItem>
          <MenuItem
            icon={<Icon name="import" size={14} />}
            onClick={() => void exportPptx()}
            disabled={exportBlocked}
            title={exportBlocked ? 'Adicione slides antes de exportar' : undefined}
            className="disabled:cursor-not-allowed disabled:opacity-40"
          >
            Exportar PPTX
          </MenuItem>
          <div className="my-1 h-px bg-border-subtle" />
          <MenuItem tone="danger" icon={<Icon name="trash" size={14} />} onClick={requestTrash}>
            Mover pra Lixeira
          </MenuItem>
        </div>
      )}

      <ConfirmDialog
        open={confirmTrash}
        title={`Mover "${presentation.title}" pra Lixeira?`}
        description="Ela some das suas listas, mas dá pra restaurar na Lixeira por até 30 dias."
        confirmLabel="Mover pra Lixeira"
        tone="danger"
        onConfirm={trash}
        onCancel={() => setConfirmTrash(false)}
      />
    </div>
  );
}
