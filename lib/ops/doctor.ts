import "server-only";

import { getOpsAiPublicStatus } from "@/lib/ops/ai-config";
import { getAutopublishPublicStatus } from "@/lib/ops/autopublish-config";
import type { ContentWorkflowSnapshot } from "@/lib/ops/content-workflow-snapshot";
import { resolveLinkedInConfig } from "@/lib/ops/linkedin-config";
import { resolveMetaConfig } from "@/lib/ops/meta-config";
import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";
import {
  loadSocialConnection,
  toPublicConnectionStatus,
} from "@/lib/ops/social-connections-db";
import type {
  OpsTone,
  SocialConnectionPlatform,
  SocialConnectionPublicStatus,
} from "@/lib/ops/types";
import { resolveXConfig } from "@/lib/ops/x-config";

export type OpsDoctorItem = {
  id: string;
  label: string;
  tone: OpsTone;
  status: string;
  summary: string;
  nextAction: string;
  href?: string;
};

export type OpsDoctorSummary = {
  generatedAt: string;
  headline: string;
  headlineTone: OpsTone;
  items: OpsDoctorItem[];
  counts: Record<OpsTone, number>;
};

type SocialConfig =
  | {
      ok: true;
      config: {
        accounts: Array<{
          accountId: string;
          authorType: SocialConnectionPublicStatus["configuredAuthorType"];
          label: string;
        }>;
      };
    }
  | { ok: false; reason: string };

function itemCounts(items: OpsDoctorItem[]) {
  return items.reduce(
    (counts, item) => ({
      ...counts,
      [item.tone]: counts[item.tone] + 1,
    }),
    { blocked: 0, good: 0, neutral: 0, watch: 0 } satisfies Record<OpsTone, number>,
  );
}

async function socialStatusItem({
  config,
  href,
  oauthImplemented,
  platform,
}: {
  config: SocialConfig;
  href: string;
  oauthImplemented: boolean;
  platform: SocialConnectionPlatform;
}): Promise<OpsDoctorItem> {
  if (!config.ok) {
    return {
      href,
      id: `social-${platform.toLowerCase()}`,
      label: `${platform} readiness`,
      nextAction:
        platform === "Meta"
          ? "Keep Meta marked as readiness-only until Business verification, app review, and OAuth implementation are complete."
          : "Complete the server env and durable-storage requirements, then connect accounts from Ops Accounts.",
      status: platform === "Meta" ? "Future connection blocked" : "Not configured",
      summary: config.reason,
      tone: platform === "Meta" ? "watch" : "blocked",
    };
  }

  if (!oauthImplemented) {
    return {
      href,
      id: `social-${platform.toLowerCase()}`,
      label: `${platform} readiness`,
      nextAction:
        "Finish the OAuth/connect implementation after platform approval before treating Meta as a usable data or publishing source.",
      status: "Config scaffold only",
      summary: `${config.config.accounts.length} account target${
        config.config.accounts.length === 1 ? "" : "s"
      } configured; browser OAuth is not implemented yet.`,
      tone: "watch",
    };
  }

  try {
    const statuses = await Promise.all(
      config.config.accounts.map(async (account) =>
        toPublicConnectionStatus(
          platform,
          account,
          true,
          null,
          await loadSocialConnection(platform, account.accountId),
        ),
      ),
    );
    const connected = statuses.filter((status) => status.connected).length;
    const expired = statuses.filter((status) => status.expired).length;
    const total = statuses.length;

    if (connected > 0) {
      return {
        href,
        id: `social-${platform.toLowerCase()}`,
        label: `${platform} readiness`,
        nextAction:
          expired > 0
            ? "Reconnect expired accounts before relying on scheduled publishing."
            : "Use manual approval for every publish action and keep connection status monitored.",
        status: `${connected}/${total} connected`,
        summary:
          expired > 0
            ? `${expired} configured account${expired === 1 ? "" : "s"} need reconnection.`
            : "At least one configured account has a non-expired stored connection.",
        tone: expired > 0 ? "watch" : "good",
      };
    }

    return {
      href,
      id: `social-${platform.toLowerCase()}`,
      label: `${platform} readiness`,
      nextAction: "Connect an account from Ops Accounts when publishing is approved.",
      status: "Configured, not connected",
      summary: `${total} account target${total === 1 ? "" : "s"} configured with no active stored connection.`,
      tone: "watch",
    };
  } catch (error) {
    return {
      href,
      id: `social-${platform.toLowerCase()}`,
      label: `${platform} readiness`,
      nextAction:
        "Check durable storage and the social connection table before reconnecting accounts.",
      status: "Status read failed",
      summary:
        error instanceof Error
          ? error.message
          : `Unable to load ${platform} connection status.`,
      tone: "blocked",
    };
  }
}

