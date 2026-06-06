// Build the Naluka broker pitch deck.
// Run from project root:
//   node docs/build-broker-deck.js
// Output: docs/naluka-broker-pitch.pptx

const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';   // 13.33" x 7.5"
pres.author = 'Naluka';
pres.company = 'Naluka';
pres.title = 'Naluka — Broker Platform';

// ── Naluka brand palette ────────────────────────────────────────
const NAVY = '0F1A33';
const NAVY_DEEP = '060B1A';
const GOLD = 'D4A934';
const SAGE = '3A8A6E';
const RUST = 'B84A1A';
const CREAM = 'F5F5F0';
const TEXT_LIGHT = 'F5F5F0';
const TEXT_MUTED = '8C97AD';
const SLATE = '1F2C4A';

const FONT_DISPLAY = 'Calibri';
const FONT_BODY = 'Calibri';
const FONT_MONO = 'Consolas';

const HEIGHT = 7.5;
const WIDTH  = 13.33;

// Reusable: dark background fill on a slide
function darkBg(slide) {
  slide.background = { color: NAVY };
}

// Reusable: cream background fill
function lightBg(slide) {
  slide.background = { color: CREAM };
}

// Reusable: top-left "Naluka, backed by Aeropreserve" branding
function topBrand(slide, light = false) {
  slide.addText(
    [
      { text: 'NALUKA ', options: { fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: light ? NAVY : TEXT_LIGHT, charSpacing: 4 } },
      { text: 'backed by Aeropreserve', options: { fontFace: FONT_BODY, fontSize: 11, color: light ? SLATE : TEXT_MUTED } },
    ],
    { x: 0.5, y: 0.35, w: 7, h: 0.4 }
  );
}

// Reusable: page number bottom right
function pageNo(slide, n, total) {
  slide.addText(`${n} / ${total}`, {
    x: 12.3, y: 7.0, w: 0.8, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: TEXT_MUTED, align: 'right',
  });
}

const TOTAL = 12;

// ──────────────────────────────────────────────────────────────────
// Slide 1 — Title
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);

  // Gold accent shape — a single sharp vertical line on the left
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 1.0, w: 0.08, h: 5.5,
    fill: { color: GOLD }, line: { type: 'none' },
  });

  s.addText('NALUKA', {
    x: 1.0, y: 2.5, w: 11, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 64, bold: true, color: CREAM, charSpacing: 10,
  });

  s.addText('Compliance + Escrow OS for African Aviation', {
    x: 1.0, y: 3.4, w: 11, h: 0.5,
    fontFace: FONT_BODY, fontSize: 20, color: TEXT_LIGHT, italic: false,
  });

  s.addText('THE BROKER PLATFORM', {
    x: 1.0, y: 4.7, w: 11, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: GOLD, charSpacing: 6,
  });

  s.addText('How Aeropreserve scales his Rolodex without losing his moat', {
    x: 1.0, y: 5.2, w: 11, h: 0.4,
    fontFace: FONT_BODY, fontSize: 16, color: TEXT_MUTED, italic: true,
  });

  s.addText('Naluka, backed by Aeropreserve   ·   June 2026', {
    x: 0.5, y: 6.85, w: 12, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, color: TEXT_MUTED,
  });
}

