import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { V8Icon } from "../V8Shell.jsx";
import { readInputDraft, saveInputDraft } from "./inputDraftStore.js";
import {
  buildPreviewRecoveryIncident,
  recoveryRetryPolicy,
} from "./recoveryModel.js";
import {
  RECOVERY_HANDOFF_EVENT,
  RECOVERY_REPORT_EVENT,
  buildSparkHandoff,
  buildSupportHandoff,
  dispatchRecoveryHandoff,
} from "./recoveryHandoffs.js";
import {
  RECOVERY_OPEN_PAGE_EVENT,
  RECOVERY_PREVIEW_PATH,
  clearRecoveryIncident,
  getLastRecoveryIncident,
  openRecoveryPreviewPage,
} from "./recoveryReport.js";
import "./recovery.css";

const RecoveryContext = createContext(null);

export function useRecovery() {
  return useContext(RecoveryContext);
}

function RecoveryActions({ incident, onResume, onOpenPage, onDismiss }) {
  const policy = incident?.policy || recoveryRetryPolicy(incident);
  const support = () => dispatchRecoveryHandoff(buildSupportHandoff(incident));
  const spark = () => dispatchRecoveryHandoff(buildSparkHandoff(incident));

  return (
    <div className="v8rec-actions">
      {policy.allowManualRetry ? (
        <button type="button" className="v8-btn v8-btn-primary" onClick={() => onResume?.(incident)}>
          Try again
        </button>
      ) : null}
      {policy.requireStatusCheck ? (
        <button type="button" className="v8-btn" onClick={() => onOpenPage?.(incident)}>
          Review options
        </button>
      ) : null}
      <button type="button" className="v8-btn" onClick={support}>
        Help &amp; Support
      </button>
      <button type="button" className="v8-btn v8-btn-soft" onClick={spark}>
        <V8Icon name="spark" size={16} fill /> Ask HOWDI
      </button>
      <button type="button" className="v8rec-dismiss" onClick={onDismiss} aria-label="Dismiss recovery notice">
        ×
      </button>
    </div>
  );
}

export function RecoveryInlineBanner({ incident, onResume, onOpenPage, onDismiss }) {
  if (!incident) return null;
  const policy = incident.policy || recoveryRetryPolicy(incident);
  return (
    <div className="v8rec-inline" role="alert" data-testid="recovery-inline">
      <V8Icon name="alert" size={20} />
      <div className="v8rec-inline-copy">
        <b>{incident.preview ? "Recovery preview" : "We hit a snag"}</b>
        <p>{policy.message}</p>
        <small className="v8rec-ref">Reference: {incident.publicRef}</small>
      </div>
      <RecoveryActions incident={incident} onResume={onResume} onOpenPage={onOpenPage} onDismiss={onDismiss} />
    </div>
  );
}

export function RecoveryPage({ incident, onResume, onBack, onDismiss }) {
  if (!incident) return null;
  const policy = incident.policy || recoveryRetryPolicy(incident);
  const draft = incident.draftScope ? readInputDraft(incident.draftScope) : null;
  return (
    <main className="v8rec-page v8-page" data-testid="recovery-page">
      <header className="v8rec-page-head">
        <button type="button" className="v8-btn v8-btn-soft" onClick={onBack}>
          ← Back
        </button>
        <h1>Recovery &amp; support</h1>
      </header>
      {incident.preview ? (
        <p className="v8rec-preview-note" role="status">
          Preview mode — shows how HOWDI surfaces errors without exposing internal IDs.
        </p>
      ) : null}
      <section className="v8-card v8rec-panel">
        <h2>What happened</h2>
        <p>{incident.userMessage}</p>
        <dl className="v8rec-meta">
          <div><dt>Public reference</dt><dd>{incident.publicRef}</dd></div>
          {incident.requestId ? <div><dt>Request trace</dt><dd>{incident.requestId}</dd></div> : null}
          <div><dt>Area</dt><dd>{incident.pillar}{incident.surface ? ` · ${incident.surface}` : ""}</dd></div>
          {incident.sensitiveKind ? (
            <div><dt>Protected action</dt><dd>{incident.sensitiveKind} — no blind retry</dd></div>
          ) : null}
        </dl>
      </section>
      <section className="v8-card v8rec-panel">
        <h2>Safe next steps</h2>
        <p>{policy.message}</p>
        <RecoveryActions
          incident={incident}
          onResume={onResume}
          onOpenPage={() => {}}
          onDismiss={onDismiss}
        />
      </section>
      {draft ? (
        <section className="v8-card v8rec-panel">
          <h2>Preserved on this device</h2>
          <p className="v8-muted">Your draft is saved locally until you clear it or submit successfully.</p>
          <ul className="v8rec-draft-list">
            {Object.entries(draft).map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <code>{String(v).slice(0, 120)}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="v8-card v8rec-panel v8rec-handoff">
        <h2>Hand off to a person or Ask HOWDI</h2>
        <p>
          Share reference <strong>{incident.publicRef}</strong> with Help &amp; Support. Ask HOWDI can suggest
          next steps without repeating payments or orders.
        </p>
      </section>
    </main>
  );
}

export function RecoveryProvider({ children, onResumeAttempt }) {
  const [incident, setIncident] = useState(() => getLastRecoveryIncident());
  const [pageOpen, setPageOpen] = useState(false);

  useEffect(() => {
    const onReport = (e) => {
      const next = e?.detail?.incident;
      if (next) setIncident(next);
    };
    const onOpenPage = () => setPageOpen(true);
    window.addEventListener(RECOVERY_REPORT_EVENT, onReport);
    window.addEventListener(RECOVERY_OPEN_PAGE_EVENT, onOpenPage);
    try {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      if (path === RECOVERY_PREVIEW_PATH) {
        const inc = openRecoveryPreviewPage();
        setIncident(inc);
        setPageOpen(true);
      }
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener(RECOVERY_REPORT_EVENT, onReport);
      window.removeEventListener(RECOVERY_OPEN_PAGE_EVENT, onOpenPage);
    };
  }, []);

  const dismiss = useCallback(() => {
    setPageOpen(false);
    setIncident(null);
    clearRecoveryIncident();
  }, []);

  const openPage = useCallback(() => setPageOpen(true), []);

  const resume = useCallback(
    (inc) => {
      const policy = inc?.policy || recoveryRetryPolicy(inc);
      if (!policy.allowManualRetry && !policy.allowAutoRetry) return;
      onResumeAttempt?.(inc);
      setPageOpen(false);
      setIncident(null);
      clearRecoveryIncident();
    },
    [onResumeAttempt]
  );

  const showPreview = useCallback((openPageNow = true) => {
    const preview = buildPreviewRecoveryIncident();
    setIncident(preview);
    if (openPageNow) setPageOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      incident,
      pageOpen,
      dismiss,
      openPage,
      resume,
      showPreview,
      preserveDraft: saveInputDraft,
      readDraft: readInputDraft,
    }),
    [incident, pageOpen, dismiss, openPage, resume, showPreview]
  );

  return (
    <RecoveryContext.Provider value={value}>
      {children}
      {!pageOpen && incident ? (
        <RecoveryInlineBanner incident={incident} onResume={resume} onOpenPage={openPage} onDismiss={dismiss} />
      ) : null}
      {pageOpen && incident ? (
        <RecoveryPage incident={incident} onResume={resume} onBack={() => setPageOpen(false)} onDismiss={dismiss} />
      ) : null}
    </RecoveryContext.Provider>
  );
}

export { RECOVERY_HANDOFF_EVENT, RECOVERY_REPORT_EVENT };
