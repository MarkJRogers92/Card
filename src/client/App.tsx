import { useEffect, useMemo, useState } from "react";
import {
  M10_CLAIMS_ADJUSTER_ID,
  M10_MORROW_ID,
  M10_SWITCH_ID,
  M19_NODE_IDS,
  M19_TEST_ACT_REWARD_CATALOG,
  advanceRunNode,
  applyM10Command,
  applyM19Command,
  beginRunNode,
  claimRewardOption,
  createM10Fight,
  createM10RewardFixture,
  createM19Run,
  currentRunNode,
  exportSave,
  getM10Hand,
  getM19Hand,
  hashAuthoritativeState,
  hashM10Fight,
  importSave,
  projectSelectedEnemyIntents,
  restRunCharacter,
  skipCardReward,
  completeRunCombat,
  type AuthoritativeState,
  type M10Command,
  type M19Command,
} from "../engine";
import { openIndexedDbSaveStore, type SaveStore } from "../platform";
import "./App.css";

function actorLabel(actorId: string): string {
  if (actorId === M10_MORROW_ID) return "Morrow";
  if (actorId === M10_SWITCH_ID) return "Switch";
  if (actorId === M10_CLAIMS_ADJUSTER_ID) return "Claims Adjuster";
  return actorId;
}

function positionLabel(
  actorId: string,
  frontCharacterId: string | null,
): "FRONT" | "RESERVE" {
  return actorId === frontCharacterId ? "FRONT" : "RESERVE";
}

function createInitialState(): AuthoritativeState {
  return new URLSearchParams(window.location.search).get("fixture") === "m18"
    ? createM10RewardFixture()
    : createM10Fight();
}

export function App() {
  const fixture = useMemo(
    () => new URLSearchParams(window.location.search).get("fixture"),
    [],
  );
  if (fixture === "m20") return <M19TestAct showSavePanel />;
  if (fixture === "m21") return <M19TestAct showStorePanel />;
  return fixture === "m19" ? <M19TestAct /> : <M10Checkpoint />;
}

