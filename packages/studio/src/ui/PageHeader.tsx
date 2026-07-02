interface Props {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ kicker, title, description, actions }: Props) {
  return (
    <header className="es-page-header">
      <div className="es-page-header-main">
        {kicker ? <p className="es-kicker">{kicker}</p> : null}
        <h1 className="es-page-title">{title}</h1>
        {description ? <p className="es-page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="es-page-header-actions">{actions}</div> : null}
    </header>
  );
}
