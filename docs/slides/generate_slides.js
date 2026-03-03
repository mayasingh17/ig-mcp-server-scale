#!/usr/bin/env node
"use strict";

/**
 * generate_slides.js
 *
 * Reads docs/presentation_spec.md and generates an aesthetic PPTX using
 * PptxGenJS.  Black background, white text, Inspektor-Gadget pink accents.
 *
 * Usage:
 *   npm run generate
 *   node generate_slides.js
 *   node generate_slides.js --spec <path> --output <path>
 */

const PptxGenJS = require("pptxgenjs");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════════════
// Design tokens
// ═══════════════════════════════════════════════════════════════════════════

const COLOR = {
  BG:     "000000",   // true black
  TEXT:   "FFFFFF",   // white body text
  ACCENT: "FF2D7E",  // Inspektor Gadget pink
  MUTED:  "666666",  // footer / secondary
  PANEL:  "121212",  // dark panels & callout boxes
};

const FONT      = "Calibri";
const SLIDE_W   = 13.33;          // 16:9 widescreen (inches)
const SLIDE_H   = 7.5;
const MARGIN    = 0.75;           // safe area
const CONTENT_W = SLIDE_W - MARGIN * 2;
const FOOTER_Y  = SLIDE_H - 0.5;
const LOGO_SIZE = { w: 0.9, h: 0.58 };

const FOOTER_TEXT =
  "Inspektor Gadget MCP Server  \u00b7  github.com/inspektor-gadget/ig-mcp-server";

// ═══════════════════════════════════════════════════════════════════════════
// 1. Spec parser
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse the hybrid Markdown / YAML presentation spec.
 * Returns { config, slides[] }.
 */
function parseSpec(specPath) {
  // Normalise backslash paths (e.g. docs\media\…) so YAML doesn't choke on
  // unknown escape sequences.  Only touch paths inside quotes that look like
  // file references — this avoids breaking other YAML content.
  const raw = fs
    .readFileSync(specPath, "utf8")
    .replace(/(?<=["'])docs\\media\\/g, "docs/media/");

  // Front-matter between --- markers
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const config = fmMatch ? yaml.load(fmMatch[1]) : {};

  // Everything after front-matter, split on "# Slide N"
  const rest = fmMatch ? raw.slice(fmMatch[0].length) : raw;
  const blocks = rest.split(/^#\s+Slide\s+\d+\s*$/m).slice(1);

  const slides = [];
  for (const block of blocks) {
    try {
      const data = yaml.load(block.trim());
      if (data && typeof data === "object") slides.push(data);
    } catch (e) {
      console.warn("\u26a0  Skipping unparseable slide block:", e.message);
    }
  }
  return { config, slides };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Low-level drawing helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Thin coloured rectangle — use for accent lines and edge bars. */
function accentBar(pptx, slide, x, y, w, h = 0.04) {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color: COLOR.ACCENT },
  });
}

/** Dark rounded-rect background panel. */
function panelBox(pptx, slide, x, y, w, h) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: COLOR.PANEL },
  });
}

/** Centred footer text at the bottom of the slide. */
function addFooter(slide) {
  slide.addText(FOOTER_TEXT, {
    x: MARGIN,
    y: FOOTER_Y,
    w: CONTENT_W,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT,
    color: COLOR.MUTED,
    align: "center",
  });
}

/** IG logo in the top-right corner (gracefully skipped if file missing). */
function addLogo(slide, mediaDir) {
  const file = path.join(mediaDir, "ig-logo-compact.svg");
  if (!fs.existsSync(file)) return;
  slide.addImage({
    path: file,
    x: SLIDE_W - LOGO_SIZE.w - 0.3,
    y: 0.22,
    w: LOGO_SIZE.w,
    h: LOGO_SIZE.h,
  });
}