function M10Checkpoint() {
  const [state, setState] = useState<AuthoritativeState>(createInitialState);
  const [commands, setCommands] = useState<readonly M10Command[]>([]);
  const [selectedTarget, setSelectedTarget] = useState(M10_CLAIMS_ADJUSTER_ID);
  const [error, setError] = useState<string | null>(null);

  const combat = state.combat;
  const hash = useMemo(() => hashM10Fight(state), [state]);
  if (combat === null) {
    return <main className="combat-shell">Combat state unavailable.</main>;
  }

  const active = combat.outcome === "active";
  const hand = active ? getM10Hand(state) : [];
  const intents = active ? projectSelectedEnemyIntents(state) : [];
  const currentIntent = intents[0] ?? null;
  const morrow = combat.actors[M10_MORROW_ID];
  const switchActor = combat.actors[M10_SWITCH_ID];
  const enemy = combat.actors[M10_CLAIMS_ADJUSTER_ID];

  function commit(command: M10Command): void {
    try {
      const result = applyM10Command(state, command);
      setState(result.state);
      setCommands((current) => [...current, command]);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function restart(): void {
    setState(createInitialState());
    setCommands([]);
    setSelectedTarget(M10_CLAIMS_ADJUSTER_ID);
    setError(null);
  }

  function claimReward(transactionId: string, optionId: string): void {
    try {
      setState(claimRewardOption(state, transactionId, optionId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function skipReward(transactionId: string): void {
    try {
      setState(skipCardReward(state, transactionId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const imprint = combat.imprint;
  const imprintText =
    imprint === null
      ? "No Imprint"
      : `${imprint.ingredient.id.toUpperCase()} P${imprint.potency} · ${actorLabel(imprint.ownerCharacterId)}`;

  return (
    <main className="combat-shell">
      <header className="combat-header">
        <div>
          <p className="eyebrow">M10 PLAYABLE CHECKPOINT</p>
          <h1>Joint Liability</h1>
        </div>
        <div className="header-actions">
          <span className="turn-pill" data-testid="turn-number">
            Turn {combat.turnNumber}
          </span>
          <button className="secondary-button" type="button" onClick={restart}>
            Restart
          </button>
        </div>
      </header>

      <section className="battlefield" aria-label="Combatants">
        <article className={`fighter ${combat.frontCharacterId === M10_MORROW_ID ? "front" : "reserve"}`}>
          <div className="fighter-topline">
            <span>{positionLabel(M10_MORROW_ID, combat.frontCharacterId)}</span>
            <span>Source</span>
          </div>
          <h2>Morrow</h2>
          <p className="vital" data-testid="morrow-hp">
            {morrow?.hp ?? 0}/{morrow?.maxHp ?? 0} HP
          </p>
          <p className="block-readout">{morrow?.block ?? 0} Block</p>
        </article>

        <div className="imprint-panel" aria-label="Shared Imprint">
          <span>Shared Imprint</span>
          <strong data-testid="imprint">{imprintText}</strong>
        </div>

        <article className={`fighter ${combat.frontCharacterId === M10_SWITCH_ID ? "front" : "reserve"}`}>
          <div className="fighter-topline">
            <span>{positionLabel(M10_SWITCH_ID, combat.frontCharacterId)}</span>
            <span>Shaper</span>
          </div>
          <h2>Switch</h2>
          <p className="vital" data-testid="switch-hp">
            {switchActor?.hp ?? 0}/{switchActor?.maxHp ?? 0} HP
          </p>
          <p className="block-readout">{switchActor?.block ?? 0} Block</p>
        </article>

        <button
          type="button"
          className={`enemy-card ${selectedTarget === M10_CLAIMS_ADJUSTER_ID ? "selected" : ""}`}
          aria-pressed={selectedTarget === M10_CLAIMS_ADJUSTER_ID}
          onClick={() => setSelectedTarget(M10_CLAIMS_ADJUSTER_ID)}
          data-testid="enemy-target"
          disabled={!active}
        >
          <span className="enemy-label">TARGET</span>
          <strong>Claims Adjuster</strong>
          <span data-testid="enemy-hp">
            {enemy?.hp ?? 0}/{enemy?.maxHp ?? 0} HP · {enemy?.block ?? 0} Block
          </span>
          <span className="intent" data-testid="enemy-intent">
            {currentIntent === null
              ? combat.outcome === "victory"
                ? "Claim denied permanently."
                : "No intent"
              : `${currentIntent.label} · ${currentIntent.target.kind.toUpperCase()}`}
          </span>
        </button>
      </section>

      <section className="command-bar" aria-label="Player controls">
        <div className="resource-strip">
          <div>
            <span>Energy</span>
            <strong data-testid="energy">{combat.energy}</strong>
          </div>
          <div>
            <span>Phase</span>
            <strong>{combat.phase}</strong>
          </div>
          <div>
            <span>Outcome</span>
            <strong data-testid="outcome">{combat.outcome}</strong>
          </div>
          <div>
            <span>Scrap</span>
            <strong data-testid="scrap">{state.rewards.scrap}</strong>
          </div>
        </div>

        <div className="primary-controls">
          <button
            type="button"
            className="swap-button"
            disabled={!active || combat.phase !== "player"}
            onClick={() => commit({ kind: "swap" })}
            data-testid="swap"
          >
            Swap
            <small>
              {combat.manualSwapsUsedThisTurn === 0 ? "Free" : "1 Energy"}
            </small>
          </button>
          <button
            type="button"
            className="end-turn-button"
            disabled={!active || combat.phase !== "player"}
            onClick={() => commit({ kind: "end_turn" })}
            data-testid="end-turn"
          >
            End Turn
          </button>
        </div>
      </section>

      {state.rewards.pending !== null && (
        <section className="reward-panel" data-testid="reward-panel" aria-label="Combat reward">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SALVAGE CLAIM</p>
              <h2>Choose a reward</h2>
            </div>
            <span>{state.rewards.scrap} Scrap secured</span>
          </div>
          {state.rewards.pending.choices.map((choice) => (
            <div className="reward-choice" key={choice.choiceId}>
              <p>{choice.kind === "card" ? "Card reward" : "Relic reward"}</p>
              <div className="reward-options">
                {choice.options.map((option) => (
                  <button
                    className="reward-option"
                    data-testid={`reward-option-${option.id}`}
                    key={option.id}
                    onClick={() => claimReward(state.rewards.pending?.transactionId ?? "", option.id)}
                    type="button"
                  >
                    <strong>{option.id}</strong>
                    <span>{option.kind === "card" ? `${option.role} · ${option.rarity}` : "Relic"}</span>
                  </button>
                ))}
              </div>
              {choice.kind === "card" && (
                <button
                  className="secondary-button"
                  data-testid="reward-skip"
                  onClick={() => skipReward(state.rewards.pending?.transactionId ?? "")}
                  type="button"
                >
                  Skip card reward
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="hand-section" aria-labelledby="hand-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SHARED DECK</p>
            <h2 id="hand-heading">Hand</h2>
          </div>
          <span>{combat.deck.zones.draw.length} draw · {combat.deck.zones.discard.length} discard · {combat.deck.zones.exhaust.length} exhaust</span>
        </div>

        <div className="hand" data-testid="hand">
          {hand.map((card) => {
            const disabled = !active || card.energyCost > combat.energy;
            return (
              <button
                key={card.instanceId}
                type="button"
                className={`play-card owner-${card.owner}`}
                disabled={disabled}
                onClick={() =>
                  commit({
                    kind: "play_card",
                    instanceId: card.instanceId,
                    targetActorId: selectedTarget,
                  })
                }
                data-testid={`card-${card.instanceId}`}
                data-card-name={card.name}
                data-card-damage={card.isDamageCard ? "true" : "false"}
              >
                <span className="card-cost">{card.energyCost}</span>
                <span className="card-owner">{card.owner}</span>
                <strong>{card.name}</strong>
                <span className="card-classification">{card.classification}</span>
                <span className="card-ingredient">
                  {card.ingredient === null
                    ? "No ingredient"
                    : `${card.ingredient.id} · Prime ${card.ingredient.prime}`}
                </span>
              </button>
            );
          })}
          {hand.length === 0 && (
            <p className="empty-hand">
              {active ? "No cards in hand." : "Combat complete."}
            </p>
          )}
        </div>
      </section>

      {error !== null && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      <footer className="debug-footer">
        <span>Authoritative hash</span>
        <output data-testid="state-hash">{hash}</output>
        <details>
          <summary>Command log</summary>
          <pre data-testid="command-log">{JSON.stringify(commands)}</pre>
        </details>
      </footer>
    </main>
  );
}

function M19TestAct({
  showSavePanel = false,
  showStorePanel = false,
}: { showSavePanel?: boolean; showStorePanel?: boolean } = {}) {
  const [state, setState] = useState<AuthoritativeState>(() => createM19Run());
  const [commands, setCommands] = useState<readonly M19Command[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveText, setSaveText] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [store, setStore] = useState<SaveStore | null>(null);
  const [storeStatus, setStoreStatus] = useState<string | null>(null);
  const [storeGeneration, setStoreGeneration] = useState<number | null>(null);

  const runningContent = useMemo(() => {
    const fresh = createM19Run();
    return {
      contentVersion: fresh.contentVersion,
      contentHash: fresh.contentHash,
    };
  }, []);

  useEffect(() => {
    if (!showStorePanel) return;
    let cancelled = false;
    let opened: SaveStore | null = null;

    void (async () => {
      let openedStore: SaveStore;
      try {
        openedStore = await openIndexedDbSaveStore({ content: runningContent });
      } catch (caught) {
        if (!cancelled) {
          setStoreStatus(
            `unavailable: ${caught instanceof Error ? caught.message : String(caught)}`,
          );
        }
        return;
      }
      if (cancelled) {
        openedStore.close();
        return;
      }
      opened = openedStore;
      setStore(openedStore);

      const result = await openedStore.load();
      if (cancelled) return;
      if (result.ok) {
        setState(result.state);
        setCommands([]);
        setSelectedTarget(null);
        setStoreGeneration(result.generation);
        setStoreStatus(
          `loaded: ${result.slot} generation ${result.generation}${
            result.repairedOnDisk ? " (repaired)" : ""
          }`,
        );
      } else {
        setStoreGeneration(null);
        setStoreStatus(result.code === "empty" ? "empty" : `load failed: ${result.code}`);
      }
    })();

    return () => {
      cancelled = true;
      opened?.close();
    };
  }, [showStorePanel, runningContent]);

  const hash = useMemo(() => hashAuthoritativeState(state), [state]);
  const run = state.run;
  if (run === null) {
    return <main className="combat-shell">M19 test act state unavailable.</main>;
  }

  const node = currentRunNode(state);
  const combat = state.combat;
  const pending = state.rewards.pending;
  const active = combat !== null && combat.outcome === "active";
  const livingEnemyIds =
    combat === null
      ? []
      : combat.enemyOrder.filter((actorId) => (combat.actors[actorId]?.hp ?? 0) > 0);
  const targetActorId =
    selectedTarget !== null && livingEnemyIds.includes(selectedTarget)
      ? selectedTarget
      : (livingEnemyIds[0] ?? null);
  const hand = active && combat !== null ? getM19Hand(state) : [];
  const morrow = run.characters[0];
  const switchActor = run.characters[1];
  const nodeComplete = node.isCompleted;

  function mutate(apply: () => AuthoritativeState): void {
    try {
      setState(apply());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function commit(command: M19Command): void {
    try {
      const result = applyM19Command(state, command);
      setState(result.state);
      setCommands((current) => [...current, command]);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function restart(): void {
    setState(createM19Run());
    setCommands([]);
    setSelectedTarget(null);
    setError(null);
  }

  const canBegin =
    run.outcome === "active" &&
    !nodeComplete &&
    node.kind !== "rest" &&
    combat === null &&
    pending === null;
  const canRest = run.outcome === "active" && !nodeComplete && node.kind === "rest";
  const canAdvance =
    run.outcome === "active" && nodeComplete && pending === null;
  const canResolveCombat =
    run.outcome === "active" &&
    !nodeComplete &&
    combat !== null &&
    combat.outcome === "victory" &&
    pending === null;

  function exportState(): void {
    setSaveText(exportSave(state));
    setSaveStatus("exported");
  }

  function importState(): void {
    const result = importSave(saveText, {
      content: {
        contentVersion: state.contentVersion,
        contentHash: state.contentHash,
      },
    });
    if (!result.ok) {
      setSaveStatus(`rejected: ${result.code}`);
      return;
    }
    setState(result.state);
    setCommands([]);
    setSelectedTarget(null);
    setSaveStatus(`loaded: v${result.saveVersion}`);
  }

  function persistState(): void {
    if (store === null) {
      setStoreStatus("unavailable: storage is not open");
      return;
    }
    void (async () => {
      const result = await store.commit(state);
      if (result.ok) {
        setStoreGeneration(result.generation);
        setStoreStatus(`committed: generation ${result.generation}`);
        return;
      }
      setStoreStatus(`commit failed: ${result.code}`);
    })();
  }

  function reloadFromStore(): void {
    if (store === null) {
      setStoreStatus("unavailable: storage is not open");
      return;
    }
    void (async () => {
      const result = await store.load();
      if (result.ok) {
        setState(result.state);
        setCommands([]);
        setSelectedTarget(null);
        setStoreGeneration(result.generation);
        setStoreStatus(
          `loaded: ${result.slot} generation ${result.generation}${
            result.repairedOnDisk ? " (repaired)" : ""
          }`,
        );
        return;
      }
      setStoreGeneration(null);
      setStoreStatus(result.code === "empty" ? "empty" : `load failed: ${result.code}`);
    })();
  }

  function resetStore(): void {
    if (store === null) {
      setStoreStatus("unavailable: storage is not open");
      return;
    }
    void (async () => {
      const result = await store.clear();
      setStoreGeneration(null);
      setStoreStatus(result.ok ? "cleared" : `clear failed: ${result.code}`);
    })();
  }

  return (
    <main className="combat-shell">
      <header className="combat-header">
        <div>
          <p className="eyebrow">M19 TEST ACT</p>
          <h1>Joint Liability</h1>
        </div>
        <div className="header-actions">
          <span className="turn-pill" data-testid="run-outcome">
            {run.outcome}
          </span>
          <button className="secondary-button" type="button" onClick={restart}>
            Restart act
          </button>
        </div>
      </header>

      {showSavePanel && (
        <section className="save-panel" aria-label="M20 save">
          <div className="save-controls">
            <p className="eyebrow">M20 SAVE</p>
            <button
              className="secondary-button"
              type="button"
              data-testid="save-export"
              onClick={exportState}
            >
              Export save
            </button>
            <button
              className="secondary-button"
              type="button"
              data-testid="save-import"
              onClick={importState}
            >
              Import save
            </button>
            <span className="turn-pill" data-testid="save-status">
              {saveStatus ?? "idle"}
            </span>
          </div>
          <textarea
            className="save-text"
            data-testid="save-text"
            aria-label="Canonical save text"
            value={saveText}
            spellCheck={false}
            onChange={(event) => setSaveText(event.target.value)}
          />
        </section>
      )}

      {showStorePanel && (
        <section className="save-panel" aria-label="M21 persistence">
          <div className="save-controls">
            <p className="eyebrow">M21 PERSISTENCE</p>
            <button
              className="secondary-button"
              type="button"
              data-testid="store-commit"
              onClick={persistState}
            >
              Save now
            </button>
            <button
              className="secondary-button"
              type="button"
              data-testid="store-load"
              onClick={reloadFromStore}
            >
              Load from storage
            </button>
            <button
              className="secondary-button"
              type="button"
              data-testid="store-clear"
              onClick={resetStore}
            >
              Reset storage
            </button>
            <span className="turn-pill" data-testid="store-status">
              {storeStatus ?? "opening"}
            </span>
            <span className="turn-pill" data-testid="store-generation">
              {storeGeneration === null ? "no generation" : `generation ${storeGeneration}`}
            </span>
          </div>
        </section>
      )}

      <section className="command-bar" aria-label="Test act status">
        <div className="resource-strip">
          <div>
            <span>Node</span>
            <strong data-testid="run-node">
              {node.nodeId} · {node.kind}
            </strong>
          </div>
          <div>
            <span>Completed</span>
            <strong data-testid="run-completed">
              {run.completedNodeIds.length}/{M19_NODE_IDS.length}
            </strong>
          </div>
          <div>
            <span>Morrow</span>
            <strong data-testid="run-morrow-hp">
              {morrow?.hp ?? 0}/{morrow?.maxHp ?? 0} HP
            </strong>
          </div>
          <div>
            <span>Switch</span>
            <strong data-testid="run-switch-hp">
              {switchActor?.hp ?? 0}/{switchActor?.maxHp ?? 0} HP
            </strong>
          </div>
          <div>
            <span>Scrap</span>
            <strong data-testid="run-scrap">{state.rewards.scrap}</strong>
          </div>
        </div>

        <div className="primary-controls">
          <button
            type="button"
            className="swap-button"
            data-testid="run-begin-node"
            disabled={!canBegin}
            onClick={() => mutate(() => beginRunNode(state))}
          >
            Begin node
            <small>{node.label}</small>
          </button>
          <button
            type="button"
            className="swap-button"
            data-testid="run-rest-morrow"
            disabled={!canRest}
            onClick={() => mutate(() => restRunCharacter(state, M10_MORROW_ID))}
          >
            Rest Morrow
            <small>+18 HP, capped</small>
          </button>
          <button
            type="button"
            className="end-turn-button"
            data-testid="run-advance"
            disabled={!canAdvance}
            onClick={() => mutate(() => advanceRunNode(state))}
          >
            Advance
          </button>
        </div>
      </section>

      {combat !== null && (
        <section className="battlefield" aria-label="Combatants">
          <article
            className={`fighter ${combat.frontCharacterId === M10_MORROW_ID ? "front" : "reserve"}`}
          >
            <div className="fighter-topline">
              <span>{positionLabel(M10_MORROW_ID, combat.frontCharacterId)}</span>
              <span>Source</span>
            </div>
            <h2>Morrow</h2>
            <p className="vital" data-testid="morrow-hp">
              {combat.actors[M10_MORROW_ID]?.hp ?? 0}/
              {combat.actors[M10_MORROW_ID]?.maxHp ?? 0} HP
            </p>
          </article>

          <div className="imprint-panel" aria-label="Shared Imprint">
            <span>Shared Imprint</span>
            <strong data-testid="imprint">
              {combat.imprint === null
                ? "No Imprint"
                : `${combat.imprint.ingredient.id.toUpperCase()} P${combat.imprint.potency} · ${actorLabel(combat.imprint.ownerCharacterId)}`}
            </strong>
          </div>

          <article
            className={`fighter ${combat.frontCharacterId === M10_SWITCH_ID ? "front" : "reserve"}`}
          >
            <div className="fighter-topline">
              <span>{positionLabel(M10_SWITCH_ID, combat.frontCharacterId)}</span>
              <span>Shaper</span>
            </div>
            <h2>Switch</h2>
            <p className="vital" data-testid="switch-hp">
              {combat.actors[M10_SWITCH_ID]?.hp ?? 0}/
              {combat.actors[M10_SWITCH_ID]?.maxHp ?? 0} HP
            </p>
          </article>

          <div className="enemy-row">
            {combat.enemyOrder.map((actorId) => {
              const enemy = combat.actors[actorId];
              return (
                <button
                  key={actorId}
                  type="button"
                  className={`enemy-card ${targetActorId === actorId ? "selected" : ""}`}
                  aria-pressed={targetActorId === actorId}
                  onClick={() => setSelectedTarget(actorId)}
                  data-testid={`run-enemy-${actorId}`}
                  disabled={!active || (enemy?.hp ?? 0) === 0}
                >
                  <span className="enemy-label">TARGET</span>
                  <strong>{actorId}</strong>
                  <span data-testid={`run-enemy-hp-${actorId}`}>
                    {enemy?.hp ?? 0}/{enemy?.maxHp ?? 0} HP
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {combat !== null && (
        <section className="command-bar" aria-label="Combat controls">
          <div className="resource-strip">
            <div>
              <span>Energy</span>
              <strong data-testid="energy">{combat.energy}</strong>
            </div>
            <div>
              <span>Phase</span>
              <strong>{combat.phase}</strong>
            </div>
            <div>
              <span>Outcome</span>
              <strong data-testid="outcome">{combat.outcome}</strong>
            </div>
            <div>
              <span>Turn</span>
              <strong data-testid="turn-number">{combat.turnNumber}</strong>
            </div>
          </div>

          <div className="primary-controls">
            <button
              type="button"
              className="swap-button"
              disabled={!active || combat.phase !== "player"}
              onClick={() => commit({ kind: "swap" })}
              data-testid="swap"
            >
              Swap
            </button>
            <button
              type="button"
              className="end-turn-button"
              disabled={!active || combat.phase !== "player"}
              onClick={() => commit({ kind: "end_turn" })}
              data-testid="end-turn"
            >
              End Turn
            </button>
            <button
              type="button"
              className="swap-button"
              disabled={!canResolveCombat}
              onClick={() =>
                mutate(() => completeRunCombat(state, M19_TEST_ACT_REWARD_CATALOG))
              }
              data-testid="run-resolve-combat"
            >
              Resolve combat
              <small>{node.label}</small>
            </button>
          </div>
        </section>
      )}

      {pending !== null && (
        <section className="reward-panel" data-testid="reward-panel" aria-label="Combat reward">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SALVAGE CLAIM</p>
              <h2>Choose a reward</h2>
            </div>
            <span data-testid="reward-scrap">{state.rewards.scrap} Scrap secured</span>
          </div>
          {pending.choices.map((choice) => (
            <div className="reward-choice" key={choice.choiceId}>
              <p>{choice.kind === "card" ? "Card reward" : "Relic reward"}</p>
              <div className="reward-options">
                {choice.options.map((option) => (
                  <button
                    className="reward-option"
                    data-testid={`reward-option-${option.id}`}
                    key={option.id}
                    onClick={() =>
                      mutate(() => claimRewardOption(state, pending.transactionId, option.id))
                    }
                    type="button"
                  >
                    <strong>{option.id}</strong>
                    <span>
                      {option.kind === "card"
                        ? `${option.role} · ${option.rarity}`
                        : "Relic"}
                    </span>
                  </button>
                ))}
              </div>
              {choice.kind === "card" && (
                <button
                  className="secondary-button"
                  data-testid="reward-skip"
                  onClick={() => mutate(() => skipCardReward(state, pending.transactionId))}
                  type="button"
                >
                  Skip card reward
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {combat !== null && (
        <section className="hand-section" aria-labelledby="run-hand-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PERSISTENT DECK</p>
              <h2 id="run-hand-heading">Hand</h2>
            </div>
            <span>
              {combat.deck.zones.draw.length} draw · {combat.deck.zones.discard.length} discard ·{" "}
              {combat.deck.zones.exhaust.length} exhaust
            </span>
          </div>

          <div className="hand" data-testid="hand">
            {hand.map((card) => (
              <button
                key={card.instanceId}
                type="button"
                className={`play-card owner-${card.owner}`}
                disabled={
                  !active ||
                  !card.isPlayable ||
                  card.energyCost > (combat?.energy ?? 0)
                }
                onClick={() =>
                  commit({
                    kind: "play_card",
                    instanceId: card.instanceId,
                    targetActorId: card.isDamageCard ? targetActorId : null,
                  })
                }
                data-testid={`card-${card.instanceId}`}
                data-card-name={card.name}
                data-card-damage={card.isDamageCard ? "true" : "false"}
              >
                <span className="card-cost">{card.energyCost}</span>
                <span className="card-owner">{card.owner}</span>
                <strong>{card.name}</strong>
                <span className="card-classification">{card.classification}</span>
                <span className="card-ingredient">
                  {card.isPlayable
                    ? card.ingredient === null
                      ? "No ingredient"
                      : `${card.ingredient.id} · Prime ${card.ingredient.prime}`
                    : "Unplayable"}
                </span>
              </button>
            ))}
            {hand.length === 0 && (
              <p className="empty-hand">
                {active ? "No cards in hand." : "Combat complete."}
              </p>
            )}
          </div>
        </section>
      )}

      {error !== null && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      <footer className="debug-footer">
        <span>Authoritative hash</span>
        <output data-testid="state-hash">{hash}</output>
        <details>
          <summary>Command log</summary>
          <pre data-testid="command-log">{JSON.stringify(commands)}</pre>
        </details>
      </footer>
    </main>
  );
}
