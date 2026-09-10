# Ruta Segura - Week 5

Ruta Segura is a course prototype of a procurement and capacity gate for a small healthcare screening pilot in Mexico. It returns a transparent stop decision when the payer, provider, verified capacity, complete episode price, care endpoint, downstream plan, or tail-risk coverage is missing or stale.

The repository contains the approved packet, implementation prompt, typed fail-closed gate, and the first complete operator workflow. All product records are synthetic and remain in the browser session only.

## Current contents

- `docs/PACKET.md` - problem, user, success definition, generated mockup, Mermaid flows, benchmark, scope, architecture, and test plan.
- `docs/IMAGE_PROMPT.md` - the prompt used to generate the interface mockup.
- `DECISIONS.md` - session decisions and next move.
- `src/types.ts` - versioned six-section readiness schema.
- `src/gate.ts` - deterministic, fail-closed decision engine.
- `src/fixtures.ts` - invented blocked and complete demonstration cases.
- `tests/gate.test.ts` - automated safety-boundary tests.
- `src/App.tsx` - editable six-section operator workflow, decision panel, bounded simulated-AI summary, action assignment, confirmation, and audit trail.
- `src/simulatedAi.ts` - deterministic summary behavior that cannot change the gate decision.

All cases, organizations, prices, capacities, evidence, and AI outputs used in this course build are synthetic and labeled.
