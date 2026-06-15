import "server-only";

import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";
import { resolveLinkedInConfig } from "@/lib/ops/linkedin-config";
import type { OpsAutopublishPublicStatus } from "@/lib/ops/types";

export function autopublishTimezone() {
  const configured = process.env.OPS_AUTOPUBLISH_TIMEZONE?.trim();

  return configured || "America/New_York";
}

export function calendarDateInTimezone(
  timeZone: string,
  reference = new Date(),
) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(reference);
}

/** Vercel cron for autopublish runs daily at 14:00 UTC (`vercel.json`). */
export const OPS_AUTOPUBLISH_CRON_UTC_HOUR = 14;

export function autopublishRunTimeLabel(
  timeZone: string,
  utcHour = OPS_AUTOPUBLISH_CRON_UTC_HOUR,
  reference = new Date(),
) {
  const runReference = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
      utcHour,
      0,
      0,
    ),
  );

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(runReference);
}

export function resolveAutopublishConfig() {
  const enabledFlag =
    process.env.OPS_AUTOPUBLISH_ENABLED?.trim().toLowerCase() === "true";
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const databaseConfigured = databasePersistenceConfigured();
  const linkedInConfig = resolveLinkedInConfig();

  if (!enabledFlag) {
    return {
      enabled: false,
      reason: "OPS_AUTOPUBLISH_ENABLED is not true.",
    } as const;
  }

  if (!databaseConfigured) {
    return {
      enabled: false,
      reason: "Autopublish requires OPS_STORAGE_MODE=database and DATABASE_URL.",
    } as const;
  }

  if (!linkedInConfig.ok) {
    return {
      enabled: false,
      reason: linkedInConfig.reason,
    } as const;
  }

  if (!cronSecretConfigured) {
    return {
      enabled: false,
      reason: "CRON_SECRET is required for the scheduled autopublish cron route.",
    } as const;
  }

  return {
    enabled: true,
    linkedInConfig: linkedInConfig.config,
    timeZone: autopublishTimezone(),
  } as const;
}

export function getAutopublishPublicStatus(): OpsAutopublishPublicStatus {
  const resolved = resolveAutopublishConfig();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  return {
    cronConfigured: cronSecretConfigured,
    disabledReason: resolved.enabled ? null : resolved.reason,
    enabled: resolved.enabled,
    linkedInOnly: true,
    manualReviewRequired: false,
    platform: "LinkedIn",
    requiresDraftOptIn: true,
    requiresDraftStatus: "approved",
    runTimeLabel: autopublishRunTimeLabel(autopublishTimezone()),
    timeZone: autopublishTimezone(),
  };
}
