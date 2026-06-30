import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const syncsoapLogoPath = path.join(root, "syncsoap-logo.svg");
const outDir = path.join(root, "public", "ops-ig");

const COLORS = {
  accent: "#00A3DA",
  border: "#dbe4ef",
  muted: "#64748b",
  navy: "#0f172a",
  washBottom: "#ffffff",
  washMid: "#fbfdff",
  washTop: "#f0f7fc",
};

const SLIDES = [
  {
    id: "syncsoap-progress-ig-01-cover",
    file: "syncsoap-progress-ig-01-cover.png",
    label: "SyncSOAP progress — cover",
    eyebrow: "Development progress",
    title: "Pilot-ready healthcare documentation",
    subtitle:
      "Product, study, vision, security, compliance, evidence, and deployment — verified on demo.",
    bullets: [],
    variant: "cover",
  },
  {
    id: "syncsoap-progress-ig-02-product",
    file: "syncsoap-progress-ig-02-product.png",
    label: "SyncSOAP progress — product & workflow",
    eyebrow: "Product & clinical workflow",
    title: "Scribe workflow, deeper",
    subtitle: "Core encounter experience and note quality",
    bullets: [
      "Expanded scribe workflow and encounter experience",
      "Improved SOAP generation and structured extraction",
      "Encounter phase and attestation support",
      "Admin, workspace, dashboard, and export improvements",
    ],
  },
  {
    id: "syncsoap-progress-ig-03-study",
    file: "syncsoap-progress-ig-03-study.png",
    label: "SyncSOAP progress — study & evaluation",
    eyebrow: "Study & evaluation",
    title: "Controlled evaluation workflow",
    subtitle: "Study infrastructure and IRB-ready materials",
    bullets: [
      "Structured study start, case, completion, and admin flows",
      "Study APIs for cases, timing, scoring, and exports",
      "IRB drafts: consent, eligibility, rubrics, and dictionaries",
      "Demo verified: /study/start is live",
    ],
  },
  {
    id: "syncsoap-progress-ig-04-vision",
    file: "syncsoap-progress-ig-04-vision.png",
    label: "SyncSOAP progress — image & vision",
    eyebrow: "Image & vision workflow",
    title: "Image-aware documentation",
    subtitle: "Upload paths, camera UX, and vision policy",
    bullets: [
      "Blob upload, presign, stream, proxy, and read-url routes",
      "Medical camera and encounter image card improvements",
      "Vision policy, provider logic, and de-ID helpers",
      "Vision routing docs and policy tests",
    ],
  },
  {
    id: "syncsoap-progress-ig-05-lesion",
    file: "syncsoap-progress-ig-05-lesion.png",
    label: "SyncSOAP progress — lesion assistant",
    eyebrow: "Lesion-description assistant",
    title: "Dermatology documentation support",
    subtitle: "Assistant component and API verified in demo",
    bullets: [
      "Lesion-description assistant UI component",
      "API route with service, config, and compose logic",
      "Documentation for clinical use and integration",
      "Endpoint behavior verified on demo deployment",
    ],
  },
  {
    id: "syncsoap-progress-ig-06-ai",
    file: "syncsoap-progress-ig-06-ai.png",
    label: "SyncSOAP progress — AI governance",
    eyebrow: "AI & model governance",
    title: "Stronger model controls",
    subtitle: "Policy, registry, and validation",
    bullets: [
      "Model policy, registry, and production allowlist",
      "SOAP validation logic and eval cases",
      "Updated FM extraction and generation pipelines",
      "Retired legacy specialty-enhancement eval paths",
    ],
  },
  {
    id: "syncsoap-progress-ig-07-security",
    file: "syncsoap-progress-ig-07-security.png",
    label: "SyncSOAP progress — security & compliance",
    eyebrow: "Security, privacy & compliance",
    title: "HIPAA-aligned readiness",
    subtitle: "Documentation, controls, and safeguards",
    bullets: [
      "Expanded BAA, data flow, SRA, and readiness checklists",
      "PHI handling SOP and controls traceability matrix",
      "Upload safeguard verification and MFA policy",
      "Production guardrails and security static tests",
    ],
  },
  {
    id: "syncsoap-progress-ig-08-evidence",
    file: "syncsoap-progress-ig-08-evidence.png",
    label: "SyncSOAP progress — evidence & audit",
    eyebrow: "Evidence & audit readiness",
    title: "Audit-ready artifacts",
    subtitle: "Collection scaffolding and questionnaire support",
    bullets: [
      "Local and AWS evidence collection scaffolding",
      "Evidence index, templates, and run manifest layout",
      "Security questionnaire maps and gap tracker",
      "Scheduled tasks for evidence automation",
    ],
  },
  {
    id: "syncsoap-progress-ig-09-deploy",
    file: "syncsoap-progress-ig-09-deploy.png",
    label: "SyncSOAP progress — deployment",
    eyebrow: "Infrastructure & deployment",
    title: "Demo redeploy verified",
    subtitle: "Docker, ECR, ECS, and live route checks",
    bullets: [
      "Docker image built, pushed to ECR, and redeployed",
      "ECS service stability confirmed after rollout",
      "Homepage, health, study start, and lesion routes live",
      "Runtime config and transcription IAM docs updated",
    ],
  },
  {
    id: "syncsoap-progress-ig-10-summary",
    file: "syncsoap-progress-ig-10-summary.png",
    label: "SyncSOAP progress — summary",
    eyebrow: "Overall state",
    title: "Beyond AI note generation",
    subtitle: "A broader pilot-ready documentation platform",
    bullets: [
      "Study and evaluation infrastructure",
      "Image-aware and lesion-description workflows",
      "Compliance, evidence, and security scaffolding",
      "Admin, workspace, and verified demo deployment",
    ],
    variant: "cta",
  },
];

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function bulletBlock(bullets, startY) {
  if (!bullets.length) {
    return "";
  }

  const lineHeight = 54;
  const bulletX = 118;
  const textX = 152;
  const maxWidth = 860;

  return bullets
    .map((bullet, index) => {
      const y = startY + index * lineHeight;

      return `<circle cx="${bulletX}" cy="${y - 14}" r="6" fill="${COLORS.accent}"/>
  <text x="${textX}" y="${y}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="28" font-weight="500" fill="${COLORS.navy}">
    <tspan x="${textX}" dy="0">${escapeXml(bullet)}</tspan>
  </text>`;
    })
    .join("\n  ");
}

