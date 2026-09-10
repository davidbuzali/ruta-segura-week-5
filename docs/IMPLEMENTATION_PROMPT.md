# Implementation prompt - Ruta Segura

Build **Ruta Segura**, a single-route Spanish-language web application for an operations lead who must decide whether a small synthetic healthcare-screening pilot is operationally safe to simulate. Use `docs/PACKET.md` as the source of truth.

The product is a procurement and capacity gate, not a symptom checker, diagnosis tool, referral directory, or patient application. All people, institutions, prices, evidence, and capacities must be invented and visibly labeled **DATOS SINTÉTICOS**.

## Product outcome

An operator completes a structured readiness questionnaire and records the source and verification time for each institutional commitment. Transparent rules return **DETENER PILOTO** whenever any required condition is missing, invalid, contradictory, or older than 72 hours. Only a complete, human-verified synthetic case may return **LISTO PARA SIMULACIÓN DEL PILOTO**; that state never authorizes live screening.

## Primary user and task

The exact user is Mariana, an operations lead preparing a small screening pilot in one Mexican public primary-care network.

Her primary task is to answer one question:

> ¿Existe hoy una ruta financiada, verificable y con capacidad suficiente para responder a cada resultado que este piloto podría generar?

The first viewport must expose the active case, the current STOP/readiness result, and the first unresolved condition. Do not place a marketing hero or generic dashboard before the working surface.

## Required structured signal

Implement a versioned readiness questionnaire with these six sections:

1. **Financiamiento**
   - Named purchaser or payer
   - Funding status
   - Funded cohort size
   - Funding evidence source
   - Human verifier
   - Verification timestamp
2. **Proveedor y ruta**
   - Authorized receiving provider
   - Eligibility rules confirmed
   - Required documents confirmed
   - Route evidence source
   - Human verifier
   - Verification timestamp
3. **Capacidad y navegación**
   - Named funded navigator
   - Navigator caseload limit
   - Reserved receiving slots
   - Expected pilot referrals
   - Backup or escalation owner
   - Capacity evidence source
   - Human verifier
   - Verification timestamp
4. **Precio del episodio**
   - Currency fixed to MXN
   - Complete episode price
   - Included components selected from an allowlist
   - Patient contribution fixed to MXN 0
   - Price evidence source
   - Human verifier
   - Verification timestamp
5. **Punto de cierre**
   - Defined diagnostic endpoint
   - Defined treatment endpoint
   - Evidence required to prove the endpoint
   - Explicit statement that attendance alone is not treatment completion
   - Endpoint evidence source
   - Human verifier
   - Verification timestamp
6. **Riesgo residual y continuidad**
   - Downstream care plan
   - Tail-risk guarantor
   - Maximum covered amount or explicit coverage rule
   - Escalation action when coverage is exceeded
   - Coverage evidence source
   - Human verifier
   - Verification timestamp

Every section must have a visible status independent of color: **Verificado**, **Faltante**, **Inválido**, **Desactualizado**, or **Contradictorio**.

## Deterministic gate rules

Keep the decision logic in a pure TypeScript module, separate from the interface.

Return **DETENER PILOTO** when any of these conditions is true:

- a named payer, provider, navigator, verifier, escalation owner, or tail-risk guarantor is absent;
- a required evidence source is absent;
- a verification timestamp is invalid, in the future, or more than 72 hours old;
- funded cohort size, navigator capacity, reserved slots, or complete episode price is zero or negative;
- reserved capacity is lower than expected referrals;
- navigator caseload would be exceeded by the proposed cohort;
- patient contribution is anything other than MXN 0;
- required episode components are not all included;
- diagnostic endpoint, treatment endpoint, or closure evidence is absent;
- attendance is treated as treatment completion;
- downstream care, tail-risk coverage, or the exceeded-coverage escalation is absent;
- two structured answers conflict.

Return **LISTO PARA SIMULACIÓN DEL PILOTO** only when all gate rules pass and the operator completes an explicit human confirmation. Display beside this state:

> Esta validación permite probar el flujo con datos sintéticos. No autoriza tamizaje ni atención de pacientes reales.

The gate must always fail closed: unknown, malformed, or unhandled states produce STOP, never readiness.

## Bounded simulated-LLM behavior

Add one action labeled **Generar resumen simulado con IA**.

The simulated LLM must:

- read only the normalized questionnaire result;
- summarize verified conditions;
- list each blocking condition using the gate rule's exact field identifiers;
- flag a seeded contradiction for human review;
- suggest a named next action and owner without changing the gate result;
- use deterministic templates so automated tests remain stable;
- show **SALIDA SIMULADA POR IA - REQUIERE REVISIÓN HUMANA** on the trigger, loading/result state, and every generated output.

The simulated LLM must never:

- diagnose, classify urgency, or interpret a patient result;
- invent a payer, price, provider, capacity, endpoint, or coverage promise;
- convert missing information into an assumption;
- change STOP to readiness;
- claim that an appointment, referral, or attendance proves completed care.

If the simulated summary conflicts with the rule result, the interface must preserve the rule result and display the conflict for human review.

## Small, testable features

