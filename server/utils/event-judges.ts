export interface EventJudge {
  name: string;
}

export function parseEventJudges(value: unknown): EventJudge[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid judges payload: expected an array");
  }

  for (const judge of parsed) {
    if (
      typeof judge !== "object" ||
      judge === null ||
      typeof (judge as { name?: unknown }).name !== "string" ||
      (judge as { name: string }).name.trim().length === 0
    ) {
      throw new Error("Invalid judges payload: each judge must have a name");
    }
  }

  return parsed as EventJudge[];
}