function slideSvg(slide, slideIndex, totalSlides) {
  const isCover = slide.variant === "cover";
  const isCta = slide.variant === "cta";
  const titleSize = isCover ? 58 : 50;
  const titleY = isCover ? 430 : 404;
  const subtitleY = isCover ? 510 : 468;
  const bulletsStartY = isCover ? 0 : 548;
  const pillY = isCover ? 600 : 0;

  const pills = isCover
    ? ["Product", "Study", "Vision", "Security"]
        .map((label, index) => {
          const x = 170 + index * 190;
          return `<rect x="${x}" y="${pillY}" width="170" height="44" rx="22" fill="#ffffff" stroke="${COLORS.border}" stroke-width="1.5"/>
  <text x="${x + 85}" y="${pillY + 29}" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="${COLORS.navy}">${label}</text>`;
        })
        .join("\n  ")
    : "";

  const ctaBlock = isCta
    ? `<rect x="290" y="860" width="500" height="72" rx="36" fill="${COLORS.accent}"/>
  <text x="540" y="906" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="28" font-weight="800" fill="#ffffff">syncsoap.com</text>`
    : `<text x="540" y="998" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="${COLORS.navy}">syncsoap.com</text>`;

  return Buffer.from(`<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.washTop}"/>
      <stop offset="55%" stop-color="${COLORS.washMid}"/>
      <stop offset="100%" stop-color="${COLORS.washBottom}"/>
    </linearGradient>
    <radialGradient id="softBlue" cx="84%" cy="18%" r="42%">
      <stop offset="0%" stop-color="#dbeafe" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#dbeafe" stop-opacity="0"/>
    </radialGradient>
    <pattern id="hexes" width="56" height="48" patternUnits="userSpaceOnUse" patternTransform="scale(1.15)">
      <path d="M28 2 L52 16 L52 32 L28 46 L4 32 L4 16 Z" fill="none" stroke="#cbd5e1" stroke-width="1" opacity="0.28"/>
    </pattern>
  </defs>

  <rect width="1080" height="1080" fill="url(#page)"/>
  <rect width="1080" height="1080" fill="url(#softBlue)"/>
  <rect width="1080" height="1080" fill="url(#hexes)" opacity="0.35"/>
  <rect width="1080" height="10" fill="${COLORS.accent}"/>

  <text x="540" y="248" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="800" fill="${COLORS.accent}" letter-spacing="2">${escapeXml(slide.eyebrow.toUpperCase())}</text>

  <line x1="120" y1="286" x2="960" y2="286" stroke="${COLORS.border}" stroke-width="1.5"/>

  <text x="540" y="${titleY}" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${titleSize}" font-weight="800" fill="${COLORS.navy}">${escapeXml(slide.title)}</text>
  <text x="540" y="${subtitleY}" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="500" fill="${COLORS.muted}">${escapeXml(slide.subtitle)}</text>

  ${pills}
  ${bulletBlock(slide.bullets, bulletsStartY)}

  <rect x="120" y="1010" width="120" height="36" rx="18" fill="#ffffff" stroke="${COLORS.border}" stroke-width="1.5"/>
  <text x="180" y="1034" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="${COLORS.muted}">${slideIndex}/${totalSlides}</text>

  ${ctaBlock}
</svg>`);
}

