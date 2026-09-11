import { useMemo, useState } from "react";
import {
  M10_CLAIMS_ADJUSTER_ID,
  M10_MORROW_ID,
  M10_SWITCH_ID,
  applyM10Command,
  claimRewardOption,
  createM10Fight,
  createM10RewardFixture,
  getM10Hand,
  hashM10Fight,
  projectSelectedEnemyIntents,
  skipCardReward,
  type AuthoritativeState,
  type M10Command,
} from "../engine";
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
