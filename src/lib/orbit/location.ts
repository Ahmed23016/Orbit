export async function resolveTimeZone(latitude: number, longitude: number) {
  const response = await fetch(
    `https://timeapi.io/api/TimeZone/coordinate?latitude=${latitude}&longitude=${longitude}`
  );

  if (!response.ok) {
    throw new Error("Could not resolve time zone");
  }

  const payload = (await response.json()) as { timeZone?: string };

  if (!payload.timeZone) {
    throw new Error("No time zone returned");
  }

  return payload.timeZone;
}
