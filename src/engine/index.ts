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
  COMBAT_STATE_VERSION,
  DEFAULT_CARDS_PER_TURN,
  DEFAULT_ENERGY_PER_TURN,
  DEFAULT_MAX_HAND_SIZE,
  beginPlayerTurn,
  endPlayerTurn,
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
  calculateReactionDamage,
  calculateAttackDamage,
  createDirectDamagePacket,
  gainBlock,
  paySelfHpCost,
} from "./damage";
export type {
  AttackDamageCalculation,
  DamageResolution,
  DamageResult,
  DirectDamagePacket,
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
export type {
  EnemyAiDefinition,
  EnemyBehaviorDefinition,
  EnemyBehaviorRegistry,
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
export {
  FORM_INGREDIENT_IDS,
  IMPRINT_STATE_VERSION,
  MATERIAL_INGREDIENT_IDS,
  MAX_IMPRINT_POTENCY,
  createImprint,
  ingredientsAreCompatible,
  storeOrReinforceImprint,
} from "./imprint";
export type {
  FormIngredientId,
  Imprint,
  ImprintIngredient,
  Ingredient,
  MaterialIngredientId,
} from "./imprint";
export {
  NEEDLE_REACTION_RECIPES,
  REACTION_RECIPE_VERSION,
  resolvePostCardIngredient,
} from "./reactions";
export type {
  NeedleReactionEffect,
  NeedleReactionRecipe,
  PostCardIngredientInput,
  PostCardIngredientResolution,
  PrimaryReactionResolution,
} from "./reactions";
export type {
  EngineEventDraft,
  EngineEventRecord,
  EventId,
} from "./events";
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
  TARGET_RULE_KINDS,
  getReserveCharacterId,
  resolveTargetRule,
} from "./targeting";
export type { TargetRule, TargetRuleKind } from "./targeting";
