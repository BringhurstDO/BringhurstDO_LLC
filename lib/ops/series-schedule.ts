// Suggested publish dates for a content series. Dates are local calendar days
// (YYYY-MM-DD) spaced across weeks. Phase 8B surfaces them on the publish calendar.

const WEEKDAY_OFFSETS: Record<number, number[]> = {
  1: [0],
  2: [0, 2],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    throw new Error("seriesStartDate must be YYYY-MM-DD.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("seriesStartDate is not a valid calendar date.");
  }

  return date;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addCalendarDays(date: Date, days: number) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function weekStartMonday(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function buildSeriesSchedule(input: {
  postsPerWeek: number;
  seriesStartDate: string;
  weekCount: number;
}) {
  const postsPerWeek = Math.min(6, Math.max(1, input.postsPerWeek));
  const weekCount = Math.min(8, Math.max(1, input.weekCount));
  const offsets = WEEKDAY_OFFSETS[postsPerWeek] ?? WEEKDAY_OFFSETS[3];
  const anchor = parseLocalDate(input.seriesStartDate);
  const monday = weekStartMonday(anchor);
  const anchorDate = input.seriesStartDate.trim();
  const dates: string[] = [];

  for (let week = 0; week < weekCount; week += 1) {
    for (let index = 0; index < postsPerWeek; index += 1) {
      const slotDate = addCalendarDays(
        monday,
        week * 7 + (offsets[index] ?? index),
      );
      const formatted = formatLocalDate(slotDate);

      if (formatted >= anchorDate) {
        dates.push(formatted);
      }
    }
  }

  return dates;
}

export function platformBodyMaxChars(platform: string) {
  switch (platform) {
    case "X":
      return 280;
    case "Facebook":
      return 63206;
    case "Instagram":
      return 2200;
    case "LinkedIn":
      return 1300;
    case "Email":
      return 2000;
    default:
      return 1300;
  }
}
