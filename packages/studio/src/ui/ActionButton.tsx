import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  hint: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  icon?: ReactNode;
  type?: 'button' | 'submit';
  className?: string;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'es-btn es-btn-primary',
  secondary: 'es-btn es-btn-secondary',
  ghost: 'es-btn es-btn-ghost',
  danger: 'es-btn es-btn-danger',
};

export function ActionButton({
  label,
  hint,
  onClick,
  disabled,
  variant = 'secondary',
  icon,
  type = 'button',
  className = '',
}: Props) {
  return (
    <button
      type={type}
      className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      title={hint}
      aria-label={`${label} — ${hint}`}
    >
      {icon ? <span className="es-btn-icon" aria-hidden>{icon}</span> : null}
      <span className="es-btn-text">
        <span className="es-btn-label">{label}</span>
        <span className="es-btn-hint">{hint}</span>
      </span>
    </button>
  );
}

export function ActionLink({
  label,
  hint,
  href,
  external,
}: {
  label: string;
  hint: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      className="es-btn es-btn-ghost es-btn-link"
      href={href}
      title={hint}
      aria-label={`${label} — ${hint}`}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      <span className="es-btn-text">
        <span className="es-btn-label">{label}</span>
        <span className="es-btn-hint">{hint}</span>
      </span>
    </a>
  );
}
