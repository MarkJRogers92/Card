export {
  CONTENT_VERSION,
  ENGINE_VERSION,
  createEngineBootstrap,
} from "./bootstrap";
export type {
  BootstrapOptions,
  EngineBootstrap,
  EnginePhase,
} from "./bootstrap";
export {
  ACTOR_STATE_VERSION,
  createCombatActor,
} from "./actors";
export type {
  ActorSide,
  ActorVitalityInput,
  CombatActor,
} from "./actors";
export {
  CANONICAL_HASH_VERSION,
  canonicalStringify,
  hashCanonical,
} from "./canonical";
export type { JsonPrimitive, JsonValue } from "./canonical";
export { REWARD_STATE_VERSION, createRewardState } from "./rewards";
export type { RewardState } from "./rewards";
export {
  CARD_INSTANCE_VERSION,
  createCardInstance,
  createCardInstanceId,
} from "./cards";
export type {
  CardInstance,
  CardInstanceId,
  CardInstanceInput,
  CardOrigin,
} from "./cards";
export {
  CARD_KEYWORDS,
  CARD_LIFECYCLE_VERSION,
  appendProtocolTriggerBindings,
  assertCardPlayable,
  cardHasKeyword,
  endPlayerTurnWithCardLifecycle,
  finishCardPlayLifecycle,
  movePlayedCardForLifecycle,
  payCardCosts,
  playedCardDestination,
  settlePlayerHandAtTurnEnd,
  validateCardLifecycle,
} from "./card-lifecycle";
export type {
  AdditionalHpCost,
  CardCategory,
  CardKeyword,
  CardLifecycleSpec,
  FinishCardLifecycleInput,
  FinishCardLifecycleResolution,
  HandSettlement,
  HpCostResource,
  PlayedCardDestination,
} from "./card-lifecycle";
export {
  COMBAT_STATE_VERSION,
  DEFAULT_CARDS_PER_TURN,
  DEFAULT_ENERGY_PER_TURN,
  DEFAULT_MAX_HAND_SIZE,
  beginPlayerTurn,
  endPlayerTurn,
  endPlayerTurnWithSettledHand,
  gainEnergy,
  initializeCombatActors,
  payEnergyCost,
  setFrontCharacter,
  startCombat,
} from "./combat";
export type {
  CombatActorSetup,
  CombatOutcome,
  CombatPhase,
  CombatRuleOverrides,
  CombatRules,
  CombatState,
  InstalledRelic,
  InstalledRelicFamily,
} from "./combat";
export {
  ADDITIONAL_MANUAL_SWAP_COST,
  CARD_RESOLUTION_CONTEXT_VERSION,
  FIRST_MANUAL_SWAP_COST,
  classifyCardPosition,
  snapshotCardResolutionContext,
  swapCharacters,
} from "./duo";
export type {
  CardCombatOwner,
  CardPositionClassification,
  CardResolutionContext,
  SwapMode,
  SwapResolution,
} from "./duo";
export {
  COMMAND_ID_VERSION,
  commitCommand,
  createCommand,
  createCommandId,
} from "./commands";
export type { CommandId, EngineCommand } from "./commands";
export {
  DAMAGE_MULTIPLIER_BASIS,
  DAMAGE_PACKET_VERSION,
  EXPOSED_MULTIPLIER_BPS,
  WEAK_MULTIPLIER_BPS,
  applyDirectDamage,
  applyDirectDamageToRule,
  applyHpLossBypassingBlock,
  calculateAttackDamage,
  calculateReactionDamage,
  calculateReactionDamageFromBase,
  createDirectDamagePacket,
  gainBlock,
  healActor,
  paySelfHpCost,
} from "./damage";
export type {
  AttackDamageCalculation,
  DamageResolution,
  DamageResult,
  DirectDamagePacket,
  HealingResolution,
  HealingResult,
  ReactionBaseDamageCalculation,
  ReactionDamageCalculation,
} from "./damage";
export {
  CARD_ZONES,
  assertCardConservation,
  createDeckState,
  discardHand,
  drawCards,
  shuffleDrawPile,
} from "./deck";
export type {
  CardZoneName,
  CardZones,
  DeckRngResult,
  DeckState,
  DrawResult,
} from "./deck";
export {
  ENEMY_CONTROLLER_VERSION,
  ENEMY_INTENT_VERSION,
  executeEnemyPhase,
  initializeEnemyControllers,
  projectEnemyIntent,
  projectSelectedEnemyIntents,
} from "./enemies";
export { ACT_1_FIRST_ENCOUNTERS, ACT_1_ORDINARY_ENCOUNTERS, INITIAL_ENEMY_REGISTRY } from "./initial-enemies";
export type { InitialEncounterFormation } from "./initial-enemies";
export type {
  EnemyAiDefinition,
  EnemyBehaviorDefinition,
  EnemyBehaviorRegistry,
  EnemyDeathEffect,
  EnemyControllerSetup,
  EnemyControllerState,
  EnemyIntentEffectProjection,
  EnemyIntentProjection,
  EnemyMoveDefinition,
  EnemyMoveEffect,
  EnemyMoveExecution,
  EnemyMoveTarget,
  EnemyPhaseResolution,
  ProjectedTargetDamage,
  SelectedEnemyIntent,
} from "./enemies";
export {
  EVENT_RECORD_VERSION,
  createEventRecords,
} from "./events";
export type {
  EngineEventDraft,
  EngineEventRecord,
  EventId,
} from "./events";
export {
  MORROW_THICK_BLOOD_SOURCE_ID,
  MORROW_THICK_BLOOD_TRIGGER_ID,
  SHARED_WARRANTY_SOURCE_ID,
  SHARED_WARRANTY_TRIGGER_ID,
  SWITCH_OPEN_CHANNEL_SOURCE_ID,
  SWITCH_OPEN_CHANNEL_TRIGGER_ID,
  createInitialPassiveBindings,
  installInitialPassives,
} from "./initial-passives";
export type { InitialPassiveSetup } from "./initial-passives";
export {
  FORM_INGREDIENT_IDS,
  IMPRINT_REINFORCE_POTENCY_BONUS_CHANNEL,
  IMPRINT_STATE_VERSION,
  MATERIAL_INGREDIENT_IDS,
  MAX_IMPRINT_POTENCY,
  boostImprintPotency,
  createImprint,
  ingredientsAreCompatible,
  storeOrReinforceImprint,
} from "./imprint";
export {
  BASE_CARD_REWARD_OPTIONS,
  REWARD_CARD_OPTION_COUNT_CHANNEL,
  cardRewardOptionCount,
} from "./reward-options";
export type {
  FormIngredientId,
  Imprint,
  ImprintIngredient,
  Ingredient,
  MaterialIngredientId,
} from "./imprint";
export {
  M10_CLAIMS_ADJUSTER_ID,
  M10_CLAIMS_ADJUSTER_REGISTRY,
  M10_DEFAULT_SEED,
  M10_MORROW_ID,
  M10_STARTER_CARDS,
  M10_SWITCH_ID,
  applyM10Command,
  createM10Fight,
  endM10Turn,
  getM10CardView,
  getM10Hand,
  hashM10Fight,
  playM10Card,
  replayM10Commands,
  swapM10Characters,
} from "./m10-fight";
export type {
  M10CardDestination,
  M10CardEffect,
  M10CardOwner,
  M10CardView,
  M10Command,
  M10CommandResult,
  M10StarterCardDefinition,
} from "./m10-fight";
export { resolvePostCardIngredientWithTriggers } from "./passive-card";
export {
  applyCardBaseEffects,
  cardLifecycleSpecFor,
  endPlayerTurnWithContentCards,
  isLiabilityCard,
  playContentCard,
  resolveAdditionalHpCosts,
  resolveCardParameters,
  resolveValueExpr,
} from "./card-content";
export type {
  CardBaseEffectsResult,
  CardEffectContext,
  PlayContentCardInput,
} from "./card-content";
export {
  NEEDLE_REACTION_RECIPES,
  REACTION_RECIPES,
  REACTION_RECIPE_VERSION,
  resolvePostCardIngredient,
  resolveReactionRecipe,
} from "./reactions";
export type {
  EnemyReactionTarget,
  NeedleReactionEffect,
  NeedleReactionRecipe,
  PostCardIngredientInput,
  PostCardIngredientResolution,
  PrimaryReactionResolution,
  ReactionEffect,
  ReactionRecipe,
  RepeatableReactionEffect,
} from "./reactions";
export {
  SCHEDULED_PACKET_TIMING,
  SCHEDULED_PACKET_VERSION,
  resolveScheduledPacketsAtPlayerTurnStart,
  scheduleReactionPacket,
} from "./scheduled";
export type {
  ScheduledPacketExecution,
  ScheduledPacketResolution,
  ScheduledReactionEffect,
  ScheduledReactionPacket,
} from "./scheduled";
export {
  GAMEPLAY_RNG_STREAMS,
  RNG_ALGORITHM_VERSION,
  RNG_STATE_VERSION,
  createCosmeticRngState,
  createGameplayRngState,
  drawCosmeticUint32,
  drawGameplayInt,
  drawGameplayUint32,
  normalizeSeed,
} from "./rng";
export type {
  CosmeticRngState,
  GameplayRngState,
  GameplayRngStream,
  GameplayRngStreams,
  RngCursor,
  RngDraw,
  SeedInput,
} from "./rng";
export {
  AUTHORITATIVE_STATE_VERSION,
  createAuthoritativeState,
  drawStateInt,
  drawStateUint32,
  hashAuthoritativeState,
} from "./state";
export type {
  AuthoritativeState,
  AuthoritativeStateOptions,
} from "./state";
export {
  COMBAT_STATUS_IDS,
  STATUS_STATE_VERSION,
  activeCombatStatusIds,
  addStatusAmount,
  createCombatStatuses,
  decayTurnDurationStatuses,
  decrementStatusAmount,
  getStatusAmount,
  setStatusAmount,
} from "./status";
export type {
  CombatStatusId,
  CombatStatusInput,
  CombatStatuses,
} from "./status";
export {
  ENEMY_PHASE_ESCALATION_START,
  ENEMY_PHASE_ESCALATION_STRENGTH,
  applyCombatStatus,
  applyEnemyPhaseEscalation,
  decayDurationStatusesForSide,
  setCombatStatusForTesting,
  tickBleedAfterEnemyAttackMove,
  tickPoisonAtEnemyPhaseStart,
} from "./status-runtime";
export type {
  EscalationResolution,
  StatusTick,
  StatusTickResolution,
} from "./status-runtime";
export {
  MAX_GENERATED_EVENTS_PER_DISPATCH,
  MAX_MODIFIERS_PER_CHANNEL,
  MODIFIER_BINDING_VERSION,
  TRIGGER_BINDING_VERSION,
  TRIGGER_COUNTERS_VERSION,
  TRIGGER_EVENT_VERSION,
  collectApplicableModifiers,
  combineMultiplierModifiers,
  createTriggerCounters,
  dispatchTriggerEvent,
  appendSetupModifierBindings,
  appendSetupTriggerBindings,
  installModifierBindings,
  installTriggerBindings,
  previewTriggerEvent,
  resetTurnTriggerCounters,
} from "./triggers";
export { compileRelicContent, installRelicContent } from "./relic-content";
export type { CompiledRelicContent } from "./relic-content";
export type {
  AfterSwapTriggerEvent,
  CardPlayedTriggerEvent,
  PrimaryReactionTriggerEvent,
  ModifierBinding,
  ModifierCondition,
  ModifierContext,
  ModifierOperation,
  TriggerActivationProjection,
  TriggerActivationResult,
  TriggerBinding,
  TriggerCondition,
  TriggerCounters,
  TriggerDispatchResult,
  TriggerEffect,
  TriggerEffectTarget,
  TriggerEvent,
  TriggerEventKind,
  TriggerLimit,
  TriggerLimitScope,
  TriggerSwapMode,
} from "./triggers";
export {
  TARGET_RULE_KINDS,
  getReserveCharacterId,
  resolveTargetRule,
} from "./targeting";
export type { TargetRule, TargetRuleKind } from "./targeting";
