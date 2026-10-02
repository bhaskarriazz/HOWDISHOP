import { V8Dialog } from "./V8System";

// App owns the routes and permission checks; opening Spark only opens this dialog.
export function V8Spark({ open, onClose, onNavigate, onCustomize }) {
  return <V8Dialog open={open} title="Spark" labelledBy="v8-spark-title" onClose={onClose}>
    <p className="v8-muted">What would you like to do?</p>
    <div className="v8-confirm-actions">
      {[["ask", "Ask HOWDI"], ["vibe", "Vibe"], ["hpay", "HPay"], ["messages", "Messages"]].map(([area, label]) =>
        <button key={area} type="button" className="v8-btn" onClick={() => { onClose(); onNavigate(area); }}>{label}</button>)}
      <button type="button" className="v8-btn" onClick={() => { onClose(); onCustomize(); }}>Customize Home</button>
    </div>
  </V8Dialog>;
}
