export function BooleanChoice({
  label,
  value,
  onChange,
  positive,
  negative,
  help,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  positive: string;
  negative: string;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <div className="store-config-field">
      <span>{label}</span>
      <div className="segmented-toggle" role="group" aria-label={label}>
        <button
          className={`btn ${value ? "primary" : "ghost"} btn-compact`}
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
        >
          {positive}
        </button>
        <button
          className={`btn ${!value ? "primary" : "ghost"} btn-compact`}
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
        >
          {negative}
        </button>
      </div>
      {help ? <small>{help}</small> : null}
    </div>
  );
}
