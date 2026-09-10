import { useMemo, useRef, useState, type FormEvent } from "react";
import { createBlockedSyntheticCase, createCompleteSyntheticCase } from "./fixtures.ts";
import { evaluateGate } from "./gate.ts";
import { generateSimulatedAiSummary, type SimulatedAiSummary } from "./simulatedAi.ts";
import {
  MAX_NOTE_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  REQUIRED_EPISODE_COMPONENTS,
  type EvidenceRecord,
  type PilotCase,
  type SectionStatus,
} from "./types.ts";
import "./styles.css";

type EditableSection = "funding" | "route" | "capacity" | "pricing" | "endpoint" | "continuity";
type AiState = "idle" | "loading" | "ready";

interface AuditEvent {
  id: number;
  time: string;
  message: string;
}

interface AssignedAction {
  owner: string;
  action: string;
  note: string;
}

const SECTION_DEFINITIONS: Array<{
  id: EditableSection;
  number: string;
  title: string;
  description: string;
}> = [
  { id: "funding", number: "01", title: "Financiamiento", description: "Comprador, compromiso y cohorte financiada" },
  { id: "route", number: "02", title: "Proveedor y ruta", description: "Receptor autorizado, elegibilidad y documentos" },
  { id: "capacity", number: "03", title: "Capacidad y navegación", description: "Navegador, carga, espacios y escalamiento" },
  { id: "pricing", number: "04", title: "Precio del episodio", description: "Cobertura completa y costo cero al paciente" },
  { id: "endpoint", number: "05", title: "Punto de cierre", description: "Diagnóstico, tratamiento y evidencia de cierre" },
  { id: "continuity", number: "06", title: "Riesgo residual", description: "Continuidad, garante y regla de cobertura" },
];

const STATUS_LABELS: Record<SectionStatus, string> = {
  verified: "Verificado",
  missing: "Faltante",
  invalid: "Inválido",
  stale: "Desactualizado",
  contradictory: "Contradictorio",
};

const COMPONENT_LABELS: Record<(typeof REQUIRED_EPISODE_COMPONENTS)[number], string> = {
  diagnostic_confirmation: "Confirmación diagnóstica",
  specialist_review: "Revisión por especialista",
  indicated_treatment: "Tratamiento indicado",
  clinical_monitoring: "Monitoreo clínico",
};

const OWNER_OPTIONS = ["Finanzas", "Compras", "Operaciones clínicas", "Coordinación del piloto", "Comité financiador"];
const ACTION_OPTIONS = ["Solicitar evidencia", "Corregir registro", "Reservar capacidad", "Renegociar cobertura", "Escalar al comité"];

function createInitialCases(now: Date) {
  const blocked = createBlockedSyntheticCase(now);
  const complete = createCompleteSyntheticCase(now);
  complete.humanConfirmed = false;
  return { [blocked.id]: blocked, [complete.id]: complete };
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha válida";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function toDateTimeLocal(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function TextField({ label, value, onChange, onBlur, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="text" value={value} maxLength={MAX_SHORT_TEXT_LENGTH} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} />
      <small>{value.length}/{MAX_SHORT_TEXT_LENGTH}</small>
    </label>
  );
}

function NumberField({ label, value, onChange, onBlur, min }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  min?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={Number.isFinite(value) ? value : ""} min={min} step="1" onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))} onBlur={onBlur} />
    </label>
  );
}

