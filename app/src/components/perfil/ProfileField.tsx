import { Icon, type IconName } from '@/components/ui/Icon';

interface ProfileFieldProps {
  label: string;
  icon: IconName;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

/** Campo do formulário de perfil: rótulo + input com ícone, foco em brand. */
export function ProfileField({ label, icon, value, onChange, placeholder, type = 'text' }: ProfileFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-ink-secondary">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 transition-all duration-200 focus-within:border-brand/35 focus-within:bg-white/[0.05]">
        <Icon name={icon} size={15} className="flex-none text-ink-muted" />
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-3 text-[14px] text-ink outline-none placeholder:text-ink-muted/60"
        />
      </div>
    </label>
  );
}