/** Pink-accented callout box near the slide bottom. */
function addCallout(pptx, slide, data) {
  if (!data.callouts || !data.callouts.length) return;
  const text = data.callouts[0];
  const boxY = FOOTER_Y - 0.85;

  panelBox(pptx, slide, MARGIN, boxY, CONTENT_W, 0.65);

  // Accent pip on the left edge of the callout
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: MARGIN,
    y: boxY,
    w: 0.05,
    h: 0.65,
    fill: { color: COLOR.ACCENT },
  });

  slide.addText(text, {
    x: MARGIN + 0.25,
    y: boxY + 0.03,
    w: CONTENT_W - 0.5,
    h: 0.58,
    fontSize: 15,
    fontFace: FONT,
    color: COLOR.ACCENT,
    italic: true,
    valign: "middle",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Bullet formatting
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert a raw string array into PptxGenJS rich-text paragraphs.
 * Recognises sub-items (leading spaces or "•") and adjusts indent + icon.
 */
function formatBullets(items, { size = 20, spacing = 28 } = {}) {
  return items.map((raw) => {
    const isSub = /^(\s{2,}|•)/.test(raw);
    const cleaned = raw.replace(/^\s*•\s*/, "").replace(/^\s{2,}/, "");
    return {
      text: cleaned,
      options: {
        fontSize: isSub ? size - 2 : size,
        fontFace: FONT,
        color: COLOR.TEXT,
        indentLevel: isSub ? 1 : 0,
        bullet: {
          code: isSub ? "2013" : "25CF", // – or ●
          color: COLOR.ACCENT,
        },
        lineSpacing: spacing,
        paraSpaceBefore: 4,
      },
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Slide builders
// ═══════════════════════════════════════════════════════════════════════════

// ── Title slide ─────────────────────────────────────────────────────────

function buildTitle(pptx, slide, data, mediaDir) {
  // Top + bottom accent bars
  accentBar(pptx, slide, 0, 0, SLIDE_W, 0.06);
  accentBar(pptx, slide, 0, SLIDE_H - 0.06, SLIDE_W, 0.06);

  // Main title
  slide.addText(data.title || "", {
    x: MARGIN + 0.15,
    y: 2.0,
    w: CONTENT_W - 0.3,
    h: 1.0,
    fontSize: 46,
    fontFace: FONT,
    color: COLOR.TEXT,
    bold: true,
  });

  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: MARGIN + 0.15,
      y: 3.1,
      w: CONTENT_W - 0.3,
      h: 0.8,
      fontSize: 28,
      fontFace: FONT,
      color: COLOR.ACCENT,
    });
  }

  // Accent underline
  accentBar(pptx, slide, MARGIN + 0.15, 4.05, 3.5);

  // Event badge (bottom-right)
  if (data.meta?.bottom_right_corner) {
    const txt = data.meta.bottom_right_corner.join("  \u00b7  ");
    slide.addText(txt, {
      x: SLIDE_W - 3.8,
      y: SLIDE_H - 1.0,
      w: 3.0,
      h: 0.5,
      fontSize: 18,
      fontFace: FONT,
      color: COLOR.MUTED,
      align: "right",
    });
  }

  addLogo(slide, mediaDir);
}

// ── About Me ────────────────────────────────────────────────────────────

function buildBio(pptx, slide, data, mediaDir) {
  slide.addText(data.title, {
    x: MARGIN,
    y: 0.5,
    w: CONTENT_W,
    h: 0.75,
    fontSize: 36,
    fontFace: FONT,
    color: COLOR.ACCENT,
    bold: true,
  });
  accentBar(pptx, slide, MARGIN, 1.3, 2.5);

  if (data.bio) {
    slide.addText(data.bio.trim(), {
      x: MARGIN,
      y: 1.7,
      w: CONTENT_W * 0.82,
      h: 4.2,
      fontSize: 22,
      fontFace: FONT,
      color: COLOR.TEXT,
      lineSpacing: 34,
      valign: "top",
    });
  }

  addFooter(slide);
  addLogo(slide, mediaDir);
}

// ── Agenda (numbered accent circles) ────────────────────────────────────

function buildAgenda(pptx, slide, data, mediaDir) {
  // Left edge accent
  accentBar(pptx, slide, 0, 0, 0.06, SLIDE_H);

  slide.addText(data.title, {
    x: MARGIN + 0.1,
    y: 0.4,
    w: CONTENT_W,
    h: 0.75,
    fontSize: 36,
    fontFace: FONT,
    color: COLOR.TEXT,
    bold: true,
  });
  accentBar(pptx, slide, MARGIN + 0.1, 1.2, 2.2);

  const items = data.content || data.bullets || [];
  let y = 1.75;
  items.forEach((item, i) => {
    // Pink numbered circle
    slide.addShape(pptx.shapes.OVAL, {
      x: MARGIN + 0.2,
      y,
      w: 0.48,
      h: 0.48,
      fill: { color: COLOR.ACCENT },
    });
    slide.addText(String(i + 1), {
      x: MARGIN + 0.2,
      y,
      w: 0.48,
      h: 0.48,
      fontSize: 16,
      fontFace: FONT,
      color: COLOR.TEXT,
      bold: true,
      align: "center",
      valign: "middle",
    });
    // Item text
    slide.addText(item, {
      x: MARGIN + 0.9,
      y,
      w: CONTENT_W - 1.5,
      h: 0.48,
      fontSize: 20,
      fontFace: FONT,
      color: COLOR.TEXT,
      valign: "middle",
    });
    y += 0.85;
  });

  addFooter(slide);
  addLogo(slide, mediaDir);
}

// ── Narrative slide (story panel + bullets, optional LIVE DEMO badge) ───

function buildNarrative(pptx, slide, data, mediaDir) {
  const isDemo = /\[LIVE DEMO\]/.test(data.narrative || "");

  // Top accent bar
  accentBar(pptx, slide, 0, 0, SLIDE_W, 0.05);

  // Title
  slide.addText(data.title, {
    x: MARGIN,
    y: 0.35,
    w: isDemo ? CONTENT_W - 2.2 : CONTENT_W,
    h: 0.7,
    fontSize: 34,
    fontFace: FONT,
    color: COLOR.TEXT,
    bold: true,
  });

  // LIVE DEMO badge
  if (isDemo) {
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: SLIDE_W - 2.65,
      y: 0.33,
      w: 1.85,
      h: 0.5,
      rectRadius: 0.06,
      fill: { color: COLOR.ACCENT },
    });
    slide.addText("LIVE DEMO", {
      x: SLIDE_W - 2.65,
      y: 0.33,
      w: 1.85,
      h: 0.5,
      fontSize: 14,
      fontFace: FONT,
      color: COLOR.TEXT,
      bold: true,
      align: "center",
    });
  }

  // Narrative panel
  let nextY = 1.25;
  if (data.narrative) {
    const display = data.narrative.replace(/\[LIVE DEMO\]\s*/, "").trim();
    const panelH = display.length > 200 ? 1.5 : 1.25;
    panelBox(pptx, slide, MARGIN, nextY, CONTENT_W, panelH);
    slide.addText(display, {
      x: MARGIN + 0.2,
      y: nextY + 0.1,
      w: CONTENT_W - 0.4,
      h: panelH - 0.2,
      fontSize: 14,
      fontFace: FONT,
      color: COLOR.MUTED,
      italic: true,
      lineSpacing: 21,
      valign: "top",
    });
    nextY += panelH + 0.2;
  }

  // Content bullets
  const items = data.content || data.bullets || [];
  if (items.length) {
    const bt = formatBullets(items, { size: 18, spacing: 25 });
    slide.addText(bt, {
      x: MARGIN,
      y: nextY,
      w: CONTENT_W,
      h: Math.max(FOOTER_Y - nextY - 1.0, 1.2),
      valign: "top",
    });
  }

  addCallout(pptx, slide, data);
  addFooter(slide);
  addLogo(slide, mediaDir);
}

// ── Standard content slide (bullets / content) ─────────────────────────

function buildContent(pptx, slide, data, mediaDir) {
  // Left edge accent
  accentBar(pptx, slide, 0, 0, 0.06, SLIDE_H);

  // Title
  slide.addText(data.title, {
    x: MARGIN + 0.1,
    y: 0.4,
    w: CONTENT_W - 0.2,
    h: 0.75,
    fontSize: 34,
    fontFace: FONT,
    color: COLOR.TEXT,
    bold: true,
  });
  accentBar(pptx, slide, MARGIN + 0.1, 1.2, 2.5);

  // Bullets
  const items = data.bullets || data.content || [];
  const hasCallout = data.callouts?.length > 0;
  const bottomPad = hasCallout ? 1.6 : 0.9;

  if (items.length) {
    const bt = formatBullets(items);
    slide.addText(bt, {
      x: MARGIN + 0.1,
      y: 1.55,
      w: CONTENT_W - 0.2,
      h: FOOTER_Y - 1.55 - bottomPad,
      valign: "top",
    });
  }

  addCallout(pptx, slide, data);
  addFooter(slide);
  addLogo(slide, mediaDir);
}

// ── Wrap-up slide (summary + resources panel) ───────────────────────────

function buildWrapUp(pptx, slide, data, mediaDir) {
  // Top + bottom accent bars
  accentBar(pptx, slide, 0, 0, SLIDE_W, 0.05);
  accentBar(pptx, slide, 0, SLIDE_H - 0.05, SLIDE_W, 0.05);

  slide.addText(data.title, {
    x: MARGIN,
    y: 0.4,
    w: CONTENT_W,
    h: 0.75,
    fontSize: 36,
    fontFace: FONT,
    color: COLOR.TEXT,
    bold: true,
  });
  accentBar(pptx, slide, MARGIN, 1.2, 2.0);

  // Separate summary bullets from resource links
  const items = data.bullets || data.content || [];
  const summary = [];
  const links = [];
  let inLinks = false;

  for (const item of items) {
    if (/resources/i.test(item) && item.endsWith(":")) {
      inLinks = true;
      continue;
    }
    (inLinks ? links : summary).push(item);
  }

  // Summary bullets
  if (summary.length) {
    const bt = formatBullets(summary, { size: 20, spacing: 28 });
    slide.addText(bt, {
      x: MARGIN,
      y: 1.55,
      w: CONTENT_W,
      h: 2.4,
      valign: "top",
    });
  }

  // Resources panel
  if (links.length) {
    const panelY = 4.2;
    const panelH = 2.2;
    panelBox(pptx, slide, MARGIN, panelY, CONTENT_W, panelH);

    slide.addText("Resources", {
      x: MARGIN + 0.22,
      y: panelY + 0.1,
      w: 3.0,
      h: 0.4,
      fontSize: 16,
      fontFace: FONT,
      color: COLOR.ACCENT,
      bold: true,
    });

    const linkRows = links.map((raw) => {
      const clean = raw.replace(/^\s*•\s*/, "");
      const urlMatch = clean.match(/https?:\/\/\S+/);
      return {
        text: clean,
        options: {
          fontSize: 15,
          fontFace: FONT,
          color: COLOR.TEXT,
          bullet: { code: "203A", color: COLOR.ACCENT }, // › arrow
          lineSpacing: 26,
          hyperlink: urlMatch ? { url: urlMatch[0] } : undefined,
        },
      };
    });

    slide.addText(linkRows, {
      x: MARGIN + 0.22,
      y: panelY + 0.55,
      w: CONTENT_W - 0.44,
      h: panelH - 0.7,
      valign: "top",
    });
  }

  addFooter(slide);
  addLogo(slide, mediaDir);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Orchestration
// ═══════════════════════════════════════════════════════════════════════════

async function generate(specPath, outputPath) {
  const mediaDir = path.resolve(path.dirname(specPath), "media");
  const { config, slides } = parseSpec(specPath);

  console.log(`  Spec:   ${specPath}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`  Slides: ${slides.length}\n`);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE_16x9", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "WIDE_16x9";
  pptx.title = config.deck?.title || "Presentation";
  pptx.author = "Maya Singh";

  // Dispatch map for special slide IDs
  const special = {
    title: buildTitle,
    "about-me": buildBio,
    agenda: buildAgenda,
    "wrap-up": buildWrapUp,
  };

  for (let i = 0; i < slides.length; i++) {
    const data = slides[i];
    const slide = pptx.addSlide();
    slide.background = { color: COLOR.BG };

    const builder =
      special[data.id] || (data.narrative ? buildNarrative : buildContent);
    builder(pptx, slide, data, mediaDir);

    const tag = special[data.id]
      ? `[${data.id}]`
      : data.narrative
        ? "[narrative]"
        : "[content]";
    console.log(`  ${String(i + 1).padStart(2)}. ${data.title}  ${tag}`);
  }

  await pptx.writeFile({ fileName: outputPath });
  console.log(`\n\u2705  Saved \u2192 ${outputPath}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. CLI
// ═══════════════════════════════════════════════════════════════════════════

function cli() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const specPath = path.resolve(
    flag("spec") || path.join(__dirname, "..", "presentation_spec.md")
  );
  const outputPath = path.resolve(
    flag("output") ||
      path.join(__dirname, "..", "..", "Ask_and_You_Shall_Debug_SCaLE.pptx")
  );

  generate(specPath, outputPath).catch((err) => {
    console.error("\u274c  Error:", err.message || err);
    process.exit(1);
  });
}

cli();
