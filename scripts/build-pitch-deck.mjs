// Build naluka-pitch.pptx from docs/pitch-deck.md content.
// Run: npm run pitch  (or `node scripts/build-pitch-deck.mjs`)

import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../docs/naluka-pitch.pptx');

// ── Brand palette ──────────────────────────────────────────────
const NAVY        = '0F1A33';   // page background
const NAVY_DEEP   = '07101F';   // darker variant
const NAVY_RAISED = '152040';   // card surface
const GOLD        = 'D4A934';   // primary accent
const SAGE        = '3A8A6E';   // positive accent
const RUST        = 'B84A1A';   // action accent
const CREAM       = 'F5F5F0';   // primary text
const CREAM_DIM   = 'BFBEAB';   // tertiary text
const BORDER      = '2A3553';   // subtle divider

const HEADER_FONT = 'Calibri';
const BODY_FONT   = 'Calibri';

// ── Setup ──────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';   // 10" x 5.625"
pres.author = 'Naluka';
pres.title  = 'Naluka — Compliance + Escrow OS for African Aviation';

const W = 10;
const H = 5.625;

// ── Helpers ────────────────────────────────────────────────────
function darkBg(slide) { slide.background = { color: NAVY }; }

function pageNumber(slide, n, total) {
  slide.addText(`${n} / ${total}`, {
    x: W - 1.0, y: H - 0.4, w: 0.8, h: 0.3,
    fontSize: 9, color: CREAM_DIM, align: 'right',
    fontFace: BODY_FONT, margin: 0,
  });
}

function brandMark(slide) {
  slide.addText([
    { text: 'Nalu', options: { color: CREAM } },
    { text: 'ka', options: { color: GOLD } },
  ], {
    x: 0.4, y: 0.3, w: 1.4, h: 0.3,
    fontSize: 14, bold: true, fontFace: HEADER_FONT, margin: 0,
  });
}

function overline(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.75, w: 6, h: 0.3,
    fontSize: 9, bold: true, color: GOLD,
    charSpacing: 4, fontFace: BODY_FONT, margin: 0,
  });
}

function title(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.5, y: 1.05, w: 9, h: 0.7,
    fontSize: 30, bold: true, color: CREAM,
    fontFace: HEADER_FONT, margin: 0,
    ...opts,
  });
}

const TOTAL = 11;
let pageNum = 0;

// ────────────────────────────────────────────────────────────────
// SLIDE 1 — Cover
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++;

  // Brand mark big
  slide.addText([
    { text: 'Nalu', options: { color: CREAM } },
    { text: 'ka', options: { color: GOLD } },
  ], {
    x: 0.6, y: 0.6, w: 4, h: 0.6,
    fontSize: 32, bold: true, fontFace: HEADER_FONT, margin: 0,
  });

  // Subtitle ribbon — wide enough to stay on one line at charSpacing 8
  slide.addText('AFRICAN AVIATION  ·  COMPLIANCE  ·  ESCROW', {
    x: 0.6, y: 1.25, w: 8.5, h: 0.3,
    fontSize: 10, bold: true, color: GOLD,
    charSpacing: 8, fontFace: BODY_FONT, margin: 0,
  });

  // Main headline
  slide.addText([
    { text: 'Compliance + Escrow', options: { color: CREAM, breakLine: true } },
    { text: 'OS for African Aviation.', options: { color: GOLD } },
  ], {
    x: 0.6, y: 1.9, w: 8.8, h: 1.6,
    fontSize: 44, bold: true, fontFace: HEADER_FONT,
    valign: 'top', margin: 0,
  });

  // Lead paragraph
  slide.addText(
    'We help airlines and AMOs cut compliance admin from days to minutes, ' +
    'prove it to SACAA inspectors with one click, and pay contractors ' +
    'with the trust of a Part 145 contract.',
    {
      x: 0.6, y: 3.7, w: 8.8, h: 1.0,
      fontSize: 14, color: CREAM_DIM, fontFace: BODY_FONT,
      valign: 'top', margin: 0,
    },
  );

  // Footer
  slide.addText('B2B sales pitch · prepared for Tier 0 customer-dev calls', {
    x: 0.6, y: H - 0.5, w: 6, h: 0.3,
    fontSize: 9, italic: true, color: CREAM_DIM, fontFace: BODY_FONT, margin: 0,
  });

  // Right-side gold geometric accent
  slide.addShape(pres.shapes.RECTANGLE, {
    x: W - 0.3, y: 0, w: 0.3, h: H,
    fill: { color: GOLD },
  });
}