// ──────────────────────────────────────────────────────────────────
// Slide 2 — The problem
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  topBrand(s);

  s.addText('THE BROKER PROBLEM', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('You built the trust. The platform shouldn\'t replace you — it should scale you.', {
    x: 0.5, y: 1.6, w: 12, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 28, color: CREAM, italic: true,
  });

  // Three problem columns
  const problems = [
    {
      h: 'Manual quoting',
      d: 'Every RFQ becomes a chain of WhatsApps + emails. Quotes get lost. Suppliers respond at random hours. Days get burned on one part.',
    },
    {
      h: 'No audit trail',
      d: 'You remember the markup. The buyer remembers the price. The supplier remembers their cost. When SACAA asks, nobody can prove who paid what to whom.',
    },
    {
      h: 'Trust at scale = risk',
      d: 'The more buyers and suppliers you introduce to each other in WhatsApp, the more easily they cut you out. Your network becomes their network.',
    },
  ];

  problems.forEach((p, i) => {
    const x = 0.5 + i * 4.27;
    s.addShape(pres.ShapeType.rect, {
      x, y: 3.3, w: 4.0, h: 3.3,
      fill: { color: SLATE }, line: { color: GOLD, width: 0.5 },
    });
    s.addText(p.h, {
      x: x + 0.3, y: 3.5, w: 3.6, h: 0.5,
      fontFace: FONT_DISPLAY, fontSize: 20, bold: true, color: CREAM,
    });
    s.addText(p.d, {
      x: x + 0.3, y: 4.1, w: 3.6, h: 2.3,
      fontFace: FONT_BODY, fontSize: 13, color: TEXT_LIGHT,
      paraSpaceAfter: 6, lineSpacing: 18,
    });
  });

  pageNo(s, 2, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 3 — The solution
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  topBrand(s);

  s.addText('THE SOLUTION', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('A platform where the broker is the only one who sees both sides.', {
    x: 0.5, y: 1.6, w: 12, h: 0.8,
    fontFace: FONT_DISPLAY, fontSize: 28, color: CREAM, italic: true,
  });

  // Three large cards
  const cards = [
    { h: 'Software does the matching', d: 'Buyer posts what they need. Trigger auto-matches against your supplier inventory in milliseconds.', color: GOLD },
    { h: 'You set the margin', d: 'Per item, per quote, per buyer. Slider from 20% to 200%. The platform never forces a number on you.', color: SAGE },
    { h: 'Confidentiality is structural', d: 'Buyers cannot see supplier names. Suppliers cannot see buyer names. Enforced at the database level, not just hidden in the UI.', color: RUST },
  ];

  cards.forEach((c, i) => {
    const x = 0.5 + i * 4.27;
    // Accent line at top
    s.addShape(pres.ShapeType.rect, {
      x, y: 3.3, w: 4.0, h: 0.12,
      fill: { color: c.color }, line: { type: 'none' },
    });
    s.addShape(pres.ShapeType.rect, {
      x, y: 3.42, w: 4.0, h: 3.2,
      fill: { color: SLATE }, line: { type: 'none' },
    });
    s.addText(c.h, {
      x: x + 0.3, y: 3.65, w: 3.6, h: 0.5,
      fontFace: FONT_DISPLAY, fontSize: 18, bold: true, color: CREAM,
    });
    s.addText(c.d, {
      x: x + 0.3, y: 4.25, w: 3.6, h: 2.2,
      fontFace: FONT_BODY, fontSize: 13, color: TEXT_LIGHT,
      paraSpaceAfter: 6, lineSpacing: 18,
    });
  });

  pageNo(s, 3, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 4 — Confidentiality table (the heart of the pitch)
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightBg(s);
  topBrand(s, true);

  s.addText('THE CONFIDENTIALITY MODEL', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('Three users. Three different views of the same transaction.', {
    x: 0.5, y: 1.6, w: 12, h: 0.6,
    fontFace: FONT_DISPLAY, fontSize: 24, color: NAVY, italic: true,
  });

  // Table — 4 columns, 5 rows
  const tbl = [
    [
      { text: '', options: { bold: true, color: NAVY, fill: { color: CREAM } } },
      { text: 'BUYER', options: { bold: true, color: NAVY, fill: { color: GOLD }, align: 'center' } },
      { text: 'BROKER', options: { bold: true, color: NAVY, fill: { color: GOLD }, align: 'center' } },
      { text: 'SUPPLIER', options: { bold: true, color: NAVY, fill: { color: GOLD }, align: 'center' } },
    ],
    [
      { text: 'Sees buyer identity?', options: { bold: true, color: NAVY } },
      { text: 'self only', options: { color: SLATE, align: 'center' } },
      { text: '✓ ALL', options: { color: SAGE, bold: true, align: 'center' } },
      { text: '✕ never', options: { color: RUST, bold: true, align: 'center' } },
    ],
    [
      { text: 'Sees supplier identity?', options: { bold: true, color: NAVY } },
      { text: '✕ never', options: { color: RUST, bold: true, align: 'center' } },
      { text: '✓ ALL', options: { color: SAGE, bold: true, align: 'center' } },
      { text: 'self only', options: { color: SLATE, align: 'center' } },
    ],
    [
      { text: 'Sees supplier base price?', options: { bold: true, color: NAVY } },
      { text: '✕ never', options: { color: RUST, bold: true, align: 'center' } },
      { text: '✓', options: { color: SAGE, bold: true, align: 'center' } },
      { text: '✓ their own', options: { color: SAGE, bold: true, align: 'center' } },
    ],
    [
      { text: 'Sees retail price buyer pays?', options: { bold: true, color: NAVY } },
      { text: '✓ broker\'s quote', options: { color: SAGE, bold: true, align: 'center' } },
      { text: '✓', options: { color: SAGE, bold: true, align: 'center' } },
      { text: '✕ never', options: { color: RUST, bold: true, align: 'center' } },
    ],
  ];

  s.addTable(tbl, {
    x: 0.7, y: 2.6, w: 11.9, h: 3.6,
    fontFace: FONT_BODY, fontSize: 14,
    border: { type: 'solid', pt: 1, color: NAVY },
    rowH: 0.7,
  });

  s.addText('Enforced at the database level via Row-Level Security. Not just hidden in the UI.', {
    x: 0.5, y: 6.4, w: 12, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, color: SLATE, italic: true, align: 'center',
  });

  pageNo(s, 4, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 5 — How it works (flow)
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  topBrand(s);

  s.addText('THE DEAL FLOW', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('From RFQ to delivery in five steps.', {
    x: 0.5, y: 1.6, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 24, color: CREAM, italic: true,
  });

  // Five steps in a horizontal flow
  const steps = [
    { n: '1', t: 'Buyer posts RFQ', d: 'Part number, qty, condition, urgency' },
    { n: '2', t: 'System auto-matches', d: 'Trigger fires against your inventory in ms' },
    { n: '3', t: 'You set markup', d: 'Slider 20-200%, send quote(s) to buyer' },
    { n: '4', t: 'Buyer accepts', d: 'They see your price + name, not supplier' },
    { n: '5', t: 'Supplier ships', d: 'PO arrives with your name, not buyer\'s' },
  ];

  steps.forEach((step, i) => {
    const x = 0.5 + i * 2.55;
    // Number circle
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.85, y: 2.7, w: 0.7, h: 0.7,
      fill: { color: GOLD }, line: { type: 'none' },
    });
    s.addText(step.n, {
      x: x + 0.85, y: 2.7, w: 0.7, h: 0.7,
      fontFace: FONT_DISPLAY, fontSize: 26, bold: true, color: NAVY, align: 'center', valign: 'middle',
    });

    // Arrow to next step
    if (i < steps.length - 1) {
      s.addText('▸', {
        x: x + 1.95, y: 2.75, w: 0.6, h: 0.55,
        fontFace: FONT_DISPLAY, fontSize: 32, color: GOLD, align: 'center', valign: 'middle',
      });
    }

    // Title
    s.addText(step.t, {
      x: x + 0.1, y: 3.6, w: 2.3, h: 0.6,
      fontFace: FONT_DISPLAY, fontSize: 15, bold: true, color: CREAM, align: 'center',
    });
    // Subtitle
    s.addText(step.d, {
      x: x + 0.1, y: 4.2, w: 2.3, h: 1.0,
      fontFace: FONT_BODY, fontSize: 11, color: TEXT_MUTED, align: 'center',
      lineSpacing: 16,
    });
  });

  // Bottom payoff
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 5.8, w: 12.3, h: 0.85,
    fill: { color: SLATE }, line: { color: GOLD, width: 0.5 },
  });
  s.addText('Naluka holds the buyer\'s funds in escrow until delivery is confirmed. You\'re paid your cut automatically when the deal closes.', {
    x: 0.7, y: 5.85, w: 11.9, h: 0.75,
    fontFace: FONT_BODY, fontSize: 14, color: CREAM, italic: true, align: 'center', valign: 'middle',
  });

  pageNo(s, 5, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 6 — For buyers
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  topBrand(s);

  s.addText('FOR BUYERS', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('One trusted broker. Multiple quotes. Faster turnaround.', {
    x: 0.5, y: 1.6, w: 12, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 28, color: CREAM, italic: true,
  });

  const benefits = [
    { h: 'Stop chasing', d: 'Post once. Receive quotes from your broker without the WhatsApp back-and-forth.' },
    { h: 'Compare offers', d: 'If your broker quotes multiple matches, see them side by side. Pick the best one.' },
    { h: 'Audit-ready records', d: 'Every quote, acceptance, and delivery is timestamped and exportable for your SACAA audit pack.' },
    { h: 'No hidden games', d: 'You see the broker\'s markup % on every quote. No surprises. No "what was the real price?"' },
  ];

  benefits.forEach((b, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 0.5 + col * 6.27;
    const y = 3.0 + row * 2.0;

    s.addShape(pres.ShapeType.rect, {
      x, y, w: 6.0, h: 1.7,
      fill: { color: SLATE }, line: { type: 'none' },
    });
    s.addShape(pres.ShapeType.rect, {
      x, y, w: 0.08, h: 1.7,
      fill: { color: SAGE }, line: { type: 'none' },
    });
    s.addText(b.h, {
      x: x + 0.3, y: y + 0.15, w: 5.6, h: 0.5,
      fontFace: FONT_DISPLAY, fontSize: 18, bold: true, color: CREAM,
    });
    s.addText(b.d, {
      x: x + 0.3, y: y + 0.7, w: 5.6, h: 1.0,
      fontFace: FONT_BODY, fontSize: 13, color: TEXT_LIGHT, lineSpacing: 18,
    });
  });

  pageNo(s, 6, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 7 — For suppliers
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  topBrand(s);

  s.addText('FOR SUPPLIERS', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('List once. Your inventory works for you while you sleep.', {
    x: 0.5, y: 1.6, w: 12, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 28, color: CREAM, italic: true,
  });

  const benefits = [
    { h: 'Set your price, keep your margin', d: 'You list your net. The broker handles markup. What you list is what you get.' },
    { h: 'No buyer relationship management', d: 'No phone calls from a hundred different operators. The broker is your single counterparty.' },
    { h: 'Escrowed payments', d: 'Naluka holds the buyer\'s funds. You get paid when delivery is confirmed. No invoicing chase.' },
    { h: 'API or manual', d: 'Bulk-upload your inventory, or grant API read access. Either way, your stock is live to brokers globally.' },
  ];

  benefits.forEach((b, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 0.5 + col * 6.27;
    const y = 3.0 + row * 2.0;

    s.addShape(pres.ShapeType.rect, {
      x, y, w: 6.0, h: 1.7,
      fill: { color: SLATE }, line: { type: 'none' },
    });
    s.addShape(pres.ShapeType.rect, {
      x, y, w: 0.08, h: 1.7,
      fill: { color: RUST }, line: { type: 'none' },
    });
    s.addText(b.h, {
      x: x + 0.3, y: y + 0.15, w: 5.6, h: 0.5,
      fontFace: FONT_DISPLAY, fontSize: 18, bold: true, color: CREAM,
    });
    s.addText(b.d, {
      x: x + 0.3, y: y + 0.7, w: 5.6, h: 1.0,
      fontFace: FONT_BODY, fontSize: 13, color: TEXT_LIGHT, lineSpacing: 18,
    });
  });

  pageNo(s, 7, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 8 — For broker (Aeropreserve himself)
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  topBrand(s);

  s.addText('FOR THE BROKER', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('Your Rolodex. Your margins. Your control. At software scale.', {
    x: 0.5, y: 1.6, w: 12, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 28, color: CREAM, italic: true,
  });

  const benefits = [
    { h: 'Auto-matched RFQs', d: 'Trigger finds inventory matches the moment a buyer posts. No more manual cross-referencing.' },
    { h: 'Per-item markup control', d: 'Slider per match, 20-200%. You know each supplier\'s volume; only you know what the buyer will accept.' },
    { h: 'Money UI lights up', d: 'See total markup captured, your 50% cut, what\'s pending, what\'s owed. Real-time as deals close.' },
    { h: 'Step out gradually', d: 'Whatever you used to do in WhatsApp, the platform now does. You stay in the loop only when you want to.' },
  ];

  benefits.forEach((b, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 0.5 + col * 6.27;
    const y = 3.0 + row * 2.0;

    s.addShape(pres.ShapeType.rect, {
      x, y, w: 6.0, h: 1.7,
      fill: { color: SLATE }, line: { type: 'none' },
    });
    s.addShape(pres.ShapeType.rect, {
      x, y, w: 0.08, h: 1.7,
      fill: { color: GOLD }, line: { type: 'none' },
    });
    s.addText(b.h, {
      x: x + 0.3, y: y + 0.15, w: 5.6, h: 0.5,
      fontFace: FONT_DISPLAY, fontSize: 18, bold: true, color: CREAM,
    });
    s.addText(b.d, {
      x: x + 0.3, y: y + 0.7, w: 5.6, h: 1.0,
      fontFace: FONT_BODY, fontSize: 13, color: TEXT_LIGHT, lineSpacing: 18,
    });
  });

  pageNo(s, 8, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 9 — Pricing / deal math
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightBg(s);
  topBrand(s, true);

  s.addText('THE ECONOMICS', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('Worked example: one part, three parties paid.', {
    x: 0.5, y: 1.6, w: 12, h: 0.6,
    fontFace: FONT_DISPLAY, fontSize: 24, color: NAVY, italic: true,
  });

  // Flow visualization
  const flowY = 3.0;

  // Supplier box
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: flowY, w: 3.5, h: 3.5, fill: { color: NAVY }, line: { type: 'none' } });
  s.addText('SUPPLIER', { x: 0.5, y: flowY + 0.2, w: 3.5, h: 0.4, fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: GOLD, align: 'center', charSpacing: 4 });
  s.addText('Aermach', { x: 0.5, y: flowY + 0.7, w: 3.5, h: 0.5, fontFace: FONT_DISPLAY, fontSize: 22, color: CREAM, align: 'center' });
  s.addText('Lists at base price', { x: 0.5, y: flowY + 1.3, w: 3.5, h: 0.4, fontFace: FONT_BODY, fontSize: 12, color: TEXT_MUTED, align: 'center', italic: true });
  s.addText('ZAR 12,500', { x: 0.5, y: flowY + 1.8, w: 3.5, h: 0.6, fontFace: FONT_MONO, fontSize: 26, bold: true, color: CREAM, align: 'center' });
  s.addText('GETS PAID', { x: 0.5, y: flowY + 2.7, w: 3.5, h: 0.3, fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: SAGE, align: 'center', charSpacing: 3 });
  s.addText('ZAR 12,500', { x: 0.5, y: flowY + 3.0, w: 3.5, h: 0.5, fontFace: FONT_MONO, fontSize: 18, bold: true, color: SAGE, align: 'center' });

  // Broker box (center)
  s.addShape(pres.ShapeType.rect, { x: 4.85, y: flowY, w: 3.6, h: 3.5, fill: { color: GOLD }, line: { type: 'none' } });
  s.addText('BROKER', { x: 4.85, y: flowY + 0.2, w: 3.6, h: 0.4, fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: NAVY, align: 'center', charSpacing: 4 });
  s.addText('Aeropreserve', { x: 4.85, y: flowY + 0.7, w: 3.6, h: 0.5, fontFace: FONT_DISPLAY, fontSize: 22, color: NAVY, align: 'center' });
  s.addText('Sets markup 80%', { x: 4.85, y: flowY + 1.3, w: 3.6, h: 0.4, fontFace: FONT_BODY, fontSize: 12, color: NAVY, align: 'center', italic: true });
  s.addText('+ ZAR 10,000', { x: 4.85, y: flowY + 1.8, w: 3.6, h: 0.6, fontFace: FONT_MONO, fontSize: 26, bold: true, color: NAVY, align: 'center' });
  s.addText('CUT (50%)', { x: 4.85, y: flowY + 2.7, w: 3.6, h: 0.3, fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: NAVY, align: 'center', charSpacing: 3 });
  s.addText('ZAR 5,000', { x: 4.85, y: flowY + 3.0, w: 3.6, h: 0.5, fontFace: FONT_MONO, fontSize: 18, bold: true, color: NAVY, align: 'center' });

  // Buyer box
  s.addShape(pres.ShapeType.rect, { x: 9.33, y: flowY, w: 3.5, h: 3.5, fill: { color: NAVY }, line: { type: 'none' } });
  s.addText('BUYER', { x: 9.33, y: flowY + 0.2, w: 3.5, h: 0.4, fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: GOLD, align: 'center', charSpacing: 4 });
  s.addText('Operator', { x: 9.33, y: flowY + 0.7, w: 3.5, h: 0.5, fontFace: FONT_DISPLAY, fontSize: 22, color: CREAM, align: 'center' });
  s.addText('Sees quote total', { x: 9.33, y: flowY + 1.3, w: 3.5, h: 0.4, fontFace: FONT_BODY, fontSize: 12, color: TEXT_MUTED, align: 'center', italic: true });
  s.addText('ZAR 22,500', { x: 9.33, y: flowY + 1.8, w: 3.5, h: 0.6, fontFace: FONT_MONO, fontSize: 26, bold: true, color: CREAM, align: 'center' });
  s.addText('PAYS', { x: 9.33, y: flowY + 2.7, w: 3.5, h: 0.3, fontFace: FONT_DISPLAY, fontSize: 11, bold: true, color: RUST, align: 'center', charSpacing: 3 });
  s.addText('ZAR 22,500', { x: 9.33, y: flowY + 3.0, w: 3.5, h: 0.5, fontFace: FONT_MONO, fontSize: 18, bold: true, color: RUST, align: 'center' });

  // Arrows between boxes
  s.addText('→', { x: 4.0, y: flowY + 1.5, w: 0.9, h: 0.5, fontFace: FONT_DISPLAY, fontSize: 36, color: NAVY, align: 'center' });
  s.addText('→', { x: 8.45, y: flowY + 1.5, w: 0.9, h: 0.5, fontFace: FONT_DISPLAY, fontSize: 36, color: NAVY, align: 'center' });

  // Naluka takeaway
  s.addText('Naluka platform fee = ZAR 5,000 (the other 50% of markup)', {
    x: 0.5, y: 6.8, w: 12.3, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, color: SLATE, italic: true, align: 'center',
  });

  pageNo(s, 9, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 10 — Security & compliance
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  topBrand(s);

  s.addText('SECURITY & TRUST', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('Aviation-grade. Built for the SACAA audit, not for the demo video.', {
    x: 0.5, y: 1.6, w: 12, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 26, color: CREAM, italic: true,
  });

  const points = [
    { h: 'Row-Level Security', d: 'Every database query is filtered at the row level by who you are. The confidentiality model is not "we promise not to look" — it\'s "we cannot look without a code change."' },
    { h: 'Hash-chained audit ledger', d: 'Every regulated event (RTS signed, funds released, dispute opened, KYC approved) is appended to a tamper-evident SHA-256 chain. Verify any segment in one click.' },
    { h: 'Escrow custody', d: 'Buyer funds sit with Naluka, not the broker. Even if a broker goes dark, buyers are protected; even if a buyer disputes, suppliers know their payout is preserved pending arbitration.' },
    { h: 'POPI + KYC', d: 'Full POPI Act compliance for SA data subjects. KYC includes SACAA licence checks and ICAO state-of-licence verification for foreign nationals.' },
  ];

  points.forEach((p, i) => {
    const y = 3.0 + i * 0.95;
    s.addShape(pres.ShapeType.rect, {
      x: 0.5, y, w: 12.3, h: 0.8,
      fill: { color: SLATE }, line: { type: 'none' },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0.5, y, w: 0.08, h: 0.8,
      fill: { color: GOLD }, line: { type: 'none' },
    });
    s.addText(p.h, {
      x: 0.8, y: y + 0.05, w: 4.0, h: 0.7,
      fontFace: FONT_DISPLAY, fontSize: 15, bold: true, color: GOLD, valign: 'middle',
    });
    s.addText(p.d, {
      x: 4.9, y: y + 0.05, w: 7.8, h: 0.7,
      fontFace: FONT_BODY, fontSize: 12, color: TEXT_LIGHT, valign: 'middle', lineSpacing: 15,
    });
  });

  pageNo(s, 10, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 11 — Roadmap
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  topBrand(s);

  s.addText('ROADMAP', {
    x: 0.5, y: 1.0, w: 12, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, bold: true, color: GOLD, charSpacing: 4,
  });

  s.addText('Shipping now → next quarter → 6 months out.', {
    x: 0.5, y: 1.6, w: 12, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 28, color: CREAM, italic: true,
  });

  const lanes = [
    {
      h: 'LIVE TODAY', color: SAGE,
      items: [
        'Buyer RFQ + broker matching + supplier PO',
        'Per-item markup slider (20-200%)',
        'Auto-match trigger on RFQ',
        'Referral attribution + dashboard',
        'Confidentiality boundaries (DB-enforced)',
        'KYC + audit ledger',
      ],
    },
    {
      h: 'NEXT QUARTER', color: GOLD,
      items: [
        'PayFast integrated escrow',
        'Multi-currency (USD, GBP, EUR)',
        'In-app + email notifications',
        'AOG fast-path (WhatsApp ping)',
        'Supplier API onboarding',
        'Custom domain naluka.aero',
      ],
    },
    {
      h: 'SIX MONTHS', color: RUST,
      items: [
        'Competitive multi-broker bidding',
        'Logistics + customs integration',
        'Aircraft fleet management',
        'Team accounts (multi-user ops)',
        'Pan-African expansion (Kenya, Nigeria)',
        'Mobile app (iOS + Android)',
      ],
    },
  ];

  lanes.forEach((lane, i) => {
    const x = 0.5 + i * 4.27;

    s.addShape(pres.ShapeType.rect, {
      x, y: 3.0, w: 4.0, h: 0.6,
      fill: { color: lane.color }, line: { type: 'none' },
    });
    s.addText(lane.h, {
      x, y: 3.0, w: 4.0, h: 0.6,
      fontFace: FONT_DISPLAY, fontSize: 14, bold: true, color: NAVY, align: 'center', valign: 'middle', charSpacing: 4,
    });

    s.addShape(pres.ShapeType.rect, {
      x, y: 3.6, w: 4.0, h: 3.4,
      fill: { color: SLATE }, line: { type: 'none' },
    });

    s.addText(
      lane.items.map((it) => ({ text: '·  ' + it, options: { breakLine: true } })),
      {
        x: x + 0.3, y: 3.85, w: 3.6, h: 3.1,
        fontFace: FONT_BODY, fontSize: 12, color: TEXT_LIGHT,
        paraSpaceAfter: 8, lineSpacing: 18,
      }
    );
  });

  pageNo(s, 11, TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// Slide 12 — Call to action
// ──────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);

  // Gold accent line on right
  s.addShape(pres.ShapeType.rect, {
    x: 12.75, y: 1.0, w: 0.08, h: 5.5,
    fill: { color: GOLD }, line: { type: 'none' },
  });

  s.addText('Stop chasing WhatsApps.', {
    x: 0.7, y: 2.0, w: 12, h: 0.8,
    fontFace: FONT_DISPLAY, fontSize: 44, color: CREAM, italic: true,
  });
  s.addText('Start closing deals.', {
    x: 0.7, y: 2.85, w: 12, h: 0.8,
    fontFace: FONT_DISPLAY, fontSize: 44, bold: true, color: GOLD,
  });

  s.addText('Register at  naluka.aero  with the email Aeropreserve invited you on.', {
    x: 0.7, y: 4.2, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 18, color: TEXT_LIGHT,
  });

  s.addText('Your prospect record is already there. You sign up. You\'re live.', {
    x: 0.7, y: 4.7, w: 12, h: 0.4,
    fontFace: FONT_BODY, fontSize: 14, color: TEXT_MUTED, italic: true,
  });

  s.addShape(pres.ShapeType.rect, {
    x: 0.7, y: 5.6, w: 4.5, h: 0.8,
    fill: { color: GOLD }, line: { type: 'none' },
  });
  s.addText('REGISTER NOW →', {
    x: 0.7, y: 5.6, w: 4.5, h: 0.8,
    fontFace: FONT_DISPLAY, fontSize: 18, bold: true, color: NAVY, align: 'center', valign: 'middle', charSpacing: 4,
  });

  s.addText('Questions: aeropreserve@naluka.aero   ·   support@naluka.aero', {
    x: 0.7, y: 6.85, w: 12, h: 0.3,
    fontFace: FONT_MONO, fontSize: 11, color: TEXT_MUTED,
  });
}

pres.writeFile({ fileName: 'docs/naluka-broker-pitch.pptx' })
  .then((f) => console.log(`Wrote ${f}`))
  .catch((e) => { console.error(e); process.exit(1); });