async function rasterLogo(size) {
  return sharp(syncsoapLogoPath, { density: 240 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function renderSlide(slide, slideIndex, totalSlides) {
  const [logo, background] = await Promise.all([
    rasterLogo(92),
    sharp(slideSvg(slide, slideIndex, totalSlides)).png().toBuffer(),
  ]);

  const outputPath = path.join(outDir, slide.file);

  const output = await sharp(background)
    .composite([{ input: logo, left: 494, top: 132 }])
    .png()
    .toFile(outputPath);

  return { ...output, path: outputPath };
}

mkdirSync(outDir, { recursive: true });

const totalSlides = SLIDES.length;
const outputs = [];

for (const [index, slide] of SLIDES.entries()) {
  const rendered = await renderSlide(slide, index + 1, totalSlides);
  outputs.push({
    id: slide.id,
    file: slide.file,
    label: slide.label,
    width: rendered.width,
    height: rendered.height,
    assetLocation: `/ops-ig/${slide.file}`,
    eyebrow: slide.eyebrow,
    title: slide.title,
    subtitle: slide.subtitle,
    bullets: slide.bullets,
  });
  console.log(`  public/ops-ig/${slide.file} (${rendered.width}x${rendered.height})`);
}

writeFileSync(
  path.join(outDir, "syncsoap-progress-ig-manifest.json"),
  JSON.stringify(
    {
      colors: COLORS,
      carouselOrder: outputs.map((item) => item.file),
      logo: "/syncsoap-logo.svg",
      outputs,
      suggestedCaption:
        "SyncSOAP development progress: from AI note generation toward a pilot-ready healthcare documentation platform. Swipe for product, study, vision, security, evidence, and deployment updates. syncsoap.com",
    },
    null,
    2,
  ),
);

console.log(`Rendered ${outputs.length} SyncSOAP IG carousel slides.`);
