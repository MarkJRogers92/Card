import type { JsonValue } from "./canonical";
import type { EngineCommand } from "./commands";

export const EVENT_RECORD_VERSION = 1 as const;
const EVENT_INDEX_WIDTH = 4;

export type EventId = `evt-v${typeof EVENT_RECORD_VERSION}-${string}`;

export interface EngineEventDraft<
  TType extends string = string,
  TPayload extends JsonValue = JsonValue,
> {
  readonly type: TType;
  readonly payload: TPayload;
}

export interface EngineEventRecord<
  TType extends string = string,
  TPayload extends JsonValue = JsonValue,
> {
  readonly eventVersion: typeof EVENT_RECORD_VERSION;
  readonly id: EventId;
  readonly commandId: EngineCommand["id"];
  readonly commandSequence: number;
  readonly index: number;
  readonly type: TType;
  readonly payload: TPayload;
}

function createEventId(command: EngineCommand, index: number): EventId {
  if (!Number.isSafeInteger(index) || index <= 0) {
    throw new RangeError("Event index must be a positive safe integer.");
  }
  return `evt-v${EVENT_RECORD_VERSION}-${command.sequence
    .toString(10)
    .padStart(12, "0")}-${index.toString(10).padStart(EVENT_INDEX_WIDTH, "0")}`;
}

export function createEventRecords(
  command: EngineCommand,
  drafts: readonly EngineEventDraft[],
): readonly EngineEventRecord[] {
  return drafts.map((draft, offset) => {
    if (draft.type.length === 0) {
      throw new RangeError("Event type cannot be empty.");
    }
    const index = offset + 1;
    return {
      eventVersion: EVENT_RECORD_VERSION,
      id: createEventId(command, index),
      commandId: command.id,
      commandSequence: command.sequence,
      index,
      type: draft.type,
      payload: draft.payload,
    };
  });
}
