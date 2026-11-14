# Ops hashtag pipeline

## Root cause

User hashtags were present in `sourceUpdate.summary`, deterministic draft bodies,
and the allowlisted payload sent to Gemini. The Gemini prompts previously said
hashtags were allowed sparingly, but did not instruct the model to preserve
user-supplied tags. A valid Gemini JSON response could therefore contain no
hashtags. Structured parsing and `sanitizePublishableBody` did not remove
hashtags; they accepted the already hashtag-free body. Preview, save, calendar,
and publisher code then consistently used that body.

Historical raw Gemini responses cannot be inspected because Ops intentionally
stores only AI run metadata and token/cost/safety results, not raw prompts or
responses. The regression fixture reproduces the observed failure with a raw
Gemini JSON response that omits all three input hashtags.

A secondary deterministic risk existed for X: excerpting a long source summary
could remove hashtags placed near the end before the AI request.

## Corrected flow

1. The source title and summary retain the operator's hashtags.
2. Deterministic platform drafts preserve and deduplicate source hashtags.
3. Gemini receives the source text, draft text, and an explicit preservation
   instruction. The operator can also enter `requiredHashtags`; those are stored
   separately so Gemini cannot remove them.
   The single-post and split-series builders both carry these required hashtags
   and approved mention records into every matching saved platform draft.
4. Immediately after JSON parsing, Ops reapplies source hashtags if Gemini
   omitted them, removes duplicate or unrelated generated tags, and respects
   platform limits: X 2, LinkedIn 3, Facebook 3, Instagram 5.
5. Preview and save continue to use `sanitizePublishableBody`, which permits
   hashtags.
6. Final API payload fields are `commentary` for LinkedIn, `text` for X,
   `caption` for Instagram, and `message`/`caption`/`description` for Facebook.
   LinkedIn hashtags remain plain `#Tag`, matching the Posts API commentary
   format.

## Mentions and tags

- Mentions are stored as operator-approved structured records with platform,
  entity type, exact public label, verified handle, and optional platform id.
- Gemini is explicitly prohibited from inventing names, handles, or ids.
- X and Instagram append verified `@handle` values. Instagram image and Reel
  containers also receive `user_tags` for approved media tags. An explicit
  **Collaborator invite** choice sends the verified username through Meta's
  `collaborators` field; it is never inferred by Gemini.
- LinkedIn uses the documented `@[Exact Name](urn:li:...)` annotation when a
  person or organization URN is supplied. Without a URN the name remains plain
  text, rather than being presented as a working tag.
- Facebook retains the approved public name/handle in post text. API-level
  tagging remains subject to Meta Page permissions and platform restrictions.

## Image overlay approval

Gemini may propose one optional 3-9 word `imageOverlayHeadline`. Applying the AI
proposal only places that text in the operator-controlled field. The operator
may edit it and must separately click **Render approved text on media** before a
new 1080x1080 branded JPEG is generated and stored. Captions, hashtags, URLs,
and mentions are never burned into the image. The renderer uses a fixed layout,
palette, and length limit; Gemini does not control typography or placement.

Operators can vary the approved rendering without exposing unrestricted design
controls:

- Five bounded presets: Editorial, Minimal, Centered, Quote, and Event.
- Square (1080x1080), portrait (1080x1350), and landscape (1200x630).
- Compact, standard, and large text scales.
- Automatic subject-aware crop or explicit center/top/bottom/left/right focus.
- Every rerender starts from the original clean image, and the operator can
  restore that original after comparing a rendered result.

## Verification

Run `npm run ops:check-hashtag-pipeline`. The test starts with
`#AMIA2026 #SyncSOAP #HealthcareAI`, simulates a Gemini response with no
hashtags, and verifies parsed proposals, publishable previews, required hashtag
reapplication, verified mentions, LinkedIn annotations, character limits,
deduplication, final text-bearing payloads for all four platforms, and a
1080x1080 overlay render. It does not call Gemini or any social publishing API.
