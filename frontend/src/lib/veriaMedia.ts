export const VERIA_SLOGAN = "Verifiable intelligence for autonomous agents";

export const AGENT_STILLS = [
  "/veria-bot-alpha.jpg",
  "/veria-bot-signal.jpg",
  "/veria-bot-atlas.jpg",
] as const;

export function agentStillFor(index: number) {
  return AGENT_STILLS[Math.abs(index) % AGENT_STILLS.length];
}
