/* eslint-disable */
/**
 * GENERATED FILE. Do not edit by hand.
 * Source schemas: schemas/*.schema.json
 * Regenerate with: npm run content:types
 */
// Generated from schemas/common.schema.json
export namespace CommonSchema {
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "SchemaVersion".
   */
  export type SchemaVersion = 1;
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "StableId".
   */
  export type StableId = string;
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Text".
   */
  export type Text = string;
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "LongText".
   */
  export type LongText = string;
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "ValueExpr".
   */
  export type ValueExpr = ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "StatReference".
   */
  export type StatReference =
    | "owner_hp"
    | "owner_max_hp"
    | "front_hp"
    | "front_max_hp"
    | "reserve_hp"
    | "reserve_max_hp"
    | "energy"
    | "imprint_potency"
    | "enemy_hp"
    | "enemy_max_hp"
    | "scrap"
    | "evidence";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "EffectTarget".
   */
  export type EffectTarget =
    | "selected_enemy"
    | "all_enemies"
    | "front"
    | "reserve"
    | "both"
    | "locked_character"
    | "self"
    | "owner"
    | "intent_target"
    | "none";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "CardTarget".
   */
  export type CardTarget = "enemy" | "all_enemies" | "self" | "owner" | "front" | "reserve" | "both" | "none";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Material".
   */
  export type Material = "gore" | "volt" | "rot" | "echo";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Form".
   */
  export type Form = "needle" | "burst" | "siphon" | "loop";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "StatusId".
   */
  export type StatusId = "bleed" | "poison" | "weak" | "exposed" | "strength";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "FactionId".
   */
  export type FactionId = "office" | "union" | "broadcast";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Keyword".
   */
  export type Keyword = "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Destination".
   */
  export type Destination = "player_hand" | "player_discard" | "player_draw" | "player_exhaust" | "deployed";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "CostResource".
   */
  export type CostResource = "owner_hp" | "front_hp" | "reserve_hp" | "scrap" | "evidence" | "energy";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "EffectTiming".
   */
  export type EffectTiming = "next_player_turn_start" | "next_enemy_phase_start";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "TriggerScope".
   */
  export type TriggerScope = "command" | "turn" | "combat" | "run";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "TriggerKeying".
   */
  export type TriggerKeying = "relic_instance" | "target" | "source";
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "CardTag".
   */
  export type CardTag = "attack" | "skill" | "protocol" | "status" | "grafted";

  export interface JointLiabilityCommonContentPrimitives {}
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "ConstExpr".
   */
  export interface ConstExpr {
    const: number;
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "ParamExpr".
   */
  export interface ParamExpr {
    param: string;
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "StatExpr".
   */
  export interface StatExpr {
    stat: StatReference;
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "AddExpr".
   */
  export interface AddExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    add: [unknown, unknown];
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "MultiplyExpr".
   */
  export interface MultiplyExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    multiply: [unknown, unknown];
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Ingredient".
   */
  export interface Ingredient {
    kind: "material" | "form";
    id: "gore" | "volt" | "rot" | "echo" | "needle" | "burst" | "siphon" | "loop";
    prime: ValueExpr;
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "IngredientReference".
   */
  export interface IngredientReference {
    kind: "material" | "form";
    id: "gore" | "volt" | "rot" | "echo" | "needle" | "burst" | "siphon" | "loop";
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Cost".
   */
  export interface Cost {
    resource: CostResource;
    amount: ValueExpr;
    minimumRemaining?: number;
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "TriggerLimit".
   */
  export interface TriggerLimit {
    scope: TriggerScope;
    count: number;
    keying: TriggerKeying;
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Condition".
   */
  export interface Condition {
    target_has_status?: StatusId;
    source_owner?: "source" | "shaper" | "crew";
    ingredient?: IngredientReference;
    event?: string;
    has_card_tag?: CardTag;
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "Predicate".
   */
  export interface Predicate {
    has_flag?: StableId;
    standing_at_least?: StandingRequirement;
    has_card_tag?: CardTag;
    has_protocol?: boolean;
    has_graft?: boolean;
    can_pay?: PaymentRequirement;
    act_is?: "act_1" | "act_2";
    /**
     * @minItems 1
     * @maxItems 8
     */
    all?:
      | [Predicate]
      | [Predicate, Predicate]
      | [Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate];
    /**
     * @minItems 1
     * @maxItems 8
     */
    any?:
      | [Predicate]
      | [Predicate, Predicate]
      | [Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate];
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "StandingRequirement".
   */
  export interface StandingRequirement {
    factionId: FactionId;
    amount: number;
  }
  /**
   * This interface was referenced by `JointLiabilityCommonContentPrimitives`'s JSON-Schema
   * via the `definition` "PaymentRequirement".
   */
  export interface PaymentRequirement {
    resource: CostResource;
    amount: number;
    minimumRemaining?: number;
  }
}

// Generated from schemas/effect.schema.json
export namespace EffectSchema {
  export type JointLiabilityEffectOperations = Effect;
  export type Effect =
    | DamageEffect
    | BlockEffect
    | HealEffect
    | ApplyStatusEffect
    | DrawEffect
    | GainEnergyEffect
    | SwapEffect
    | BoostImprintEffect
    | AddCardEffect
    | InstallProtocolEffect
    | SchedulePacketEffect
    | RepeatPacketEffect
    | GainScrapEffect
    | GainEvidenceEffect
    | ChangeStandingEffect
    | SetFlagEffect
    | RemoveCardEffect
    | UpgradeCardEffect;

