#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ffmpegPath = require("ffmpeg-static");
const sharp = require("sharp");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");

function parseArgs(argv) {
  const args = {};

  for (const raw of argv) {
    if (!raw.startsWith("--")) {
      continue;
    }

    const [key, ...rest] = raw.slice(2).split("=");
    args[key.toLowerCase()] = rest.join("=");
  }

  return args;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(result.stderr || result.stdout || `${command} failed with exit code ${result.status}`);
  }

  return result;
}

function frameSvg(svg, visibleItems) {
  return svg.replace(
    /<g data-reveal-item="(\d+)"/g,
    (_, index) =>
      `<g data-reveal-item="${index}" opacity="${Number(index) < visibleItems ? "1" : "0"}"`,
  );
}

function readSvgSize(svg) {
  const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/i);

  if (!match) {
    return { width: 1080, height: 1080 };
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

async function renderFrames(svg, itemCount, tempDir) {
  const { width, height } = readSvgSize(svg);
  const browser = await chromium.launch();
  const frames = [];

  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    for (let visibleItems = 0; visibleItems <= itemCount; visibleItems += 1) {
      const svgPath = path.join(
        tempDir,
        `frame-${String(visibleItems).padStart(2, "0")}.svg`,
      );
      const pngPath = path.join(
        tempDir,
        `frame-${String(visibleItems).padStart(2, "0")}.png`,
      );

      fs.writeFileSync(svgPath, frameSvg(svg, visibleItems), "utf8");
      await page.goto(`file://${svgPath.replace(/\\/g, "/")}`);
      await page.screenshot({
        path: pngPath,
        omitBackground: false,
        clip: { x: 0, y: 0, width, height },
      });
      frames.push(pngPath);
    }
  } finally {
    await browser.close();
  }

  return { frames, width, height };
}

async function writeGif(frames, outputPath, width, height) {
  const rendered = await Promise.all(
    frames.map((frame) => sharp(frame).ensureAlpha().raw().toBuffer()),
  );
  const stacked = Buffer.concat(rendered);
  const delays = frames.map((_, index) => (index === frames.length - 1 ? 2200 : 850));

  await sharp(stacked, {
    raw: {
      width,
      height: height * frames.length,
      channels: 4,
      pageHeight: height,
    },
  })
    .gif({ loop: 0, delay: delays, effort: 7, colours: 128 })
    .toFile(outputPath);
}

function writeMp4(frames, outputPath, tempDir) {
  const concatPath = path.join(tempDir, "frames.txt");
  const lines = [];

  frames.forEach((frame, index) => {
    const normalized = frame.replace(/\\/g, "/").replace(/'/g, "'\\''");
    lines.push(`file '${normalized}'`);
    lines.push(`duration ${index === frames.length - 1 ? "2.2" : "0.85"}`);
  });

  lines.push(
    `file '${frames.at(-1).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`,
  );
  fs.writeFileSync(concatPath, `${lines.join("\n")}\n`, "utf8");

  run(ffmpegPath, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-vf",
    "fps=30,format=yuv420p",
    "-c:v",
    "libx264",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

function resolveOutBase(args) {
  const layout = String(args.layout ?? "square").trim().toLowerCase();
  const trimmed = String(args.out ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\.(svg|png|gif|mp4)$/i, "");

  if (!trimmed) {
    fail("--out is required (example: --out=public/bringhurstdo-ops-social-card)");
  }

  const withLayout = layout === "landscape" ? `${trimmed}-landscape` : trimmed;
  return path.isAbsolute(withLayout) ? withLayout : path.join(ROOT, withLayout);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const items = String(args.items ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (items.length === 0) {
    fail("Animation requires --items with at least one pipe-separated entry.");
  }

  if (!args.brand || !args.title || !args.subtitle || !args.out) {
    fail(
      "Required: --brand --title --subtitle --items --out (same flags as social:card).",
    );
  }

  const layout = String(args.layout ?? "square").trim().toLowerCase();
  const cardArgs = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith("--format="))
    .map((arg) =>
      arg.toLowerCase().startsWith("--layout=") ? `--layout=${layout === "landscape" ? "landscape" : "square"}` : arg,
    );

  if (!cardArgs.some((arg) => arg.toLowerCase().startsWith("--layout="))) {
    cardArgs.push(`--layout=${layout === "landscape" ? "landscape" : "square"}`);
  }

  run(process.execPath, [
    path.join(__dirname, "generate-brand-social-card.cjs"),
    ...cardArgs,
  ]);

  const outBase = resolveOutBase(args);
  const svgPath = `${outBase}.svg`;

  if (!fs.existsSync(svgPath)) {
    fail(`Static generator did not create ${svgPath}.`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bdo-social-animation-"));

  try {
    const { frames, width, height } = await renderFrames(
      fs.readFileSync(svgPath, "utf8"),
      items.length,
      tempDir,
    );
    const gifPath = `${outBase}.gif`;
    const mp4Path = `${outBase}.mp4`;

    await writeGif(frames, gifPath, width, height);
    writeMp4(frames, mp4Path, tempDir);

    console.log(
      JSON.stringify(
        {
          brand: args.brand,
          layout: layout === "landscape" ? "landscape" : "square",
          size: `${width}x${height}`,
          frames: frames.length,
          durationSeconds: Number((items.length * 0.85 + 2.2).toFixed(2)),
          revealOrder: items,
          svgPath: path.relative(ROOT, svgPath).replace(/\\/g, "/"),
          gifPath: path.relative(ROOT, gifPath).replace(/\\/g, "/"),
          mp4Path: path.relative(ROOT, mp4Path).replace(/\\/g, "/"),
        },
        null,
        2,
      ),
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) =>
  fail(error instanceof Error ? error.stack || error.message : String(error)),
);