1. Render two selectable invented cases: one blocked case and one structurally complete case awaiting human confirmation.
2. Render the six-section readiness checklist with evidence provenance, verifier, timestamp, and text status.
3. Let the operator edit controlled fields through bounded inputs and selects; do not accept document uploads or raw prompts.
4. Recalculate the deterministic decision immediately after a valid edit.
5. Explain every blocking rule in a decision panel and focus the first unresolved section when requested.
6. Generate the labeled simulated-LLM summary and contradiction flag without altering the rule result.
7. Let the operator assign a next action, owner, and bounded note to a blocking condition.
8. Record an in-session audit trail for field changes, validations, simulated-AI runs, and human confirmation.
9. Require explicit human confirmation before the complete synthetic case can become simulation-ready.
10. Preserve the shadow clause in visible copy: no screening starts and no patient result appears without a verified, funded route.

## Interface and visual direction

Use the generated mockup in `docs/assets/ruta-segura-mockup.png` as a hierarchy reference, not as a literal screenshot to reproduce.

Visual thesis: a serious operations checklist with the clarity of a flight-readiness board. Use deep navy and slate, cool white surfaces, teal only for verified states, amber for attention, and restrained red for STOP. The decision must be unmistakable without relying on color.

Requirements:

- Spanish interface copy written for an operations professional;
- body text at least 16 px and operational labels at least 14 px;
- clear keyboard focus and semantic form labels;
- touch targets large enough for tablet use;
- responsive layout that moves the decision panel above or immediately after the active section on narrow screens;
- reduced-motion support;
- no stock photography, marketing sections, decorative patient imagery, or score-like charts.

## Data and security boundaries

- Use invented in-repository fixtures only.
- Label every case and record as synthetic.
- Do not add authentication because the slice stores no personal information.
- Do not add a database, durable storage, uploads, external APIs, or environment secrets.
- Do not add free-form raw prompts.
- Bound names and evidence references to 120 characters and operator notes to 240 characters.
- Use allowlists for statuses, episode components, owners, and actions.
- Reject unsafe numeric values, invalid dates, future dates, and unrecognized states with visible errors.
- Keep `.env*`, Vercel metadata, logs, build output, and dependencies out of Git.

## Mechanical test cases

Automate the gate logic tests and document the interface checks.

1. Missing payer returns STOP and identifies `funding.payer`.
2. Missing evidence returns STOP for the affected section.
3. A verification exactly 72 hours old remains valid; anything older is stale.
4. A future verification timestamp returns STOP.
5. Zero or negative price, cohort, caseload, or capacity returns STOP.
6. Reserved slots below expected referrals return STOP.
7. Proposed navigator load above the caseload limit returns STOP.
8. Patient contribution above MXN 0 returns STOP.
9. Missing episode components return STOP.
10. Attendance used as the treatment endpoint returns STOP.
11. Missing downstream plan, guarantor, coverage rule, or escalation returns STOP.
12. A seeded contradiction returns STOP until a human resolves the structured values.
13. A complete but unconfirmed case remains STOP.
14. A complete and explicitly confirmed synthetic case returns simulation-ready with the non-deployment warning.
15. Simulated AI cannot change the deterministic result.
16. Unknown or malformed data fails closed.
17. Bounded inputs reject overlong text and invalid numbers with understandable messages.
18. The rendered page contains the synthetic-data label and contains no symptom, diagnosis, risk-score, or patient-result workflow.

After the first deployment, run the plan, document at least one genuine bug in `docs/TESTING.md`, fix it, rerun the tests, and redeploy.

## Persona test preparation

Capture the incomplete case, evidence edit, STOP explanation, simulated-AI summary, assigned next action, and complete synthetic case in order. Use the persona defined in `docs/PACKET.md` in a fresh conversation. Log every confusion in `docs/PERSONA.md`, rank each by potential harm, fix the worst one, and document the before/after evidence.

## Acceptance criteria

- The primary task and current decision are recognizable in the first viewport.
- Every displayed record is visibly synthetic.
- All six questionnaire sections expose provenance, verifier, and freshness.
- The deterministic rules are the sole authority for STOP/readiness.
- Every failure explains what is missing, why it blocks, and who acts next.
- No isolated patient result, diagnosis, urgency classification, or risk score exists.
- The simulated AI is labeled everywhere, is bounded to structured data, and cannot authorize anything.
- Readiness means course simulation only and carries the explicit non-deployment warning.
- Forms validate types, ranges, allowed values, dates, and lengths.
- Automated tests pass and the production build succeeds.
- The first Vercel URL works without authentication.
- The mechanical bug-fix cycle and persona usability fix are documented before the second deployment.

## Commit and deployment plan

1. **Complete:** `docs: establish Week 5 build packet`
2. **This step:** `docs: define implementation plan and acceptance criteria`
3. `feat: add readiness schema and fail-closed gate rules`
4. `feat: build the Ruta Segura operator workflow` - create **Vercel deployment 1** after this commit
5. `test: fix the mechanical-pass gate defect`
6. `fix: apply the highest-risk persona finding` - create **Vercel deployment 2** after this commit

Final submission documentation and PDF exports may use additional documentation commits. Never squash the required build history before grading.

## Definition of done for the coding phase

Stop only when the app builds, automated tests pass, the first deployed URL is reachable, the mechanical test has exposed and fixed a real defect, the persona test has produced and fixed one high-risk confusion, and the final Vercel deployment reflects those fixes. Preserve the full build conversation for `BUILDCHAT_davidbuzali.pdf`.
