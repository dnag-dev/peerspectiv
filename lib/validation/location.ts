// SA-040: shared city/state validator for the locations form. Lives in lib/
// (not the route file) because Next.js route.ts only allows route-handler
// exports. Returns null when valid, or an error string when invalid.

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR","GU","VI","AS","MP",
]);

export function validateLocationInput(city?: unknown, state?: unknown): string | null {
  if (city !== undefined && city !== null && city !== "") {
    if (typeof city !== "string") return "city must be a string";
    const c = city.trim();
    if (c.length < 2) return "city must be at least 2 characters";
    if (!/^[A-Za-z][A-Za-z\s.'\-]+$/.test(c)) {
      return "city contains invalid characters";
    }
  }
  if (state !== undefined && state !== null && state !== "") {
    if (typeof state !== "string") return "state must be a string";
    const s = state.trim().toUpperCase();
    if (!US_STATES.has(s)) return "state must be a 2-letter US postal code (e.g. NY, CA)";
  }
  return null;
}
