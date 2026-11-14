"use client";

import type { OpsSocialMention } from "@/lib/ops/types";

type SavedSocialMentionPickerProps = {
  mentions: OpsSocialMention[];
  onSelect: (mention: OpsSocialMention) => void;
};

function mentionDetail(mention: OpsSocialMention) {
  if (mention.handle) {
    return `@${mention.handle}`;
  }

  if (mention.platformId) {
    return "verified platform ID";
  }

  return "name only";
}

export function SavedSocialMentionPicker({
  mentions,
  onSelect,
}: SavedSocialMentionPickerProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      Saved people and organizations
      <select
        value=""
        disabled={mentions.length === 0}
        onChange={(event) => {
          const index = Number.parseInt(event.target.value, 10);
          const mention = mentions[index];

          if (mention) {
            onSelect(mention);
          }
        }}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
      >
        <option value="">
          {mentions.length > 0
            ? "Choose a saved mention"
            : "No saved mentions yet"}
        </option>
        {mentions.map((mention, index) => (
          <option key={`${mention.platform}-${mention.id}`} value={index}>
            {mention.label} - {mention.platform} ({mentionDetail(mention)})
          </option>
        ))}
      </select>
      <span className="text-xs font-normal leading-5 text-slate-500">
        Saved identities come from approved mentions in prior packages. Reusing
        one leaves Approved off until you confirm it for this content.
      </span>
    </label>
  );
}