  export interface DamageEffect {
    op: "damage";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    hits: number;
    category: "attack" | "reaction" | "direct" | "status";
  }
  export interface ConstExpr {
    const: number;
  }
  export interface ParamExpr {
    param: string;
  }
  export interface StatExpr {
    stat:
      | "owner_hp"
      | "owner_max_hp"
      | "front_hp"
      | "front_max_hp"
      | "reserve_hp"
      | "reserve_max_hp"
      | "energy"
      | "imprint_potency"
      | "enemy_hp"
      | "enemy_max_hp"
      | "scrap"
      | "evidence";
  }
  export interface AddExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    add: [unknown, unknown];
  }
  export interface MultiplyExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    multiply: [unknown, unknown];
  }
  export interface BlockEffect {
    op: "block";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface HealEffect {
    op: "heal";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    recoveryCategory: "reaction" | "exhaust" | "consumable" | "other";
  }
  export interface ApplyStatusEffect {
    op: "apply_status";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    status: "bleed" | "poison" | "weak" | "exposed" | "strength";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface DrawEffect {
    op: "draw";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEnergyEffect {
    op: "gain_energy";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface SwapEffect {
    op: "swap";
    mode: "free" | "normal";
  }
  export interface BoostImprintEffect {
    op: "boost_imprint";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface AddCardEffect {
    op: "add_card";
    cardId: string;
    destination: "player_hand" | "player_discard" | "player_draw" | "player_exhaust" | "deployed";
    temporary: boolean;
  }
  export interface InstallProtocolEffect {
    op: "install_protocol";
    trigger: ProtocolTrigger;
  }
  export interface ProtocolTrigger {
    event: "after_source_lead" | "after_primary_reaction" | "after_swap" | "player_turn_start" | "enemy_phase_start";
    filter: Condition;
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
    limit: TriggerLimit;
    priority: number;
  }
  export interface Condition {
    target_has_status?: "bleed" | "poison" | "weak" | "exposed" | "strength";
    source_owner?: "source" | "shaper" | "crew";
    ingredient?: IngredientReference;
    event?: string;
    has_card_tag?: "attack" | "skill" | "protocol" | "status" | "grafted";
  }
  export interface IngredientReference {
    kind: "material" | "form";
    id: "gore" | "volt" | "rot" | "echo" | "needle" | "burst" | "siphon" | "loop";
  }
  export interface TriggerLimit {
    scope: "command" | "turn" | "combat" | "run";
    count: number;
    keying: "relic_instance" | "target" | "source";
  }
  export interface SchedulePacketEffect {
    op: "schedule_packet";
    timing: "next_player_turn_start" | "next_enemy_phase_start";
    packet: Packet;
  }
  export interface Packet {
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
  }
  export interface RepeatPacketEffect {
    op: "repeat_packet";
    packetRef: string;
    multiplier: number;
    timing: "next_player_turn_start" | "next_enemy_phase_start";
  }
  export interface GainScrapEffect {
    op: "gain_scrap";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEvidenceEffect {
    op: "gain_evidence";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface ChangeStandingEffect {
    op: "change_standing";
    factionId: "office" | "union" | "broadcast";
    amount: number;
  }
  export interface SetFlagEffect {
    op: "set_flag";
    flagId: string;
    value: boolean | string | number;
  }
  export interface RemoveCardEffect {
    op: "remove_card";
    selection: {
      type: "selected_card";
    };
  }
  export interface UpgradeCardEffect {
    op: "upgrade_card";
    selection: {
      type: "selected_card";
    };
  }
}

// Generated from schemas/card.schema.json
export namespace CardSchema {
  export type Effect =
    | DamageEffect
    | BlockEffect
    | HealEffect
    | ApplyStatusEffect
    | DrawEffect
    | GainEnergyEffect
    | SwapEffect
    | BoostImprintEffect
    | AddCardEffect
    | InstallProtocolEffect
    | SchedulePacketEffect
    | RepeatPacketEffect
    | GainScrapEffect
    | GainEvidenceEffect
    | ChangeStandingEffect
    | SetFlagEffect
    | RemoveCardEffect
    | UpgradeCardEffect;

  export interface JointLiabilityCardDefinition {
    schemaVersion: 1;
    id: string;
    name: string;
    owner: "source" | "shaper" | "crew";
    category: "attack" | "skill" | "protocol" | "status";
    rarity: "starter" | "common" | "uncommon" | "rare" | "generated";
    parameters: {
      /**
       * This interface was referenced by `undefined`'s JSON-Schema definition
       * via the `patternProperty` "^[a-z][a-zA-Z0-9_]*$".
       */
      [k: string]: {
        base: number;
        upgraded: number;
      };
    };
    energyCost: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    /**
     * @maxItems 8
     */
    additionalCosts:
      | []
      | [Cost]
      | [Cost, Cost]
      | [Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost, Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost, Cost, Cost, Cost, Cost];
    target: "enemy" | "all_enemies" | "self" | "owner" | "front" | "reserve" | "both" | "none";
    ingredient: Ingredient | null;
    /**
     * @maxItems 5
     */
    keywords:
      | []
      | ["exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability"]
      | [
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability"
        ]
      | [
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability"
        ]
      | [
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability"
        ]
      | [
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability",
          "exhaust" | "retain" | "fleeting" | "unplayable" | "protocol" | "liability"
        ];
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
    graftEligible: boolean;
    unlockId: string | null;
    artId: string;
  }
  export interface ConstExpr {
    const: number;
  }
  export interface ParamExpr {
    param: string;
  }
  export interface StatExpr {
    stat:
      | "owner_hp"
      | "owner_max_hp"
      | "front_hp"
      | "front_max_hp"
      | "reserve_hp"
      | "reserve_max_hp"
      | "energy"
      | "imprint_potency"
      | "enemy_hp"
      | "enemy_max_hp"
      | "scrap"
      | "evidence";
  }
  export interface AddExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    add: [unknown, unknown];
  }
  export interface MultiplyExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    multiply: [unknown, unknown];
  }
  export interface Cost {
    resource: "owner_hp" | "front_hp" | "reserve_hp" | "scrap" | "evidence" | "energy";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    minimumRemaining?: number;
  }
  export interface Ingredient {
    kind: "material" | "form";
    id: "gore" | "volt" | "rot" | "echo" | "needle" | "burst" | "siphon" | "loop";
    prime: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface DamageEffect {
    op: "damage";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    hits: number;
    category: "attack" | "reaction" | "direct" | "status";
  }
  export interface BlockEffect {
    op: "block";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface HealEffect {
    op: "heal";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    recoveryCategory: "reaction" | "exhaust" | "consumable" | "other";
  }
  export interface ApplyStatusEffect {
    op: "apply_status";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    status: "bleed" | "poison" | "weak" | "exposed" | "strength";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface DrawEffect {
    op: "draw";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEnergyEffect {
    op: "gain_energy";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface SwapEffect {
    op: "swap";
    mode: "free" | "normal";
  }
  export interface BoostImprintEffect {
    op: "boost_imprint";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface AddCardEffect {
    op: "add_card";
    cardId: string;
    destination: "player_hand" | "player_discard" | "player_draw" | "player_exhaust" | "deployed";
    temporary: boolean;
  }
  export interface InstallProtocolEffect {
    op: "install_protocol";
    trigger: ProtocolTrigger;
  }
  export interface ProtocolTrigger {
    event: "after_source_lead" | "after_primary_reaction" | "after_swap" | "player_turn_start" | "enemy_phase_start";
    filter: Condition;
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
    limit: TriggerLimit;
    priority: number;
  }
  export interface Condition {
    target_has_status?: "bleed" | "poison" | "weak" | "exposed" | "strength";
    source_owner?: "source" | "shaper" | "crew";
    ingredient?: IngredientReference;
    event?: string;
    has_card_tag?: "attack" | "skill" | "protocol" | "status" | "grafted";
  }
  export interface IngredientReference {
    kind: "material" | "form";
    id: "gore" | "volt" | "rot" | "echo" | "needle" | "burst" | "siphon" | "loop";
  }
  export interface TriggerLimit {
    scope: "command" | "turn" | "combat" | "run";
    count: number;
    keying: "relic_instance" | "target" | "source";
  }
  export interface SchedulePacketEffect {
    op: "schedule_packet";
    timing: "next_player_turn_start" | "next_enemy_phase_start";
    packet: Packet;
  }
  export interface Packet {
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
  }
  export interface RepeatPacketEffect {
    op: "repeat_packet";
    packetRef: string;
    multiplier: number;
    timing: "next_player_turn_start" | "next_enemy_phase_start";
  }
  export interface GainScrapEffect {
    op: "gain_scrap";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEvidenceEffect {
    op: "gain_evidence";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface ChangeStandingEffect {
    op: "change_standing";
    factionId: "office" | "union" | "broadcast";
    amount: number;
  }
  export interface SetFlagEffect {
    op: "set_flag";
    flagId: string;
    value: boolean | string | number;
  }
  export interface RemoveCardEffect {
    op: "remove_card";
    selection: {
      type: "selected_card";
    };
  }
  export interface UpgradeCardEffect {
    op: "upgrade_card";
    selection: {
      type: "selected_card";
    };
  }
}

// Generated from schemas/relic.schema.json
export namespace RelicSchema {
  export type Effect =
    | DamageEffect
    | BlockEffect
    | HealEffect
    | ApplyStatusEffect
    | DrawEffect
    | GainEnergyEffect
    | SwapEffect
    | BoostImprintEffect
    | AddCardEffect
    | InstallProtocolEffect
    | SchedulePacketEffect
    | RepeatPacketEffect
    | GainScrapEffect
    | GainEvidenceEffect
    | ChangeStandingEffect
    | SetFlagEffect
    | RemoveCardEffect
    | UpgradeCardEffect;

  export interface JointLiabilityRelicDefinition {
    schemaVersion: 1;
    id: string;
    name: string;
    rarity: "starter" | "common" | "uncommon" | "rare";
    family: "anatomy" | "circuit" | "forgery" | "neutral" | "none";
    /**
     * @maxItems 16
     */
    modifiers:
      | []
      | [Modifier]
      | [Modifier, Modifier]
      | [Modifier, Modifier, Modifier]
      | [Modifier, Modifier, Modifier, Modifier]
      | [Modifier, Modifier, Modifier, Modifier, Modifier]
      | [Modifier, Modifier, Modifier, Modifier, Modifier, Modifier]
      | [Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier]
      | [Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier]
      | [Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier]
      | [Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier]
      | [Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier, Modifier]
      | [
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier
        ]
      | [
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier
        ]
      | [
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier
        ]
      | [
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier
        ]
      | [
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier,
          Modifier
        ];
    /**
     * @maxItems 16
     */
    triggers:
      | []
      | [Trigger]
      | [Trigger, Trigger]
      | [Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger]
      | [Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger, Trigger]
      | [
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger
        ]
      | [
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger
        ]
      | [
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger
        ]
      | [
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger,
          Trigger
        ];
    unlockId: string | null;
    artId: string;
  }
  /**
   * This interface was referenced by `JointLiabilityRelicDefinition`'s JSON-Schema
   * via the `definition` "Modifier".
   */
  export interface Modifier {
    channel: string;
    condition: Condition | null;
    operation: "multiply" | "add" | "set" | "cap";
    value: number;
    priority: number;
  }
  export interface Condition {
    target_has_status?: "bleed" | "poison" | "weak" | "exposed" | "strength";
    source_owner?: "source" | "shaper" | "crew";
    ingredient?: IngredientReference;
    event?: string;
    has_card_tag?: "attack" | "skill" | "protocol" | "status" | "grafted";
  }
  export interface IngredientReference {
    kind: "material" | "form";
    id: "gore" | "volt" | "rot" | "echo" | "needle" | "burst" | "siphon" | "loop";
  }
  /**
   * This interface was referenced by `JointLiabilityRelicDefinition`'s JSON-Schema
   * via the `definition` "Trigger".
   */
  export interface Trigger {
    event:
      | "after_source_lead"
      | "after_primary_reaction"
      | "after_swap"
      | "card_played"
      | "player_turn_start"
      | "enemy_phase_start";
    filter: Condition;
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
    limit: TriggerLimit;
    priority: number;
  }
  export interface DamageEffect {
    op: "damage";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    hits: number;
    category: "attack" | "reaction" | "direct" | "status";
  }
  export interface ConstExpr {
    const: number;
  }
  export interface ParamExpr {
    param: string;
  }
  export interface StatExpr {
    stat:
      | "owner_hp"
      | "owner_max_hp"
      | "front_hp"
      | "front_max_hp"
      | "reserve_hp"
      | "reserve_max_hp"
      | "energy"
      | "imprint_potency"
      | "enemy_hp"
      | "enemy_max_hp"
      | "scrap"
      | "evidence";
  }
  export interface AddExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    add: [unknown, unknown];
  }
  export interface MultiplyExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    multiply: [unknown, unknown];
  }
  export interface BlockEffect {
    op: "block";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface HealEffect {
    op: "heal";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    recoveryCategory: "reaction" | "exhaust" | "consumable" | "other";
  }
  export interface ApplyStatusEffect {
    op: "apply_status";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    status: "bleed" | "poison" | "weak" | "exposed" | "strength";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface DrawEffect {
    op: "draw";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEnergyEffect {
    op: "gain_energy";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface SwapEffect {
    op: "swap";
    mode: "free" | "normal";
  }
  export interface BoostImprintEffect {
    op: "boost_imprint";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface AddCardEffect {
    op: "add_card";
    cardId: string;
    destination: "player_hand" | "player_discard" | "player_draw" | "player_exhaust" | "deployed";
    temporary: boolean;
  }
  export interface InstallProtocolEffect {
    op: "install_protocol";
    trigger: ProtocolTrigger;
  }
  export interface ProtocolTrigger {
    event: "after_source_lead" | "after_primary_reaction" | "after_swap" | "player_turn_start" | "enemy_phase_start";
    filter: Condition;
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
    limit: TriggerLimit;
    priority: number;
  }
  export interface TriggerLimit {
    scope: "command" | "turn" | "combat" | "run";
    count: number;
    keying: "relic_instance" | "target" | "source";
  }
  export interface SchedulePacketEffect {
    op: "schedule_packet";
    timing: "next_player_turn_start" | "next_enemy_phase_start";
    packet: Packet;
  }
  export interface Packet {
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
  }
  export interface RepeatPacketEffect {
    op: "repeat_packet";
    packetRef: string;
    multiplier: number;
    timing: "next_player_turn_start" | "next_enemy_phase_start";
  }
  export interface GainScrapEffect {
    op: "gain_scrap";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEvidenceEffect {
    op: "gain_evidence";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface ChangeStandingEffect {
    op: "change_standing";
    factionId: "office" | "union" | "broadcast";
    amount: number;
  }
  export interface SetFlagEffect {
    op: "set_flag";
    flagId: string;
    value: boolean | string | number;
  }
  export interface RemoveCardEffect {
    op: "remove_card";
    selection: {
      type: "selected_card";
    };
  }
  export interface UpgradeCardEffect {
    op: "upgrade_card";
    selection: {
      type: "selected_card";
    };
  }
}

// Generated from schemas/enemy.schema.json
export namespace EnemySchema {
  /**
   * This interface was referenced by `JointLiabilityEnemyDefinition`'s JSON-Schema
   * via the `definition` "LocalId".
   */
  export type LocalId = string;
  /**
   * This interface was referenced by `JointLiabilityEnemyDefinition`'s JSON-Schema
   * via the `definition` "IntentTarget".
   */
  export type IntentTarget = "front" | "reserve" | "both" | "locked_character" | "self";
  export type Effect =
    | DamageEffect
    | BlockEffect
    | HealEffect
    | ApplyStatusEffect
    | DrawEffect
    | GainEnergyEffect
    | SwapEffect
    | BoostImprintEffect
    | AddCardEffect
    | InstallProtocolEffect
    | SchedulePacketEffect
    | RepeatPacketEffect
    | GainScrapEffect
    | GainEvidenceEffect
    | ChangeStandingEffect
    | SetFlagEffect
    | RemoveCardEffect
    | UpgradeCardEffect;

  export interface JointLiabilityEnemyDefinition {
    schemaVersion: 1;
    id: string;
    name: string;
    maxHp: number;
    startingBlock: number;
    /**
     * @minItems 1
     * @maxItems 32
     */
    moves: [Move, ...Move[]];
    ai: CycleAi | OpeningCycleAi;
    /**
     * @maxItems 16
     */
    traits:
      | []
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string, string, string, string, string, string]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string
        ];
    /**
     * @maxItems 8
     */
    phases:
      | []
      | [Phase]
      | [Phase, Phase]
      | [Phase, Phase, Phase]
      | [Phase, Phase, Phase, Phase]
      | [Phase, Phase, Phase, Phase, Phase]
      | [Phase, Phase, Phase, Phase, Phase, Phase]
      | [Phase, Phase, Phase, Phase, Phase, Phase, Phase]
      | [Phase, Phase, Phase, Phase, Phase, Phase, Phase, Phase];
    artId: string;
  }
  /**
   * This interface was referenced by `JointLiabilityEnemyDefinition`'s JSON-Schema
   * via the `definition` "Move".
   */
  export interface Move {
    id: LocalId;
    label: string;
    target: IntentTarget;
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
  }
  export interface DamageEffect {
    op: "damage";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    hits: number;
    category: "attack" | "reaction" | "direct" | "status";
  }
  export interface ConstExpr {
    const: number;
  }
  export interface ParamExpr {
    param: string;
  }
  export interface StatExpr {
    stat:
      | "owner_hp"
      | "owner_max_hp"
      | "front_hp"
      | "front_max_hp"
      | "reserve_hp"
      | "reserve_max_hp"
      | "energy"
      | "imprint_potency"
      | "enemy_hp"
      | "enemy_max_hp"
      | "scrap"
      | "evidence";
  }
  export interface AddExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    add: [unknown, unknown];
  }
  export interface MultiplyExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    multiply: [unknown, unknown];
  }
  export interface BlockEffect {
    op: "block";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface HealEffect {
    op: "heal";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    recoveryCategory: "reaction" | "exhaust" | "consumable" | "other";
  }
  export interface ApplyStatusEffect {
    op: "apply_status";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    status: "bleed" | "poison" | "weak" | "exposed" | "strength";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface DrawEffect {
    op: "draw";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEnergyEffect {
    op: "gain_energy";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface SwapEffect {
    op: "swap";
    mode: "free" | "normal";
  }
  export interface BoostImprintEffect {
    op: "boost_imprint";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface AddCardEffect {
    op: "add_card";
    cardId: string;
    destination: "player_hand" | "player_discard" | "player_draw" | "player_exhaust" | "deployed";
    temporary: boolean;
  }
  export interface InstallProtocolEffect {
    op: "install_protocol";
    trigger: ProtocolTrigger;
  }
  export interface ProtocolTrigger {
    event: "after_source_lead" | "after_primary_reaction" | "after_swap" | "player_turn_start" | "enemy_phase_start";
    filter: Condition;
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
    limit: TriggerLimit;
    priority: number;
  }
  export interface Condition {
    target_has_status?: "bleed" | "poison" | "weak" | "exposed" | "strength";
    source_owner?: "source" | "shaper" | "crew";
    ingredient?: IngredientReference;
    event?: string;
    has_card_tag?: "attack" | "skill" | "protocol" | "status" | "grafted";
  }
  export interface IngredientReference {
    kind: "material" | "form";
    id: "gore" | "volt" | "rot" | "echo" | "needle" | "burst" | "siphon" | "loop";
  }
  export interface TriggerLimit {
    scope: "command" | "turn" | "combat" | "run";
    count: number;
    keying: "relic_instance" | "target" | "source";
  }
  export interface SchedulePacketEffect {
    op: "schedule_packet";
    timing: "next_player_turn_start" | "next_enemy_phase_start";
    packet: Packet;
  }
  export interface Packet {
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
  }
  export interface RepeatPacketEffect {
    op: "repeat_packet";
    packetRef: string;
    multiplier: number;
    timing: "next_player_turn_start" | "next_enemy_phase_start";
  }
  export interface GainScrapEffect {
    op: "gain_scrap";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEvidenceEffect {
    op: "gain_evidence";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface ChangeStandingEffect {
    op: "change_standing";
    factionId: "office" | "union" | "broadcast";
    amount: number;
  }
  export interface SetFlagEffect {
    op: "set_flag";
    flagId: string;
    value: boolean | string | number;
  }
  export interface RemoveCardEffect {
    op: "remove_card";
    selection: {
      type: "selected_card";
    };
  }
  export interface UpgradeCardEffect {
    op: "upgrade_card";
    selection: {
      type: "selected_card";
    };
  }
  /**
   * This interface was referenced by `JointLiabilityEnemyDefinition`'s JSON-Schema
   * via the `definition` "CycleAi".
   */
  export interface CycleAi {
    kind: "cycle";
    /**
     * @minItems 1
     * @maxItems 32
     */
    moveIds: [LocalId, ...LocalId[]];
    startIndex: number;
  }
  /**
   * This interface was referenced by `JointLiabilityEnemyDefinition`'s JSON-Schema
   * via the `definition` "OpeningCycleAi".
   */
  export interface OpeningCycleAi {
    kind: "opening_cycle";
    openingMoveId: LocalId;
    /**
     * @minItems 1
     * @maxItems 32
     */
    moveIds: [LocalId, ...LocalId[]];
    startIndex: number;
  }
  /**
   * This interface was referenced by `JointLiabilityEnemyDefinition`'s JSON-Schema
   * via the `definition` "Phase".
   */
  export interface Phase {
    id: LocalId;
    hpAtMost: number;
    /**
     * @minItems 1
     * @maxItems 32
     */
    moveIds: [LocalId, ...LocalId[]];
  }
}

// Generated from schemas/event.schema.json
export namespace EventSchema {
  export type Effect =
    | DamageEffect
    | BlockEffect
    | HealEffect
    | ApplyStatusEffect
    | DrawEffect
    | GainEnergyEffect
    | SwapEffect
    | BoostImprintEffect
    | AddCardEffect
    | InstallProtocolEffect
    | SchedulePacketEffect
    | RepeatPacketEffect
    | GainScrapEffect
    | GainEvidenceEffect
    | ChangeStandingEffect
    | SetFlagEffect
    | RemoveCardEffect
    | UpgradeCardEffect;

  export interface JointLiabilityEventDefinition {
    schemaVersion: 1;
    id: string;
    title: string;
    body: string;
    eligibility: Predicate;
    /**
     * @minItems 1
     * @maxItems 3
     */
    choices: [Choice] | [Choice, Choice] | [Choice, Choice, Choice];
    weight: number;
    oncePerRun: boolean;
    followUpPlacement: "none" | "act_2_row_2" | "act_2_row_5";
  }
  export interface Predicate {
    has_flag?: string;
    standing_at_least?: StandingRequirement;
    has_card_tag?: "attack" | "skill" | "protocol" | "status" | "grafted";
    has_protocol?: boolean;
    has_graft?: boolean;
    can_pay?: PaymentRequirement;
    act_is?: "act_1" | "act_2";
    /**
     * @minItems 1
     * @maxItems 8
     */
    all?:
      | [Predicate]
      | [Predicate, Predicate]
      | [Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate];
    /**
     * @minItems 1
     * @maxItems 8
     */
    any?:
      | [Predicate]
      | [Predicate, Predicate]
      | [Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate]
      | [Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate, Predicate];
  }
  export interface StandingRequirement {
    factionId: "office" | "union" | "broadcast";
    amount: number;
  }
  export interface PaymentRequirement {
    resource: "owner_hp" | "front_hp" | "reserve_hp" | "scrap" | "evidence" | "energy";
    amount: number;
    minimumRemaining?: number;
  }
  /**
   * This interface was referenced by `JointLiabilityEventDefinition`'s JSON-Schema
   * via the `definition` "Choice".
   */
  export interface Choice {
    id: string;
    label: string;
    requirements: Predicate;
    /**
     * @maxItems 8
     */
    costs:
      | []
      | [Cost]
      | [Cost, Cost]
      | [Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost, Cost, Cost, Cost]
      | [Cost, Cost, Cost, Cost, Cost, Cost, Cost, Cost];
    /**
     * @maxItems 8
     */
    selections:
      | []
      | [Selection]
      | [Selection, Selection]
      | [Selection, Selection, Selection]
      | [Selection, Selection, Selection, Selection]
      | [Selection, Selection, Selection, Selection, Selection]
      | [Selection, Selection, Selection, Selection, Selection, Selection]
      | [Selection, Selection, Selection, Selection, Selection, Selection, Selection]
      | [Selection, Selection, Selection, Selection, Selection, Selection, Selection, Selection];
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
    consequenceSummary: ConsequenceSummary;
  }
  export interface Cost {
    resource: "owner_hp" | "front_hp" | "reserve_hp" | "scrap" | "evidence" | "energy";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    minimumRemaining?: number;
  }
  export interface ConstExpr {
    const: number;
  }
  export interface ParamExpr {
    param: string;
  }
  export interface StatExpr {
    stat:
      | "owner_hp"
      | "owner_max_hp"
      | "front_hp"
      | "front_max_hp"
      | "reserve_hp"
      | "reserve_max_hp"
      | "energy"
      | "imprint_potency"
      | "enemy_hp"
      | "enemy_max_hp"
      | "scrap"
      | "evidence";
  }
  export interface AddExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    add: [unknown, unknown];
  }
  export interface MultiplyExpr {
    /**
     * @minItems 2
     * @maxItems 2
     */
    multiply: [unknown, unknown];
  }
  /**
   * This interface was referenced by `JointLiabilityEventDefinition`'s JSON-Schema
   * via the `definition` "Selection".
   */
  export interface Selection {
    type: "character" | "card" | "relic" | "consumable" | "faction";
    required: boolean;
  }
  export interface DamageEffect {
    op: "damage";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    hits: number;
    category: "attack" | "reaction" | "direct" | "status";
  }
  export interface BlockEffect {
    op: "block";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface HealEffect {
    op: "heal";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
    recoveryCategory: "reaction" | "exhaust" | "consumable" | "other";
  }
  export interface ApplyStatusEffect {
    op: "apply_status";
    target:
      | "selected_enemy"
      | "all_enemies"
      | "front"
      | "reserve"
      | "both"
      | "locked_character"
      | "self"
      | "owner"
      | "intent_target"
      | "none";
    status: "bleed" | "poison" | "weak" | "exposed" | "strength";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface DrawEffect {
    op: "draw";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEnergyEffect {
    op: "gain_energy";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface SwapEffect {
    op: "swap";
    mode: "free" | "normal";
  }
  export interface BoostImprintEffect {
    op: "boost_imprint";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface AddCardEffect {
    op: "add_card";
    cardId: string;
    destination: "player_hand" | "player_discard" | "player_draw" | "player_exhaust" | "deployed";
    temporary: boolean;
  }
  export interface InstallProtocolEffect {
    op: "install_protocol";
    trigger: ProtocolTrigger;
  }
  export interface ProtocolTrigger {
    event: "after_source_lead" | "after_primary_reaction" | "after_swap" | "player_turn_start" | "enemy_phase_start";
    filter: Condition;
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
    limit: TriggerLimit;
    priority: number;
  }
  export interface Condition {
    target_has_status?: "bleed" | "poison" | "weak" | "exposed" | "strength";
    source_owner?: "source" | "shaper" | "crew";
    ingredient?: IngredientReference;
    event?: string;
    has_card_tag?: "attack" | "skill" | "protocol" | "status" | "grafted";
  }
  export interface IngredientReference {
    kind: "material" | "form";
    id: "gore" | "volt" | "rot" | "echo" | "needle" | "burst" | "siphon" | "loop";
  }
  export interface TriggerLimit {
    scope: "command" | "turn" | "combat" | "run";
    count: number;
    keying: "relic_instance" | "target" | "source";
  }
  export interface SchedulePacketEffect {
    op: "schedule_packet";
    timing: "next_player_turn_start" | "next_enemy_phase_start";
    packet: Packet;
  }
  export interface Packet {
    /**
     * @minItems 1
     * @maxItems 32
     */
    effects: [Effect, ...Effect[]];
  }
  export interface RepeatPacketEffect {
    op: "repeat_packet";
    packetRef: string;
    multiplier: number;
    timing: "next_player_turn_start" | "next_enemy_phase_start";
  }
  export interface GainScrapEffect {
    op: "gain_scrap";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface GainEvidenceEffect {
    op: "gain_evidence";
    amount: ConstExpr | ParamExpr | StatExpr | AddExpr | MultiplyExpr;
  }
  export interface ChangeStandingEffect {
    op: "change_standing";
    factionId: "office" | "union" | "broadcast";
    amount: number;
  }
  export interface SetFlagEffect {
    op: "set_flag";
    flagId: string;
    value: boolean | string | number;
  }
  export interface RemoveCardEffect {
    op: "remove_card";
    selection: {
      type: "selected_card";
    };
  }
  export interface UpgradeCardEffect {
    op: "upgrade_card";
    selection: {
      type: "selected_card";
    };
  }
  /**
   * This interface was referenced by `JointLiabilityEventDefinition`'s JSON-Schema
   * via the `definition` "ConsequenceSummary".
   */
  export interface ConsequenceSummary {
    immediate: string;
    delayed: string;
  }
}
// Stable public aliases for the root content contracts.
export type ValueExpr = CommonSchema.ValueExpr;
export type Effect = EffectSchema.Effect;
export type CardDefinition = CardSchema.JointLiabilityCardDefinition;
export type RelicDefinition = RelicSchema.JointLiabilityRelicDefinition;
export type EnemyDefinition = EnemySchema.JointLiabilityEnemyDefinition;
export type EventDefinition = EventSchema.JointLiabilityEventDefinition;
