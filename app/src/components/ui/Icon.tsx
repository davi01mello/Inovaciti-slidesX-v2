import type { SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'presentations'
  | 'templates'
  | 'library'
  | 'assets'
  | 'brand'
  | 'trash'
  | 'search'
  | 'bell'
  | 'help'
  | 'user'
  | 'settings'
  | 'billing'
  | 'logout'
  | 'chevron-down'
  | 'chevron-right'
  | 'mail'
  | 'plus'
  | 'dots'
  | 'idea'
  | 'structure'
  | 'edit'
  | 'sparkle-design'
  | 'sparkles'
  | 'import'
  | 'paste'
  | 'file-image'
  | 'file-pdf'
  | 'file-zip'
  | 'compass'
  | 'check'
  | 'grid'
  | 'list'
  | 'restore'
  | 'lock'
  | 'text'
  | 'attach'
  | 'arrow-up'
  | 'x'
  | 'undo'
  | 'redo';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

const STROKE_PATHS: Record<string, string[]> = {
  home: ['M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4.5v-7h-6v7H4.5A1.5 1.5 0 0 1 3 20v-9.5Z'],
  list: ['M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01'],
  library: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z'],
  assets: [
    'M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.75 3.75 0 1 1 5.3 5.3L9.76 17.77a2 2 0 0 1-2.83-2.83l8.49-8.49',
  ],
  brand: ['M12 3 4 6.5V12c0 5 3.5 8.4 8 9.5 4.5-1.1 8-4.5 8-9.5V6.5L12 3Z'],
  trash: ['M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6'],
  search: ['m20 20-3.5-3.5'],
  bell: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0'],
  help: ['M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.6.4-1.1.9-1.1 1.6v.7M12 17h.01'],
  user: ['M4 20c1-4 4-6 8-6s7 2 8 6'],
  settings: [
    'M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.5c0-.4.1-.8.1-1.2Z',
  ],
  billing: ['M17 8h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3M13 4v16M4 4h9v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'],
  logout: ['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3'],
  lock: ['M6 11V8a6 6 0 0 1 12 0v3', 'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z', 'M12 15v3'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-right': ['m9 6 6 6-6 6'],
  mail: ['M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z', 'm4 8 8 5.5L20 8'],
  plus: ['M12 5v14M5 12h14'],
  idea: ['M9 18h6M10 21h4M12 3a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2H15c0-.8.4-1.5 1-2A7 7 0 0 0 12 3Z'],
  structure: ['m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z', 'M12 3v18M4 7.5l8 4.5 8-4.5'],
  edit: ['M14 3 21 10 10 21H3v-7L14 3ZM12 5l7 7'],
  'sparkle-design': ['m5 3 2 4-2 4 4-2 4 2-2-4 2-4-4 2-4-2Z', 'M4 20 8 16M18 6l3-3'],
  sparkles: [
    'm11 3 1.5 4.5L17 9l-4.5 1.5L11 15l-1.5-4.5L5 9l4.5-1.5L11 3Zm8 10 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9L19 13Z',
  ],
  import: ['M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M7 10l5 5 5-5M12 15V3'],
  paste: ['M15 3H8a2 2 0 0 0-2 2v10M9 8h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-1'],
  'file-pdf': ['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z', 'M14 3v6h6M9 15h6M9 12h3'],
  compass: ['M16.24 7.76 13.5 13.5 7.76 16.24 10.5 10.5l5.74-2.74Z', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z'],
  check: ['m5 12.5 4.5 4.5L19 7'],
  restore: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  'file-zip': [
    'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z',
    'M14 3v6h6M10 12v6M10 12h1a2 2 0 0 1 0 4h-1',
  ],
  text: ['M5 7V4h14v3', 'M12 4v16', 'M8.5 20h7'],
  attach: ['M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.75 3.75 0 1 1 5.3 5.3L9.76 17.77a2 2 0 0 1-2.83-2.83l8.49-8.49'],
  'arrow-up': ['M12 19V5', 'm5.5 11.5 6.5-6.5 6.5 6.5'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  undo: ['M8.5 5 4 9.5 8.5 14', 'M4 9.5h10a6 6 0 0 1 0 12h-3'],
  redo: ['m15.5 5 4.5 4.5-4.5 4.5', 'M20 9.5H10a6 6 0 0 0 0 12h3'],
};

function StrokeIcon({ name, size = 18, ...rest }: IconProps) {
  const paths = STROKE_PATHS[name] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Tela de apresentação em cavalete com linha de crescimento — o glifo antigo
 * não tinha a moldura da tela e renderizava como traços soltos. */
function PresentationsIcon({ size = 18, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <rect x="3" y="3.5" width="18" height="13" rx="2.2" />
      <path d="m7.5 12.5 2.6-2.6 2 1.5 4.4-4.4" />
      <path d="M12 16.5v2" />
      <path d="m8.5 21 3.5-2.5 3.5 2.5" />
    </svg>
  );
}

function TemplatesIcon({ size = 18, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SearchIcon({ size = 16, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      {...rest}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HelpIcon({ size = 18, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.6.4-1.1.9-1.1 1.6v.7M12 17h.01" />
    </svg>
  );
}

function UserIcon({ size = 14, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      {...rest}
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20c1-4 4-6 8-6s7 2 8 6" />
    </svg>
  );
}

function SettingsIcon({ size = 14, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      {...rest}
    >
      <circle cx="12" cy="12" r="3" />
      <path d={STROKE_PATHS.settings?.[0]} />
    </svg>
  );
}

function ChevronIcon({ name, size = 12, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={STROKE_PATHS[name]?.[0]} />
    </svg>
  );
}

function DotsIcon({ size = 14, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <circle cx="12" cy="6" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="18" r="1.4" />
    </svg>
  );
}

function PlusIcon({ size = 15, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FileImageIcon({ size = 16, ...rest }: Omit<IconProps, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" />
      <circle cx="9" cy="10" r="2" stroke="currentColor" />
      <path d="m4 18 5-4 3 2 4-3 4 4" stroke="currentColor" />
    </svg>
  );
}

/** Central icon registry — every glyph used across the app lives here so
 * visual fidelity to the source design stays in one place. */
export function Icon({ name, size, ...rest }: IconProps) {
  switch (name) {
    case 'presentations':
      return <PresentationsIcon size={size} {...rest} />;
    case 'templates':
    case 'grid':
      return <TemplatesIcon size={size} {...rest} />;
    case 'search':
      return <SearchIcon size={size} {...rest} />;
    case 'help':
      return <HelpIcon size={size} {...rest} />;
    case 'user':
      return <UserIcon size={size} {...rest} />;
    case 'settings':
      return <SettingsIcon size={size} {...rest} />;
    case 'chevron-down':
    case 'chevron-right':
      return <ChevronIcon name={name} size={size} {...rest} />;
    case 'dots':
      return <DotsIcon size={size} {...rest} />;
    case 'plus':
      return <PlusIcon size={size} {...rest} />;
    case 'file-image':
      return <FileImageIcon size={size} {...rest} />;
    default:
      return <StrokeIcon name={name} size={size} {...rest} />;
  }
}
