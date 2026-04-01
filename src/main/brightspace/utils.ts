export function parseDate(dateStr: string): Date {
  const normalized = dateStr.replace(" at ", " ");
  const date = new Date(normalized);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return date;
}
