// provide utils for
// - creating universal timestamps to save in the db as text (include timezone)
// - parsing those timestamps (include timezone)
// - same for dates (w/o time)
// - and durations

// use date-fns when appropriate


export function toISOTimestamp(date: Date): string {
  return date.toISOString();
}

export function fromISOTimestamp(isoString: string): Date {
  return new Date(isoString);
}

export function toISODate(date: Date): string {
    return date.toISOString().split("T")[0];
}

export function fromISODate(isoString: string): Date {
    return new Date(isoString);
}