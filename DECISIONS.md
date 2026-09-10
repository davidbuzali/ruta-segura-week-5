# Decision log

## 2026-09-10 - Packet session

- Chose **Ruta Segura** as the working name for David's Week 5 procurement and capacity gate.
- Defined the exact user as a public primary-care operations lead preparing a small screening pilot.
- Kept the STOP decision deterministic and auditable; the simulated LLM only summarizes verified structured inputs and flags possible contradictions.
- Used the structured readiness questionnaire and its 72-hour verification cadence as the required signal.
- Preserved David's dissent by requiring downstream and tail-risk coverage before the course simulation may appear ready.
- Selected Unite Us as the strongest relevant closed-loop referral benchmark, while localizing the slice to a pre-screening finance-and-capacity gate for Mexico.
- Kept all cases, organizations, prices, capacities, evidence, and AI outputs invented and labeled.
- Confirmed that the app will be deployed through Vercel.
- Kept Week 5 separate from the existing Week 2 repository and from the cuaderno's commit history.

### Tomorrow's first move

Review and approve the packet's exact user, success definition, six required gate sections, and benchmark. After approval, turn the packet into `docs/IMPLEMENTATION_PROMPT.md` before writing product code.

## 2026-09-10 - Implementation prompt session

- Treated the packet as approved after David confirmed the first step and asked to continue.
- Translated the six packet sections into explicit fields and fail-closed rules.
- Kept the deterministic TypeScript gate as the sole decision authority; simulated AI may summarize and flag contradictions only.
- Defined readiness as permission for a synthetic course simulation, never live screening.
- Expanded the history to six planned commits so the packet, implementation prompt, core logic, first deployment, mechanical fix, and persona fix remain visible.
- Confirmed two Vercel deployments: the first after the working operator flow and the second after mechanical and persona fixes.

### Tomorrow's first move

Scaffold the smallest Vercel-ready React and TypeScript application, then implement the typed readiness schema and pure fail-closed gate rules with automated tests before building the interface.

## 2026-09-10 - Typed gate foundation

- Selected a static Vite, React, and TypeScript application for simple Vercel deployment without a server or secrets.
- Modeled the six readiness sections separately so each can expose evidence, verifier, freshness, and a text status.
- Implemented the gate as a pure function accepting unknown input so malformed runtime data fails closed.
- Defined evidence as current through exactly 72 hours; future timestamps and anything older are invalid or stale.
- Required the full care episode, zero patient contribution, downstream plan, tail-risk guarantor, and exceeded-coverage escalation.
- Added blocked and complete invented fixtures without any real personal or clinical data.
- Kept the commit's interface minimal so the working operator flow remains a distinct, reviewable change.

### Tomorrow's first move

Build the six-section operator workflow around the tested gate, add bounded editing and issue-focused navigation, then create Vercel deployment 1.

## 2026-09-10 - Working operator flow

- Built one working surface rather than a marketing page; the active case, STOP/readiness result, and first unresolved condition appear immediately.
- Used two invented fixtures so the demonstration can show both an unsafe configuration and a structurally complete case awaiting human confirmation.
- Kept editing bounded to typed fields, allowlisted selects, checkboxes, and length-limited notes; there is no upload or raw prompt.
- Added a deterministic simulated-AI summary that mirrors exact blocker identifiers, flags contradictions, and cannot change the rule result.
- Added an in-session next-action assignment and audit trail without persistent storage.
- Required explicit human confirmation after every structural issue is resolved.
- Preserved the shadow clause in the working interface and kept attendance distinct from treatment closure.

### Tomorrow's first move

Run the documented mechanical pass against Vercel deployment 1, capture the first genuine defect, fix it with a regression test, and redeploy in a separate commit.
