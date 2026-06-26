import type { OpsTone, PublicationPlatform } from "@/lib/ops/types";

export type OpsPlatformReadinessStatus =
  | "ready_for_manual_ops"
  | "partially_connected"
  | "blocked_external_review"
  | "planned_not_connected"
  | "not_planned";

export type OpsPlatformReadinessItem = {
  allowedNow: string[];
  blockedBy: string[];
  nextOperatorAction: string;
  platform: PublicationPlatform;
  status: OpsPlatformReadinessStatus;
  statusLabel: string;
  tone: OpsTone;
};

export const OPS_PLATFORM_READINESS: OpsPlatformReadinessItem[] = [
  {
    allowedNow: [
      "Manual drafts, UTM links, package export/import, metrics entry",
      "Server-only OAuth and approved publishing for configured accounts",
      "Daily approved-and-opted-in autopublish for connected LinkedIn, X, Facebook, and Instagram",
    ],
    blockedBy: [
      "Organization page posting requires LinkedIn Community Management API approval",
      "Each account must be connected separately before publishing or resharing",
    ],
    nextOperatorAction:
      "When at the computer, connect each approved LinkedIn account from /ops/accounts and verify the LinkedIn app product approvals.",
    platform: "LinkedIn",
    status: "partially_connected",
    statusLabel: "LinkedIn partially connected",
    tone: "watch",
  },
  {
    allowedNow: [
      "Manual target planning, deterministic/AI draft generation, UTM links",
      "Manual posted tracking and aggregate metric entry",
    ],
    blockedBy: [
      "No X OAuth app is connected",
      "No X posting API approval is configured",
      "No X autopublish boundary has been approved",
    ],
    nextOperatorAction:
      "Connect X from /ops/accounts after setting OPS_X_ENABLED=true and X_* env vars. Approve drafts before publishing.",
    platform: "X",
    status: "planned_not_connected",
    statusLabel: "X ready to connect",
    tone: "watch",
  },
  {
    allowedNow: [
      "Manual target planning, deterministic/AI draft generation, UTM links",
      "Operator-approved publish and scheduled autopublish when Meta is connected",
      "Attach approved product screenshots per Instagram draft before publish",
    ],
    blockedBy: [
      "Meta app needs instagram_content_publish in Business Login config",
      "Instagram API requires a public HTTPS image on every post",
    ],
    nextOperatorAction:
      "Connect all Facebook Pages on /ops/accounts, approve Instagram drafts on the calendar, and enable autopublish per draft.",
    platform: "Instagram",
    status: "partially_connected",
    statusLabel: "Instagram ready when Meta Pages connect",
    tone: "watch",
  },
  {
    allowedNow: [
      "Manual page target planning, deterministic/AI draft generation, UTM links",
      "Operator-approved publish and scheduled autopublish when Meta Pages are connected",
    ],
    blockedBy: [
      "Meta app needs pages_manage_posts and instagram_content_publish",
      "Each brand Page must be connected on /ops/accounts",
    ],
    nextOperatorAction:
      "Connect all Facebook Pages, approve drafts on the calendar, and enable autopublish per Facebook draft.",
    platform: "Facebook",
    status: "partially_connected",
    statusLabel: "Facebook ready when Meta Pages connect",
    tone: "watch",
  },
  {
    allowedNow: ["Manual draft planning and UTM links"],
    blockedBy: [
      "No blog CMS integration exists",
      "No website publishing mutation has been approved",
    ],
    nextOperatorAction:
      "Use manual copy/export workflows until a CMS target is explicitly selected.",
    platform: "Blog",
    status: "not_planned",
    statusLabel: "Blog integration not planned",
    tone: "neutral",
  },
  {
    allowedNow: ["Manual draft planning and UTM links"],
    blockedBy: [
      "No email provider integration exists",
      "No list, audience, or send mutation has been approved",
    ],
    nextOperatorAction:
      "Keep email as manual/export-only until a provider and consent model are selected.",
    platform: "Email",
    status: "not_planned",
    statusLabel: "Email integration not planned",
    tone: "neutral",
  },
];