export async function buildOpsDoctorSummary(
  snapshot: ContentWorkflowSnapshot,
): Promise<OpsDoctorSummary> {
  const databaseReady = databasePersistenceConfigured();
  const autopublish = getAutopublishPublicStatus();
  const ai = getOpsAiPublicStatus();
  const items: OpsDoctorItem[] = [
    {
      href: "/ops/content/new",
      id: "storage",
      label: "Durable storage",
      nextAction: databaseReady
        ? "Keep JSON exports until backup/restore is verified."
        : "Set OPS_STORAGE_MODE=database and DATABASE_URL before relying on server-side packages.",
      status: databaseReady ? "Database mode" : "Local browser fallback",
      summary: databaseReady
        ? "Server-side content packages can be read from the Ops database."
        : "Server exports and overview stats cannot see browser-local packages.",
      tone: databaseReady ? "good" : "watch",
    },
    {
      href: "/ops/content/calendar",
      id: "content-workflow",
      label: "Content workflow",
      nextAction:
        snapshot.packageCount > 0
          ? "Review overdue/today drafts before creating more content."
          : "Create or import packages before treating the calendar as operational.",
      status:
        snapshot.overdue > 0
          ? `${snapshot.overdue} overdue`
          : `${snapshot.packageCount} packages`,
      summary: `${snapshot.today} due today, ${snapshot.approvedPending} approved pending, ${snapshot.autopublishEnabled} opted into autopublish.`,
      tone:
        snapshot.overdue > 0
          ? "blocked"
          : snapshot.packageCount > 0
            ? "good"
            : "watch",
    },
    {
      href: "/ops/content/calendar",
      id: "autopublish",
      label: "Scheduled publishing",
      nextAction: autopublish.enabled
        ? "Confirm each draft is approved and opted in before scheduled windows run."
        : "Leave disabled until DB, platform connections, CRON_SECRET, and explicit publish approval are all in place.",
      status: autopublish.enabled ? "Enabled" : "Disabled",
      summary: autopublish.enabled
        ? `${autopublish.platforms.join(", ")} scheduled around ${autopublish.runTimeLabel}.`
        : (autopublish.disabledReason ?? "Autopublish is disabled."),
      tone:
        snapshot.autopublishEnabled > 0 && !autopublish.enabled
          ? "blocked"
          : autopublish.enabled
            ? "good"
            : "watch",
    },
    {
      href: "/ops/content/new",
      id: "ai-generation",
      label: "AI draft helper",
      nextAction: ai.enabled
        ? "Keep AI inputs limited to the allowlisted public marketing context."
        : "Enable only after choosing a provider and confirming public-safe context boundaries.",
      status: ai.enabled ? `${ai.provider} enabled` : "Disabled",
      summary: ai.enabled
        ? `Model: ${ai.model}. Manual review is still required.`
        : (ai.disabledReason ?? "Ops AI generation is disabled."),
      tone: ai.enabled ? "good" : "watch",
    },
  ];

  items.push(
    await socialStatusItem({
      config: resolveLinkedInConfig(),
      href: "/ops/accounts",
      oauthImplemented: true,
      platform: "LinkedIn",
    }),
  );
  items.push(
    await socialStatusItem({
      config: resolveXConfig(),
      href: "/ops/accounts",
      oauthImplemented: true,
      platform: "X",
    }),
  );
  items.push(
    await socialStatusItem({
      config: resolveMetaConfig(),
      href: "/ops/accounts",
      oauthImplemented: false,
      platform: "Meta",
    }),
  );

  const counts = itemCounts(items);
  const headlineTone: OpsTone =
    counts.blocked > 0 ? "blocked" : counts.watch > 0 ? "watch" : "good";
  const headline =
    counts.blocked > 0
      ? `${counts.blocked} blocked item${counts.blocked === 1 ? "" : "s"} need attention`
      : counts.watch > 0
        ? `${counts.watch} watch item${counts.watch === 1 ? "" : "s"} before the system is fully ready`
        : "All checked Ops systems are ready";

  return {
    counts,
    generatedAt: new Date().toISOString(),
    headline,
    headlineTone,
    items,
  };
}
