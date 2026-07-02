interface Props {
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'muted';
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'es-badge',
  accent: 'es-badge es-badge-accent',
  success: 'es-badge es-badge-success',
  warning: 'es-badge es-badge-warning',
  muted: 'es-badge es-badge-muted',
};

export function Badge({ children, tone = 'default' }: Props) {
  return <span className={TONE[tone]}>{children}</span>;
}
