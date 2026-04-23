type Props = {
  open: boolean
  onClick: () => void
}

export function ToggleButton({ open, onClick }: Props) {
  return (
    <button
      className={`tc-toggle-btn ${open ? "tc-toggle-btn-open" : ""}`}
      onClick={onClick}
      title={open ? "Hide transcript" : "Show transcript"}
      aria-label={open ? "Hide transcript" : "Show transcript"}>
      {open ? "✕" : "📄"}
    </button>
  )
}
