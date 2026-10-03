const INSTRUCTION =
  /ignore (the )?(mandate|budget|limits?)|pay now|initiate (a )?payment|change (the )?budget|override (the )?(limit|mandate)/i;

export function looksLikeInstruction(text: string): boolean {
  return INSTRUCTION.test(text);
}
