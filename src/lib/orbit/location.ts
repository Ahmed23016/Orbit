const timeZoneCache = new Map<string, string>();

export async function resolveTimeZone(latitude: number, longitude: number) {
  const cacheKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  const cached = timeZoneCache.get(cacheKey);

  if (cached) {
    return cached;
  }

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

  timeZoneCache.set(cacheKey, payload.timeZone);
  return payload.timeZone;
}