function EvidenceFields({ evidence, onChange, onCommit }: {
  evidence: EvidenceRecord;
  onChange: (patch: Partial<EvidenceRecord>) => void;
  onCommit: (label: string) => void;
}) {
  return (
    <fieldset className="evidence-fields">
      <legend>Evidencia y vigencia</legend>
      <TextField label="Fuente o referencia" value={evidence.source} onChange={(source) => onChange({ source })} onBlur={() => onCommit("Fuente de evidencia")} placeholder="Ej. Convenio sintético FP-01" />
      <TextField label="Verificado por" value={evidence.verifier} onChange={(verifier) => onChange({ verifier })} onBlur={() => onCommit("Persona verificadora")} />
      <label className="field">
        <span>Fecha y hora de verificación</span>
        <input type="datetime-local" value={toDateTimeLocal(evidence.verifiedAt)} onChange={(event) => onChange({ verifiedAt: fromDateTimeLocal(event.target.value) })} onBlur={() => onCommit("Fecha de verificación")} />
      </label>
    </fieldset>
  );
}

export default function App() {
  const evaluationTime = useRef(new Date());
  const eventSequence = useRef(2);
  const aiRequestSequence = useRef(0);
  const [cases, setCases] = useState<Record<string, PilotCase>>(() => createInitialCases(evaluationTime.current));
  const [activeCaseId, setActiveCaseId] = useState("SYN-CDMX-STOP-001");
  const [activeSection, setActiveSection] = useState<EditableSection>("funding");
  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiSummary, setAiSummary] = useState<SimulatedAiSummary | null>(null);
  const [owner, setOwner] = useState(OWNER_OPTIONS[0]);
  const [action, setAction] = useState(ACTION_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [assignedAction, setAssignedAction] = useState<AssignedAction | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([
    { id: 1, time: new Date().toISOString(), message: "Caso sintético abierto para revisión." },
  ]);

  const pilot = cases[activeCaseId];
  const result = useMemo(() => evaluateGate(pilot, evaluationTime.current), [pilot]);
  const structuralIssues = result.issues.filter((issue) => issue.field !== "humanConfirmed");
  const activeDefinition = SECTION_DEFINITIONS.find((section) => section.id === activeSection)!;

  function addAudit(message: string) {
    const nextEvent = { id: eventSequence.current++, time: new Date().toISOString(), message };
    setAudit((current) => [nextEvent, ...current].slice(0, 12));
  }

  function invalidateAiOutput() {
    aiRequestSequence.current += 1;
    setAiState("idle");
    setAiSummary(null);
  }

  function resetDerivedState() {
    invalidateAiOutput();
    setAssignedAction(null);
    setActionError("");
  }

  function updateSection<S extends EditableSection>(section: S, patch: Partial<PilotCase[S]>) {
    setCases((currentCases) => {
      const current = currentCases[activeCaseId];
      const updatedSection = { ...current[section], ...patch };
      return { ...currentCases, [activeCaseId]: { ...current, [section]: updatedSection, humanConfirmed: false } as PilotCase };
    });
    invalidateAiOutput();
  }

  function updateEvidence(section: EditableSection, patch: Partial<EvidenceRecord>) {
    setCases((currentCases) => {
      const current = currentCases[activeCaseId];
      const sectionValue = current[section];
      return {
        ...currentCases,
        [activeCaseId]: { ...current, [section]: { ...sectionValue, evidence: { ...sectionValue.evidence, ...patch } }, humanConfirmed: false } as PilotCase,
      };
    });
    invalidateAiOutput();
  }

  function commitField(label: string) {
    addAudit(`${label} actualizado; la confirmación humana se reinició.`);
  }

  function changeCase(caseId: string) {
    setActiveCaseId(caseId);
    const nextResult = evaluateGate(cases[caseId], evaluationTime.current);
    const firstEditable = nextResult.issues.find((issue) => SECTION_DEFINITIONS.some((section) => section.id === issue.section));
    setActiveSection((firstEditable?.section as EditableSection | undefined) ?? "funding");
    resetDerivedState();
    addAudit(`Caso activo cambiado a ${cases[caseId].name}.`);
  }

  function openFirstIssue() {
    const issue = result.issues.find((item) => SECTION_DEFINITIONS.some((section) => section.id === item.section));
    if (issue) setActiveSection(issue.section as EditableSection);
    document.getElementById("section-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function runSimulatedAi() {
    const requestId = ++aiRequestSequence.current;
    setAiState("loading");
    setAiSummary(null);
    window.setTimeout(() => {
      if (aiRequestSequence.current !== requestId) return;
      setAiSummary(generateSimulatedAiSummary(result));
      setAiState("ready");
      addAudit("Resumen simulado con IA generado para revisión humana.");
    }, 450);
  }

  function resolveContradiction() {
    setCases((currentCases) => ({
      ...currentCases,
      [activeCaseId]: { ...currentCases[activeCaseId], contradictions: [], humanConfirmed: false },
    }));
    resetDerivedState();
    addAudit("Discrepancia marcada como revisada; aún deben corregirse los valores estructurados.");
  }

  function assignNextAction(event: FormEvent) {
    event.preventDefault();
    if (!owner || !action || note.trim().length === 0) {
      setActionError("Selecciona responsable y acción, y escribe una nota breve.");
      return;
    }
    setAssignedAction({ owner, action, note: note.trim() });
    setActionError("");
    addAudit(`Siguiente acción asignada a ${owner}: ${action}.`);
  }

  function toggleHumanConfirmation(confirmed: boolean) {
    setCases((currentCases) => ({
      ...currentCases,
      [activeCaseId]: { ...currentCases[activeCaseId], humanConfirmed: confirmed },
    }));
    invalidateAiOutput();
    addAudit(confirmed ? "Confirmación humana registrada." : "Confirmación humana retirada.");
  }

  function renderEditor() {
    const evidenceProps = {
      evidence: pilot[activeSection].evidence,
      onChange: (patch: Partial<EvidenceRecord>) => updateEvidence(activeSection, patch),
      onCommit: commitField,
    };

    switch (activeSection) {
      case "funding":
        return <>
          <div className="form-grid">
            <TextField label="Comprador o financiador" value={pilot.funding.payer} onChange={(payer) => updateSection("funding", { payer })} onBlur={() => commitField("Financiador")} />
            <label className="field"><span>Estado del financiamiento</span><select value={pilot.funding.fundingStatus} onChange={(event) => { updateSection("funding", { fundingStatus: event.target.value as PilotCase["funding"]["fundingStatus"] }); commitField("Estado del financiamiento"); }}><option value="committed">Comprometido</option><option value="pending">Pendiente</option><option value="absent">Ausente</option></select></label>
            <NumberField label="Cohorte financiada" value={pilot.funding.fundedCohortSize} min={1} onChange={(fundedCohortSize) => updateSection("funding", { fundedCohortSize })} onBlur={() => commitField("Cohorte financiada")} />
          </div>
          <EvidenceFields {...evidenceProps} />
        </>;
      case "route":
        return <>
          <div className="form-grid"><TextField label="Proveedor receptor" value={pilot.route.provider} onChange={(provider) => updateSection("route", { provider })} onBlur={() => commitField("Proveedor receptor")} /></div>
          <div className="check-grid">
            <label className="check-row"><input type="checkbox" checked={pilot.route.authorizedReceiver} onChange={(event) => { updateSection("route", { authorizedReceiver: event.target.checked }); commitField("Receptor autorizado"); }} /><span>Receptor autorizado</span></label>
            <label className="check-row"><input type="checkbox" checked={pilot.route.eligibilityConfirmed} onChange={(event) => { updateSection("route", { eligibilityConfirmed: event.target.checked }); commitField("Elegibilidad confirmada"); }} /><span>Elegibilidad confirmada</span></label>
            <label className="check-row"><input type="checkbox" checked={pilot.route.documentsConfirmed} onChange={(event) => { updateSection("route", { documentsConfirmed: event.target.checked }); commitField("Documentos confirmados"); }} /><span>Documentos confirmados</span></label>
          </div>
          <EvidenceFields {...evidenceProps} />
        </>;
      case "capacity":
        return <>
          <div className="form-grid">
            <TextField label="Navegador financiado" value={pilot.capacity.navigator} onChange={(navigator) => updateSection("capacity", { navigator })} onBlur={() => commitField("Navegador")} />
            <TextField label="Responsable de escalamiento" value={pilot.capacity.escalationOwner} onChange={(escalationOwner) => updateSection("capacity", { escalationOwner })} onBlur={() => commitField("Responsable de escalamiento")} />
            <NumberField label="Límite de casos" value={pilot.capacity.navigatorCaseloadLimit} min={1} onChange={(navigatorCaseloadLimit) => updateSection("capacity", { navigatorCaseloadLimit })} onBlur={() => commitField("Límite de casos")} />
            <NumberField label="Carga actual" value={pilot.capacity.currentNavigatorLoad} min={0} onChange={(currentNavigatorLoad) => updateSection("capacity", { currentNavigatorLoad })} onBlur={() => commitField("Carga actual")} />
            <NumberField label="Espacios reservados" value={pilot.capacity.reservedSlots} min={1} onChange={(reservedSlots) => updateSection("capacity", { reservedSlots })} onBlur={() => commitField("Espacios reservados")} />
            <NumberField label="Referencias esperadas" value={pilot.capacity.expectedReferrals} min={1} onChange={(expectedReferrals) => updateSection("capacity", { expectedReferrals })} onBlur={() => commitField("Referencias esperadas")} />
          </div>
          <EvidenceFields {...evidenceProps} />
        </>;
      case "pricing":
        return <>
          <div className="form-grid">
            <label className="field"><span>Moneda</span><input value="MXN" disabled /></label>
            <NumberField label="Precio completo del episodio" value={pilot.pricing.completeEpisodePrice} min={1} onChange={(completeEpisodePrice) => updateSection("pricing", { completeEpisodePrice })} onBlur={() => commitField("Precio completo")} />
            <NumberField label="Aportación del paciente" value={pilot.pricing.patientContribution} min={0} onChange={(patientContribution) => updateSection("pricing", { patientContribution })} onBlur={() => commitField("Aportación del paciente")} />
          </div>
          <fieldset className="component-list"><legend>Componentes incluidos</legend>{REQUIRED_EPISODE_COMPONENTS.map((component) => <label className="check-row" key={component}><input type="checkbox" checked={pilot.pricing.includedComponents.includes(component)} onChange={(event) => { const includedComponents = event.target.checked ? [...pilot.pricing.includedComponents, component] : pilot.pricing.includedComponents.filter((item) => item !== component); updateSection("pricing", { includedComponents }); commitField(COMPONENT_LABELS[component]); }} /><span>{COMPONENT_LABELS[component]}</span></label>)}</fieldset>
          <EvidenceFields {...evidenceProps} />
        </>;
      case "endpoint":
        return <>
          <div className="form-grid">
            <TextField label="Punto de cierre diagnóstico" value={pilot.endpoint.diagnosticEndpoint} onChange={(diagnosticEndpoint) => updateSection("endpoint", { diagnosticEndpoint })} onBlur={() => commitField("Cierre diagnóstico")} />
            <TextField label="Punto de cierre de tratamiento" value={pilot.endpoint.treatmentEndpoint} onChange={(treatmentEndpoint) => updateSection("endpoint", { treatmentEndpoint })} onBlur={() => commitField("Cierre de tratamiento")} />
            <TextField label="Evidencia que demuestra cierre" value={pilot.endpoint.closureEvidence} onChange={(closureEvidence) => updateSection("endpoint", { closureEvidence })} onBlur={() => commitField("Evidencia de cierre")} />
          </div>
          <label className="check-row warning-check"><input type="checkbox" checked={pilot.endpoint.attendanceOnly} onChange={(event) => { updateSection("endpoint", { attendanceOnly: event.target.checked }); commitField("Criterio de asistencia"); }} /><span>El registro solo demuestra asistencia a una cita (esto bloquea el piloto)</span></label>
          <EvidenceFields {...evidenceProps} />
        </>;
      case "continuity":
        return <>
          <div className="form-grid">
            <TextField label="Plan de atención posterior" value={pilot.continuity.downstreamPlan} onChange={(downstreamPlan) => updateSection("continuity", { downstreamPlan })} onBlur={() => commitField("Plan posterior")} />
            <TextField label="Garante de riesgo residual" value={pilot.continuity.tailRiskGuarantor} onChange={(tailRiskGuarantor) => updateSection("continuity", { tailRiskGuarantor })} onBlur={() => commitField("Garante residual")} />
            <TextField label="Regla o límite de cobertura" value={pilot.continuity.coverageRule} onChange={(coverageRule) => updateSection("continuity", { coverageRule })} onBlur={() => commitField("Regla de cobertura")} />
            <TextField label="Acción si la cobertura se excede" value={pilot.continuity.escalationAction} onChange={(escalationAction) => updateSection("continuity", { escalationAction })} onBlur={() => commitField("Acción de escalamiento")} />
          </div>
          <EvidenceFields {...evidenceProps} />
        </>;
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><span className="brand">Ruta Segura</span><span className="product-context">Compuerta previa al piloto</span></div>
        <span className="synthetic-label">Datos sintéticos</span>
      </header>

      <section className="case-toolbar" aria-label="Caso activo">
        <div><p className="eyebrow">Preparación del piloto</p><h1>¿La ruta completa existe hoy?</h1><p className="lead">Verifica compromisos financiados y capacidad antes de permitir cualquier simulación.</p></div>
        <label className="case-picker"><span>Caso de práctica</span><select value={activeCaseId} onChange={(event) => changeCase(event.target.value)}>{Object.values(cases).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><small>{pilot.id} · Expediente inventado</small></label>
      </section>

      <aside className="shadow-clause"><strong>Cláusula sombra · Ningún resultado queda varado</strong><span>Sin ruta financiada, capacidad vigente y continuidad cubierta, el tamizaje no comienza.</span></aside>

      <div className="workspace">
        <section className="checklist-column" aria-labelledby="checklist-title">
          <div className="section-heading"><div><p className="eyebrow">Seis condiciones obligatorias</p><h2 id="checklist-title">Lista de preparación</h2></div><span className="freshness-key">Vigencia máxima: 72 h</span></div>
          <div className="section-list">
            {SECTION_DEFINITIONS.map((section) => {
              const status = result.sectionStatuses[section.id];
              const evidence = pilot[section.id].evidence;
              const issueCount = result.issues.filter((issue) => issue.section === section.id).length;
              return <button type="button" className={`section-card ${activeSection === section.id ? "is-active" : ""}`} aria-pressed={activeSection === section.id} onClick={() => setActiveSection(section.id)} key={section.id}><span className="section-number">{section.number}</span><span className="section-copy"><strong>{section.title}</strong><small>{section.description}</small><small className="evidence-line">{evidence.source || "Sin fuente"} · {formatTimestamp(evidence.verifiedAt)}</small></span><span className={`status-pill status-${status}`}>{STATUS_LABELS[status]}{issueCount > 0 ? ` · ${issueCount}` : ""}</span></button>;
            })}
          </div>
          <section className="editor-card" id="section-editor" aria-labelledby="editor-title">
            <div className="editor-heading"><span className="section-number">{activeDefinition.number}</span><div><p className="eyebrow">Editar condición</p><h2 id="editor-title">{activeDefinition.title}</h2></div><span className={`status-pill status-${result.sectionStatuses[activeSection]}`}>{STATUS_LABELS[result.sectionStatuses[activeSection]]}</span></div>
            {renderEditor()}
          </section>
        </section>

        <aside className="decision-column" aria-label="Decisión y acciones">
          <section className={`decision-card decision-${result.decision}`} aria-live="polite">
            <p className="eyebrow">Decisión de arranque</p><h2>{result.decision === "stop" ? "DETENER PILOTO" : "LISTO PARA SIMULACIÓN"}</h2><p className="decision-warning">{result.warning}</p>
            {result.issues.length > 0 ? <ol className="issue-list">{result.issues.slice(0, 5).map((issue) => <li key={`${issue.field}-${issue.code}`}><strong>{issue.field}</strong><span>{issue.message}</span></li>)}</ol> : <p className="all-clear">Todas las condiciones pasaron las reglas transparentes.</p>}
            {result.issues.length > 5 && <p className="more-issues">+ {result.issues.length - 5} condiciones adicionales</p>}
            <button type="button" className="primary-button" onClick={openFirstIssue} disabled={structuralIssues.length === 0}>Revisar primera condición</button>
          </section>

          {pilot.contradictions.length > 0 && <section className="conflict-card"><strong>Discrepancia estructurada</strong><p>{pilot.contradictions[0]}</p><button type="button" className="text-button" onClick={resolveContradiction}>Marcar revisión humana</button></section>}

          <section className="ai-card">
            <p className="ai-label">Salida simulada por IA · Requiere revisión humana</p>
            {aiState === "idle" && <p>Resume únicamente los campos estructurados. No verifica evidencia ni modifica la decisión.</p>}
            {aiState === "loading" && <p role="status">Salida simulada por IA en preparación…</p>}
            {aiState === "ready" && aiSummary && <div className="ai-result"><strong>{aiSummary.title}</strong>{aiSummary.verifiedSections.length > 0 && <p>Verificado: {aiSummary.verifiedSections.join(", ")}.</p>}{aiSummary.conflictNotice && <p className="conflict-text">{aiSummary.conflictNotice}</p>}<p><b>Siguiente acción:</b> {aiSummary.nextAction}</p><p><b>Responsable sugerido:</b> {aiSummary.owner}</p><small>{aiSummary.disclaimer}</small></div>}
            <button type="button" className="secondary-button" onClick={runSimulatedAi} disabled={aiState === "loading"}>Generar resumen simulado con IA</button>
          </section>

          <form className="action-card" onSubmit={assignNextAction}>
            <h3>Asignar siguiente acción</h3>
            <label className="field"><span>Responsable</span><select value={owner} onChange={(event) => setOwner(event.target.value)}>{OWNER_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field"><span>Acción</span><select value={action} onChange={(event) => setAction(event.target.value)}>{ACTION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field"><span>Nota breve</span><textarea value={note} maxLength={MAX_NOTE_LENGTH} onChange={(event) => setNote(event.target.value)} placeholder="Qué debe verificarse antes de reevaluar" /><small>{note.length}/{MAX_NOTE_LENGTH}</small></label>
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <button type="submit" className="secondary-button">Guardar acción</button>
            {assignedAction && <p className="assigned-action"><strong>{assignedAction.action}</strong> · {assignedAction.owner}<br />{assignedAction.note}</p>}
          </form>

          <section className="confirmation-card"><label className="check-row"><input type="checkbox" checked={pilot.humanConfirmed} disabled={structuralIssues.length > 0} onChange={(event) => toggleHumanConfirmation(event.target.checked)} /><span>Confirmo que revisé las seis condiciones y su evidencia.</span></label>{structuralIssues.length > 0 && <small>Resuelve {structuralIssues.length} condiciones estructurales antes de confirmar.</small>}</section>
        </aside>
      </div>

      <section className="audit-card" aria-labelledby="audit-title"><div className="section-heading"><div><p className="eyebrow">Trazabilidad local</p><h2 id="audit-title">Registro de esta sesión</h2></div><span>No se guarda al cerrar la pestaña</span></div><ol>{audit.map((event) => <li key={event.id}><time>{formatTimestamp(event.time)}</time><span>{event.message}</span></li>)}</ol></section>
    </main>
  );
}
