import type { JsonValue } from "./canonical";
import type { AuthoritativeState } from "./state";

export const COMMAND_ID_VERSION = 1 as const;
const COMMAND_ID_WIDTH = 12;

export type CommandId = `cmd-v${typeof COMMAND_ID_VERSION}-${string}`;

export interface EngineCommand<
  TType extends string = string,
  TPayload extends JsonValue = JsonValue,
> {
  readonly id: CommandId;
  readonly sequence: number;
  readonly type: TType;
  readonly payload: TPayload;
}

function assertSequence(sequence: number): void {
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new RangeError("Command sequence must be a positive safe integer.");
  }
}

function assertType(type: string): void {
  if (type.length === 0) {
    throw new RangeError("Command type cannot be empty.");
  }
}

export function createCommandId(sequence: number): CommandId {
  assertSequence(sequence);
  return `cmd-v${COMMAND_ID_VERSION}-${sequence.toString(10).padStart(COMMAND_ID_WIDTH, "0")}`;
}

export function createCommand<
  TType extends string,
  TPayload extends JsonValue,
>(
  state: AuthoritativeState,
  type: TType,
  payload: TPayload,
): EngineCommand<TType, TPayload> {
  assertType(type);
  const sequence = state.commandSequence + 1;
  return {
    id: createCommandId(sequence),
    sequence,
    type,
    payload,
  };
}

export function commitCommand(
  state: AuthoritativeState,
  command: EngineCommand,
): AuthoritativeState {
  const expectedSequence = state.commandSequence + 1;
  const expectedId = createCommandId(expectedSequence);

  if (command.sequence !== expectedSequence || command.id !== expectedId) {
    throw new Error(
      `Command ordering violation: expected ${expectedId} at sequence ${expectedSequence}.`,
    );
  }

  return {
    ...state,
    commandSequence: expectedSequence,
  };
}