// ────────────────────────────────────────────────────────────────
// SLIDE 2 — The customer's problem
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'THE PROBLEM');
  title(slide, 'You\'re probably one of these conversations:');

  const quotes = [
    {
      who: 'Compliance officer',
      text: '"Last SACAA inspection cost us 3 person-weeks of PDF hunting and one very stressed officer. We still got hit with a finding because Pilot X\'s medical lapsed by 2 days and nobody noticed."',
    },
    {
      who: 'Operations manager',
      text: '"Our DAME quit. We had 47 medicals due in the next 6 months. Nobody tracked it. Two pilots flew expired."',
    },
    {
      who: 'Finance director',
      text: '"We pay our maintenance contractor 30 days after invoice. They keep calling for advances. We trust them but trust isn\'t a contract."',
    },
  ];

  const cardW = 2.95, cardH = 2.7, gap = 0.1;
  const startX = 0.5;
  quotes.forEach((q, i) => {
    const x = startX + i * (cardW + gap);
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.0, w: cardW, h: cardH,
      fill: { color: NAVY_RAISED },
      line: { color: BORDER, width: 1 },
    });
    // Gold quote glyph
    slide.addText('"', {
      x: x + 0.15, y: 2.05, w: 0.4, h: 0.6,
      fontSize: 48, bold: true, color: GOLD, fontFace: HEADER_FONT, margin: 0,
    });
    // Persona label
    slide.addText(q.who.toUpperCase(), {
      x: x + 0.2, y: 2.55, w: cardW - 0.3, h: 0.25,
      fontSize: 9, bold: true, color: GOLD, charSpacing: 4,
      fontFace: BODY_FONT, margin: 0,
    });
    // Quote body
    slide.addText(q.text, {
      x: x + 0.2, y: 2.85, w: cardW - 0.4, h: cardH - 1.05,
      fontSize: 11, color: CREAM, italic: true, fontFace: BODY_FONT,
      valign: 'top', margin: 0,
    });
  });

  // Footnote
  slide.addText('If none of these resonate, you\'re probably not the ICP — and that\'s fine.', {
    x: 0.5, y: H - 0.6, w: 9, h: 0.3,
    fontSize: 10, italic: true, color: CREAM_DIM, fontFace: BODY_FONT, margin: 0,
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 3 — What Naluka does
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'WHAT NALUKA DOES');
  title(slide, 'Three pillars, in order of pain.');

  const pillars = [
    {
      n: '01',
      label: 'DOCUMENT EXPIRY WATCHDOG',
      body: 'Every licence, medical, type rating and AMP renewal tracked. We notify your team — and the operator who manages them — 90, 30, and 7 days before expiry. Zero surprises.',
    },
    {
      n: '02',
      label: 'ONE-CLICK AUDIT PACK',
      body: 'Pick a date range. PDF or JSON, with a hash-chained integrity proof every SACAA inspector or insurance underwriter can verify independently. The 3-week PDF hunt becomes a 3-second download.',
    },
    {
      n: '03',
      label: 'ESCROW FOR CREW + PARTS + MRO',
      body: 'PayFast-backed escrow held until digital sign-off. Contractor knows the money\'s there. You know the work won\'t be invoiced before it\'s delivered. Audit trail recorded automatically.',
    },
  ];

  const startY = 1.95;
  const rowH = 1.1;
  pillars.forEach((p, i) => {
    const y = startY + i * (rowH + 0.05);
    // Number column
    slide.addText(p.n, {
      x: 0.5, y, w: 0.9, h: rowH,
      fontSize: 36, bold: true, color: GOLD, fontFace: HEADER_FONT,
      valign: 'top', margin: 0,
    });
    // Label
    slide.addText(p.label, {
      x: 1.5, y: y + 0.05, w: 8, h: 0.35,
      fontSize: 13, bold: true, color: CREAM, charSpacing: 2,
      fontFace: HEADER_FONT, margin: 0,
    });
    // Body
    slide.addText(p.body, {
      x: 1.5, y: y + 0.45, w: 7.9, h: rowH - 0.5,
      fontSize: 11, color: CREAM_DIM, fontFace: BODY_FONT,
      valign: 'top', margin: 0,
    });
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 4 — Why now
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'WHY NOW');
  title(slide, 'Three trends made this product viable in 2026.');

  const reasons = [
    {
      stat: '+40%',
      label: 'YoY SACAA findings & suspensions',
      body: 'Audit posture is hardening. Operators that paper-tiger\'d compliance for years are getting hit with real penalties.',
    },
    {
      stat: '67%',
      label: 'of mid-market crew is contract',
      body: 'Post-COVID, lean cores rotate contractors. Tracking compliance on a workforce you don\'t fully employ is harder than ever.',
    },
    {
      stat: '<1%',
      label: 'fee on PayFast escrow rails',
      body: 'Fintech rails finally make escrow cheap and instant. Five years ago, this product was 4× the cost to build.',
    },
  ];

  const cardW = 2.95, gap = 0.1;
  reasons.forEach((r, i) => {
    const x = 0.5 + i * (cardW + gap);
    const y = 2.0;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: 2.7,
      fill: { color: NAVY_RAISED },
      line: { color: BORDER, width: 1 },
    });
    // Big stat
    slide.addText(r.stat, {
      x: x + 0.2, y: y + 0.25, w: cardW - 0.4, h: 1.0,
      fontSize: 48, bold: true, color: GOLD,
      fontFace: HEADER_FONT, margin: 0,
    });
    // Label
    slide.addText(r.label.toUpperCase(), {
      x: x + 0.2, y: y + 1.3, w: cardW - 0.4, h: 0.3,
      fontSize: 9, bold: true, color: CREAM, charSpacing: 3,
      fontFace: BODY_FONT, margin: 0,
    });
    // Body
    slide.addText(r.body, {
      x: x + 0.2, y: y + 1.65, w: cardW - 0.4, h: 1.0,
      fontSize: 11, color: CREAM_DIM, fontFace: BODY_FONT,
      valign: 'top', margin: 0,
    });
  });

  // (Replace these stats with current SACAA report numbers before each
  // call — keep that note in build-pitch-deck.mjs, NOT on the customer
  // slide.)

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 5 — Why Naluka, not the alternatives
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'COMPETITIVE POSITIONING');
  title(slide, 'Naluka vs everything you might use today.');

  const rows = [
    ['You currently use', 'What you get from us'],
    ['A spreadsheet', 'Structured product. Notifications. Audit pack. Escrow.'],
    ['CAMP (mid-market)', 'Better crew compliance. Cheaper. Native escrow. CAMP stays for maintenance, we sit alongside for crew.'],
    ['AMOS (enterprise)', 'You\'re not our customer — call us back when you outgrow AMOS.'],
    ['An aviation consultancy', 'They become your partner on Naluka, not your bottleneck. We\'re the software they wish they had.'],
    ['Aerlex / AvJobs', 'They list jobs. We close them with money + sign-off + audit.'],
  ];

  const headerFill = { color: GOLD };
  const altFill    = { color: NAVY_RAISED };
  const tableData = rows.map((row, i) => row.map((cell, j) => {
    if (i === 0) {
      return {
        text: cell,
        options: {
          fill: headerFill, color: NAVY,
          bold: true, fontSize: 11, fontFace: BODY_FONT,
          align: j === 0 ? 'left' : 'left',
          valign: 'middle',
        },
      };
    }
    return {
      text: cell,
      options: {
        fill: altFill, color: j === 0 ? GOLD : CREAM,
        fontSize: 11, fontFace: BODY_FONT,
        bold: j === 0,
        valign: 'middle',
      },
    };
  }));

  slide.addTable(tableData, {
    x: 0.5, y: 2.0, w: 9, colW: [3.0, 6.0],
    rowH: 0.5,
    border: { pt: 1, color: NAVY_DEEP },
    fontSize: 11,
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 6 — How it works (operator's view)
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'HOW IT WORKS — OPERATOR VIEW');
  title(slide, 'Five steps. Audit-ready by step five.');

  const steps = [
    { n: '1', t: 'Sign up team',     b: 'CSV upload bulks 200 pilots in 30 sec. Or each member self-registers.' },
    { n: '2', t: 'Verify',            b: 'Manual SACAA cross-check within 4 business hours. Verified = listed + bookable.' },
    { n: '3', t: 'Hire / procure',    b: 'Hire a contractor or buy a part. Money lands in PayFast escrow.' },
    { n: '4', t: 'Work happens',      b: 'When complete, the licensed signatory signs off via biometric auth.' },
    { n: '5', t: 'Money releases',    b: 'Funds released to seller. Audit chain entry written. Done.' },
  ];

  const startY = 2.0;
  const cardW = 1.8, cardH = 2.7, gap = 0.05;
  steps.forEach((s, i) => {
    const x = 0.5 + i * (cardW + gap);
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: startY, w: cardW, h: cardH,
      fill: { color: NAVY_RAISED },
      line: { color: BORDER, width: 1 },
    });
    // Number
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.25, y: startY + 0.25, w: 0.5, h: 0.5,
      fill: { color: GOLD },
    });
    slide.addText(s.n, {
      x: x + 0.25, y: startY + 0.27, w: 0.5, h: 0.5,
      fontSize: 18, bold: true, color: NAVY,
      align: 'center', valign: 'middle',
      fontFace: HEADER_FONT, margin: 0,
    });
    // Title
    slide.addText(s.t, {
      x: x + 0.15, y: startY + 0.85, w: cardW - 0.3, h: 0.7,
      fontSize: 12, bold: true, color: CREAM,
      fontFace: HEADER_FONT, margin: 0, valign: 'top',
    });
    // Body
    slide.addText(s.b, {
      x: x + 0.15, y: startY + 1.55, w: cardW - 0.3, h: cardH - 1.7,
      fontSize: 10, color: CREAM_DIM, fontFace: BODY_FONT,
      valign: 'top', margin: 0,
    });
  });

  slide.addText('Every state change leaves a trail. Hand the trail to a SACAA inspector tomorrow.', {
    x: 0.5, y: H - 0.5, w: 9, h: 0.3,
    fontSize: 11, italic: true, color: GOLD, fontFace: BODY_FONT,
    align: 'center', margin: 0,
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 7 — Compliance officer's Monday morning
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'YOUR COMPLIANCE OFFICER\'S MONDAY');
  title(slide, 'A dashboard, not a panic spreadsheet.');

  // Mock dashboard tiles
  const tiles = [
    { stat: '7',          label: 'Documents expiring < 90d', color: GOLD },
    { stat: 'ZAR 2.4M',   label: 'Funds in escrow',           color: SAGE },
    { stat: '3',          label: 'Active AOG events',          color: RUST },
    { stat: '✓',          label: 'Audit chain integrity',      color: SAGE },
  ];

  const tileW = 2.18, tileH = 1.5, tileGap = 0.1;
  const startY = 2.0;
  tiles.forEach((t, i) => {
    const x = 0.5 + i * (tileW + tileGap);
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: startY, w: tileW, h: tileH,
      fill: { color: NAVY_RAISED },
      line: { color: BORDER, width: 1 },
    });
    slide.addText(t.stat, {
      x: x + 0.15, y: startY + 0.15, w: tileW - 0.3, h: 0.7,
      fontSize: 32, bold: true, color: t.color, fontFace: HEADER_FONT,
      valign: 'top', margin: 0,
    });
    slide.addText(t.label.toUpperCase(), {
      x: x + 0.15, y: startY + 0.95, w: tileW - 0.3, h: 0.5,
      fontSize: 9, bold: true, color: CREAM_DIM, charSpacing: 2,
      fontFace: BODY_FONT, valign: 'top', margin: 0,
    });
  });

  // CTA
  const ctaY = startY + tileH + 0.3;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: ctaY, w: 9, h: 0.85,
    fill: { color: GOLD },
  });
  slide.addText('CLICK ▸ Generate audit pack — last 12 months', {
    x: 0.7, y: ctaY, w: 6, h: 0.85,
    fontSize: 16, bold: true, color: NAVY,
    fontFace: HEADER_FONT, valign: 'middle', margin: 0,
  });
  slide.addText('PDF ready in 2 sec', {
    x: 6.5, y: ctaY, w: 2.8, h: 0.85,
    fontSize: 12, italic: true, color: NAVY,
    fontFace: BODY_FONT, valign: 'middle', align: 'right', margin: 0,
  });

  slide.addText('Your compliance officer goes from firefighter to control-tower operator.', {
    x: 0.5, y: H - 0.5, w: 9, h: 0.3,
    fontSize: 11, italic: true, color: CREAM_DIM,
    fontFace: BODY_FONT, align: 'center', margin: 0,
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 8 — Pricing
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'PRICING');
  title(slide, 'You only pay when a transaction completes.');

  const tiers = [
    {
      tier: 'STARTER',
      who: 'Aviation professionals',
      price: 'Free',
      sub: '3% on completed contracts',
      bullets: ['Digital crew wallet', 'Compliance vault', 'Job matching', 'No subscription'],
      featured: false,
    },
    {
      tier: 'OPERATOR',
      who: 'Airlines & operators',
      price: 'ZAR 12,500',
      sub: 'per month + 3% commission',
      bullets: ['Up to 200 active crew', 'Compliance dashboard', 'Audit pack export', 'AOG priority matching'],
      featured: true,
    },
    {
      tier: 'AMO',
      who: 'Maintenance organisations',
      price: 'ZAR 4,500',
      sub: 'per month + 5% on parts sales',
      bullets: ['Unlimited service listings', 'MRO escrow flow', 'CSD verification', 'Seller analytics'],
      featured: false,
    },
  ];

  const cardW = 2.95, cardH = 2.95, gap = 0.1;
  tiers.forEach((t, i) => {
    const x = 0.5 + i * (cardW + gap);
    const y = 2.25;        // dropped from 1.95 to clear room for the ribbon
    const fill = t.featured ? { color: GOLD } : { color: NAVY_RAISED };
    const stroke = t.featured ? { color: GOLD, width: 2 } : { color: BORDER, width: 1 };
    const tx = t.featured ? NAVY : CREAM;
    const txDim = t.featured ? '4A3F1F' : CREAM_DIM;

    slide.addShape(pres.shapes.RECTANGLE, { x, y, w: cardW, h: cardH, fill, line: stroke });

    // Featured ribbon — sits between the title bar (ends ~1.75) and
    // the card top (now 2.25). Centred in the 0.5" band.
    if (t.featured) {
      slide.addText('MOST POPULAR', {
        x, y: 1.85, w: cardW, h: 0.3,
        fontSize: 10, bold: true, color: GOLD, charSpacing: 4,
        align: 'center', fontFace: BODY_FONT, margin: 0,
      });
    }

    slide.addText(t.tier, {
      x: x + 0.2, y: y + 0.15, w: cardW - 0.4, h: 0.3,
      fontSize: 10, bold: true, color: txDim, charSpacing: 4,
      fontFace: BODY_FONT, margin: 0,
    });
    slide.addText(t.who, {
      x: x + 0.2, y: y + 0.4, w: cardW - 0.4, h: 0.3,
      fontSize: 10, color: txDim, fontFace: BODY_FONT, margin: 0,
    });
    slide.addText(t.price, {
      x: x + 0.2, y: y + 0.75, w: cardW - 0.4, h: 0.6,
      fontSize: 28, bold: true, color: tx, fontFace: HEADER_FONT, margin: 0,
    });
    slide.addText(t.sub, {
      x: x + 0.2, y: y + 1.35, w: cardW - 0.4, h: 0.3,
      fontSize: 10, italic: true, color: txDim, fontFace: BODY_FONT, margin: 0,
    });
    // Bullets
    slide.addText(t.bullets.map((b, idx) => ({
      text: b,
      options: { bullet: true, breakLine: idx < t.bullets.length - 1, color: tx, fontSize: 10 },
    })), {
      x: x + 0.2, y: y + 1.7, w: cardW - 0.4, h: cardH - 1.85,
      fontSize: 10, color: tx, fontFace: BODY_FONT,
      valign: 'top', paraSpaceAfter: 4, margin: 0,
    });
  });

  slide.addText('Discount Tier 0 customers to ZAR 6,500/mo for 12 mo in exchange for case-study + introduction rights.', {
    x: 0.5, y: H - 0.5, w: 9, h: 0.3,
    fontSize: 9, italic: true, color: CREAM_DIM,
    fontFace: BODY_FONT, align: 'center', margin: 0,
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 9 — Why we'll still exist in 5 years (the moat)
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'THE MOAT');
  title(slide, 'Why we\'ll still exist in 5 years.');

  // Big statement
  slide.addText('The hash-chained audit ledger is our moat.', {
    x: 0.5, y: 2.0, w: 9, h: 0.7,
    fontSize: 24, bold: true, color: GOLD, italic: true,
    fontFace: HEADER_FONT, margin: 0,
  });

  slide.addText(
    'SACAA can publish a free public verification portal tomorrow — and we\'ll still have:',
    {
      x: 0.5, y: 2.75, w: 9, h: 0.4,
      fontSize: 13, color: CREAM, fontFace: BODY_FONT, margin: 0,
    },
  );

  // Three moat bullets
  const moats = [
    { icon: '🛡', title: 'Escrow rails', body: 'Operators trust them. PayFast integration deep, not bolt-on.' },
    { icon: '⛓', title: 'Audit chain integrity', body: 'Independent proof anyone can verify. Even SACAA can\'t replicate.' },
    { icon: '⚙', title: 'Embedded workflow', body: 'Already in your team\'s daily compliance routine. Switching cost real.' },
  ];

  const cardW = 2.95, cardH = 1.6, gap = 0.1;
  moats.forEach((m, i) => {
    const x = 0.5 + i * (cardW + gap);
    const y = 3.3;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: cardH,
      fill: { color: NAVY_RAISED },
      line: { color: BORDER, width: 1 },
    });
    slide.addText(m.icon, {
      x: x + 0.2, y: y + 0.1, w: 0.5, h: 0.5,
      fontSize: 24, color: GOLD,
      fontFace: BODY_FONT, margin: 0,
    });
    slide.addText(m.title, {
      x: x + 0.85, y: y + 0.15, w: cardW - 1.0, h: 0.35,
      fontSize: 13, bold: true, color: CREAM,
      fontFace: HEADER_FONT, margin: 0,
    });
    slide.addText(m.body, {
      x: x + 0.85, y: y + 0.55, w: cardW - 1.0, h: cardH - 0.65,
      fontSize: 10, color: CREAM_DIM, fontFace: BODY_FONT,
      valign: 'top', margin: 0,
    });
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 10 — The ask
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'THE ASK');

  // Big question
  slide.addText('Would you pay ZAR 10,000 / month, today,', {
    x: 0.5, y: 1.5, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: CREAM,
    fontFace: HEADER_FONT, margin: 0,
  });
  slide.addText('to replace your current compliance setup with Naluka?', {
    x: 0.5, y: 2.1, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: GOLD,
    fontFace: HEADER_FONT, margin: 0,
  });

  // Three outcome cards
  const outcomes = [
    { tone: SAGE, head: 'YES', body: 'Sign here. Onboarding call this week. ICP confirmed.' },
    { tone: GOLD, head: 'YES, BUT…', body: 'Write down the "but". That\'s the next sprint.' },
    { tone: RUST, head: 'NO, HERE\'S WHY', body: 'Write down the why. Often more valuable than a yes.' },
  ];

  const cardW = 2.95, cardH = 1.7, gap = 0.1;
  outcomes.forEach((o, i) => {
    const x = 0.5 + i * (cardW + gap);
    const y = 3.2;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: cardH,
      fill: { color: NAVY_RAISED },
      line: { color: o.tone, width: 2 },
    });
    slide.addText(o.head, {
      x: x + 0.2, y: y + 0.2, w: cardW - 0.4, h: 0.5,
      fontSize: 20, bold: true, color: o.tone,
      fontFace: HEADER_FONT, margin: 0,
    });
    slide.addText(o.body, {
      x: x + 0.2, y: y + 0.8, w: cardW - 0.4, h: cardH - 0.9,
      fontSize: 11, color: CREAM,
      fontFace: BODY_FONT, valign: 'top', margin: 0,
    });
  });

  slide.addText('Whatever the answer — we walk away smarter than we arrived.', {
    x: 0.5, y: H - 0.5, w: 9, h: 0.3,
    fontSize: 11, italic: true, color: CREAM_DIM,
    fontFace: BODY_FONT, align: 'center', margin: 0,
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ────────────────────────────────────────────────────────────────
// SLIDE 11 — Appendix: competitor positioning one-liners
// ────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  darkBg(slide);
  pageNum++; brandMark(slide);
  overline(slide, 'APPENDIX — OBJECTION HANDLING');
  title(slide, 'When they ask "but doesn\'t X already do this?"');

  const objections = [
    {
      q: '"Won\'t CAMP/AMOS do this?"',
      a: 'CAMP tracks airframes, not crew. AMOS tracks everything but you can\'t afford it.',
    },
    {
      q: '"Won\'t SACAA build their own?"',
      a: 'They already did for pilots. Even if they expand it — you still need escrow and audit pack generation. We win when SACAA\'s free portal makes verification a commodity and our value moves up-stack.',
    },
    {
      q: '"Why isn\'t this just a spreadsheet?"',
      a: 'A spreadsheet doesn\'t notify you 90 days before expiry, doesn\'t generate audit packs in one click, doesn\'t hold funds in escrow, and doesn\'t survive a SACAA inspection.',
    },
    {
      q: '"Aerlex / AvJobs already list aviation jobs."',
      a: 'They list. We close — with money, sign-off, and an audit chain. Their network is broader; our value per transaction is higher.',
    },
  ];

  const startY = 1.95;
  const rowH = 0.85;
  objections.forEach((o, i) => {
    const y = startY + i * (rowH + 0.05);
    // Question
    slide.addText(o.q, {
      x: 0.5, y, w: 9, h: 0.32,
      fontSize: 12, bold: true, color: GOLD, italic: true,
      fontFace: BODY_FONT, margin: 0,
    });
    // Answer
    slide.addText(o.a, {
      x: 0.5, y: y + 0.32, w: 9, h: rowH - 0.32,
      fontSize: 11, color: CREAM_DIM, fontFace: BODY_FONT,
      valign: 'top', margin: 0,
    });
  });

  pageNumber(slide, pageNum, TOTAL);
}

// ── Save ───────────────────────────────────────────────────────
await pres.writeFile({ fileName: OUT });
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${pageNum} slides · LAYOUT_16x9 · brand palette: navy + gold`);
