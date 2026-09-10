import { createEngineBootstrap } from "../engine";
import "./App.css";

const bootstrap = createEngineBootstrap();

export function App() {
  return (
    <main className="foundation-shell">
      <header className="foundation-header">
        <p className="eyebrow">M00 FOUNDATION</p>
        <h1>Joint Liability</h1>
        <p className="lede">
          Two bodies. One nervous system. An implementation boundary ready for
          the first fight.
        </p>
      </header>

      <section className="status-card" aria-labelledby="status-heading">
        <p className="eyebrow">BUILD STATUS</p>
        <h2 id="status-heading">The foundation is in place.</h2>
        <p>
          This shell confirms that the browser build and rendering-independent
          engine boundary are connected. Combat systems are intentionally not
          included in M00.
        </p>
        <dl className="version-grid">
          <div>
            <dt>Engine</dt>
            <dd>{bootstrap.engineVersion}</dd>
          </div>
          <div>
            <dt>Content</dt>
            <dd>{bootstrap.contentVersion}</dd>
          </div>
          <div>
            <dt>Phase</dt>
            <dd>{bootstrap.phase}</dd>
          </div>
        </dl>
      </section>

      <footer className="foundation-footer">
        <span>Design snapshot: docs/DESIGN.md</span>
        <span>Next eligible milestone: M01 — content schemas</span>
      </footer>
    </main>
  );
}
