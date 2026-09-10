import { createBlockedSyntheticCase } from "./fixtures.ts";
import { evaluateGate } from "./gate.ts";
import "./styles.css";

const example = createBlockedSyntheticCase();
const result = evaluateGate(example);

export default function App() {
  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand">Ruta Segura</span>
        <span className="synthetic-label">Datos sintéticos</span>
      </header>

      <section className="foundation" aria-labelledby="foundation-title">
        <p className="eyebrow">Base técnica - Commit 3</p>
        <h1 id="foundation-title">Compuerta de preparación del piloto</h1>
        <p>
          El modelo tipado y las reglas de detención ya están activos. El flujo operativo completo se
          construirá en el siguiente commit.
        </p>
        <div className="decision" data-decision={result.decision}>
          <strong>{result.decision === "stop" ? "DETENER PILOTO" : "LISTO PARA SIMULACIÓN"}</strong>
          <span>{result.issues.length} condiciones requieren atención en el caso de prueba.</span>
        </div>
      </section>
    </main>
  );
}
