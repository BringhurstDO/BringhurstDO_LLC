import { DEFAULT_OPS_SCHEDULE_TIMEZONE } from "@/lib/ops/platform-schedule-defaults";

const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const OPS_AUTOPUBLISH_CATCH_UP_DAYS = 14;

export function parseCalendarDate(value: string) {
  const match = CALENDAR_DATE_RE.exec(value.trim());

  if (!match) {
    return null;
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
    return null;
  }

  return date;
}

export function calendarWeekdayIndex(
  dateStr: string,
  timeZone = DEFAULT_OPS_SCHEDULE_TIMEZONE,
) {
  const match = CALENDAR_DATE_RE.exec(dateStr.trim());

  if (!match) {
    return null;
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`));

  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };

  return map[weekday] ?? null;
}

export function isSundayDate(
  dateStr: string,
  timeZone = DEFAULT_OPS_SCHEDULE_TIMEZONE,
) {
  return calendarWeekdayIndex(dateStr, timeZone) === 0;
}

export function formatCalendarDateWithWeekday(
  dateStr: string,
  timeZone = DEFAULT_OPS_SCHEDULE_TIMEZONE,
) {
  const match = CALENDAR_DATE_RE.exec(dateStr.trim());

  if (!match) {
    return dateStr;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone,
    weekday: "short",
    year: "numeric",
  }).format(new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`));
}

export function calendarDaysBetween(left: string, right: string) {
  const leftDate = parseCalendarDate(left);
  const rightDate = parseCalendarDate(right);

  if (!leftDate || !rightDate) {
    return null;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((rightDate.getTime() - leftDate.getTime()) / msPerDay);
}

export function bumpSundayToMonday(
  dateStr: string,
  timeZone = DEFAULT_OPS_SCHEDULE_TIMEZONE,
) {
  if (!isSundayDate(dateStr, timeZone)) {
    return dateStr;
  }

  const parsed = parseCalendarDate(dateStr);

  if (!parsed) {
    return dateStr;
  }

  const copy = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  copy.setDate(copy.getDate() + 1);

  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function draftScheduleWarnings(input: {
  autopublishEnabled: boolean;
  postStatus: string;
  suggestedScheduledFor?: string;
  timeZone?: string;
}) {
  const warnings: string[] = [];
  const date = input.suggestedScheduledFor?.trim();
  const timeZone = input.timeZone ?? DEFAULT_OPS_SCHEDULE_TIMEZONE;

  if (!date || input.postStatus === "posted") {
    return warnings;
  }

  if (isSundayDate(date, timeZone)) {
    if (input.autopublishEnabled) {
      warnings.push(
        "Scheduled on Sunday — autopublish cron does not run Sundays. It will catch up on the next weekday morning run, or publish manually.",
      );
    } else {
      warnings.push(
        "Scheduled on Sunday — consider moving to Monday if you want a weekday post.",
      );
    }
  }

  return warnings;
}
