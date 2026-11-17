import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  autopublishDraftMissedWindow,
  type PublishCalendarRow,
} from "../lib/ops/publish-calendar";
import { scheduleBucketHasReached } from "../lib/ops/platform-schedule-defaults";

const baseRow: PublishCalendarRow = {
  accountName: "Test account",
  autopublishEnabled: true,
  body: "Approved test copy",
  bodyPreview: "Approved test copy",
  calendarDate: "2026-11-16",
  contentPackageId: "package-test",
  draftId: "draft-test",
  draftStatus: "approved",
  generatedUrl: "",
  packageTitle: "Test package",
  platform: "LinkedIn",
  postStatus: "not posted",
  postedUrl: "",
  projectId: "bringhurstdo",
  publicationTargetId: "target-test",
  suggestedScheduleBucketId: "morning",
  suggestedScheduledFor: "2026-11-16",
  scheduleWarnings: [],
  timing: "today",
  title: "Test draft",
};

assert.equal(
  autopublishDraftMissedWindow(baseRow, {
    reference: new Date("2026-11-16T14:14:00.000Z"),
  }),
  false,
  "A 09:14 America/New_York draft must remain inside the morning window.",
);
assert.equal(
  autopublishDraftMissedWindow(baseRow, {
    reference: new Date("2026-11-16T14:15:00.000Z"),
  }),
  true,
  "A 09:15 America/New_York draft must be flagged after the morning window.",
);
assert.equal(
  autopublishDraftMissedWindow(
    { ...baseRow, postStatus: "posted" },
    { reference: new Date("2026-11-16T14:30:00.000Z") },
  ),
  false,
  "A posted draft must never be flagged.",
);
assert.equal(
  autopublishDraftMissedWindow(
    { ...baseRow, draftStatus: "drafted" },
    { reference: new Date("2026-11-16T14:30:00.000Z") },
  ),
  false,
  "An unapproved draft must never be flagged as a missed autopublish.",
);

assert.equal(
  scheduleBucketHasReached("midday", "midday"),
  true,
  "A scheduled bucket must be eligible in its own window.",
);
assert.equal(
  scheduleBucketHasReached("afternoon", "midday"),
  true,
  "A failed midday draft must be eligible in the next later same-day bucket.",
);
assert.equal(
  scheduleBucketHasReached("late-evening", "midday"),
  true,
  "A failed midday draft must remain eligible in later same-day buckets.",
);
assert.equal(
  scheduleBucketHasReached("morning", "midday"),
  false,
  "An earlier bucket must not publish a later scheduled draft.",
);

async function checkVercelSchedules() {
  const vercelConfig = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ) as {
    crons?: unknown[];
    schedules?: Record<string, {
      path: string;
      requestMethod: string;
      schedule: string;
      timezone: string;
    }>;
  };

  assert.equal(vercelConfig.crons, undefined, "Legacy cron jobs must be removed.");
  const schedules = Object.entries(vercelConfig.schedules ?? {});
  assert.equal(schedules.length, 7, "Seven schedules must be configured.");
  assert.deepEqual(
    schedules.slice(0, 5).map(([, schedule]) => schedule.schedule),
    ["0 9 * * 1-6", "0 12 * * 1-6", "0 15 * * 1-6", "0 18 * * 1-6", "0 21 * * 1-6"],
    "Autopublish schedules must retain the five operator-selected local times.",
  );
  for (const [name, schedule] of schedules) {
    assert.match(name, /^[0-9A-Za-z][0-9A-Za-z._-]*$/);
    assert.equal(schedule.requestMethod, "GET");
    assert.equal(schedule.timezone, "America/New_York");
  }
}

checkVercelSchedules()
  .then(() => console.log("Autopublish schedule checks passed."))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
