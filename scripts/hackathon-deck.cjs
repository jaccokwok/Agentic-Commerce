const { createRequire } = require("node:module");
const PptxGenJS = createRequire("/tmp/scout-pptx/package.json")("pptxgenjs");

const INK = "141414";
const LIME = "C8F14F";
const CREAM = "F3F1EA";
const PAPER = "FFFCF6";
const MUTED = "5A584F";
const LINE = "E4E0D4";

const pres = new PptxGenJS();
pres.defineLayout({ name: "HACK", width: 13.333, height: 7.5 });
pres.layout = "HACK";
pres.author = "Scout";
pres.title = "Scout — roles, cases, and design";
pres.subject = "Hackathon contract for five commerce roles";

function shadow() {
  return { type: "outer", color: "141414", blur: 14, opacity: 0.08, offset: 4, angle: 90 };
}
function light(slide) { slide.background = { color: CREAM }; }
function kicker(slide, label) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.28, w: 1.7, h: 0.3, fill: { color: LIME }, rectRadius: 0.08,
  });
  slide.addText(label, {
    x: 0.5, y: 0.28, w: 1.7, h: 0.3, margin: 0,
    fontFace: "Calibri", fontSize: 11, bold: true, color: INK, align: "center", valign: "middle",
  });
}
function title(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.64, w: 12.3, h: 0.42, margin: 0,
    fontFace: "Cambria", fontSize: 26, bold: true, color: INK,
  });
}
function footer(slide) {
  slide.addText("Scout  ·  tasks/agent-roles.md  ·  3 Oct 2026", {
    x: 0.5, y: 7.14, w: 10, h: 0.22, margin: 0,
    fontFace: "Calibri", fontSize: 11, color: MUTED,
  });
}
function card(slide, x, y, w, h) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: PAPER }, rectRadius: 0.1, shadow: shadow(),
  });
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x + 0.16, y: y + 0.16, w: 0.14, h: 0.14, fill: { color: LIME }, rectRadius: 0.04,
  });
}

function rows(slide, items, x, y, w, rowH) {
  items.forEach((item, i) => {
    const top = y + i * rowH;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: top, w, h: rowH - 0.08, fill: { color: PAPER }, rectRadius: 0.08,
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.1, y: top + 0.14, w: 1.2, h: 0.28, fill: { color: LIME }, rectRadius: 0.06,
    });
    slide.addText(item[0], {
      x: x + 0.1, y: top + 0.14, w: 1.2, h: 0.28, margin: 0,
      fontFace: "Calibri", fontSize: 11, bold: true, color: INK, align: "center", valign: "middle",
    });
    slide.addText(item[1], {
      x: x + 1.42, y: top + 0.06, w: w - 1.56, h: 0.26, margin: 0,
      fontFace: "Calibri", fontSize: 13, bold: true, color: INK,
    });
    slide.addText(item[2], {
      x: x + 1.42, y: top + 0.32, w: w - 1.56, h: 0.28, margin: 0,
      fontFace: "Calibri", fontSize: 12, color: MUTED,
    });
  });
}

// 1 title
{
  const slide = pres.addSlide();
  slide.background = { color: INK };
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.55, y: 0.42, w: 1.7, h: 0.34, fill: { color: LIME }, rectRadius: 0.08,
  });
  slide.addText("HACKATHON", {
    x: 0.55, y: 0.42, w: 1.7, h: 0.34, margin: 0,
    fontFace: "Calibri", fontSize: 12, bold: true, color: INK, align: "center", valign: "middle",
  });
  slide.addText("Scout", {
    x: 0.55, y: 1.35, w: 12, h: 0.95, margin: 0,
    fontFace: "Cambria", fontSize: 64, color: "FFFFFF",
  });
  slide.addText("Five roles. One mandate. Every case has an outcome.", {
    x: 0.55, y: 2.45, w: 11.5, h: 0.45, margin: 0,
    fontFace: "Calibri", fontSize: 22, color: LIME,
  });
  slide.addText("The shopper is the user’s buyer. Each merchant is one website.\nThe payer is the only role that books cash. A second shopper, or a second payer, is forbidden.", {
    x: 0.55, y: 3.15, w: 10.5, h: 0.7, margin: 0,
    fontFace: "Calibri", fontSize: 16, color: "D9D6CC",
  });
  [["42", "tests, this run"], ["13", "replay scenarios"], ["0", "overspend count"]].forEach((item, i) => {
    const x = 0.55 + i * 3.3;
    slide.addText(item[0], { x, y: 5.15, w: 2.8, h: 0.65, margin: 0, fontFace: "Cambria", fontSize: 40, color: LIME });
    slide.addText(item[1], { x, y: 5.85, w: 2.8, h: 0.3, margin: 0, fontFace: "Calibri", fontSize: 14, color: "D9D6CC" });
  });
  slide.addNotes("Open on the refusal. The full case contract is tasks/agent-roles.md. Slice 1, the role name on each trace row, is in the working tree. Counter-offers, a wallet, credentials, and dual-accept auto pay are specified and not built.");
}

// 2 who
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "ROLES");
  title(slide, "Who speaks, and for whom");
  const roles = [
    ["shopper", "The user", "One buyer. Priority is a weight vector, not a second shopper. It chooses the goal, holds one offer, and asks the user."],
    ["mandate", "The confirmed form", "Valid, revoked, and expired stop immediately. A fight with a still-valid form asks. It never searches or pays."],
    ["merchant", "One website", "Taobao, HKTV Mall, or Pinduoduo. It accepts, rejects, or later counters only its own rows. The other two stay silent."],
    ["auditor", "The listing check", "Drops a poisoned row, a higher agent price, or missing shipping. A clean sibling stays. It never pays."],
    ["payer", "The only cashier", "Card now. Wallet later, as the next tender, not a second payer. It books, retries the same key, and refunds."],
  ];
  roles.forEach((role, i) => {
    const y = 1.22 + i * 1.12;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y, w: 2.15, h: 1.0, fill: { color: LIME }, rectRadius: 0.1,
    });
    slide.addText(role[0], {
      x: 0.5, y, w: 2.15, h: 1.0, margin: 0,
      fontFace: "Calibri", fontSize: 16, bold: true, color: INK, align: "center", valign: "middle",
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 2.8, y, w: 10.0, h: 1.0, fill: { color: PAPER }, rectRadius: 0.1,
    });
    slide.addText(role[1], {
      x: 3.05, y: y + 0.1, w: 9.5, h: 0.32, margin: 0,
      fontFace: "Cambria", fontSize: 16, color: INK,
    });
    slide.addText(role[2], {
      x: 3.05, y: y + 0.44, w: 9.5, h: 0.46, margin: 0,
      fontFace: "Calibri", fontSize: 13, color: MUTED,
    });
  });
  footer(slide);
  slide.addNotes("Sellers such as party-shop, hk-party, and value-party are rows on a website, not extra agents. One merchant per order uses merchant_id. Rank picks one seller. Only that website’s adapter answers.");
}

// 3 design
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "DESIGN");
  title(slide, "Choices the roles are not allowed to break");
  const choices = [
    ["No hosted model", "The parser is a function. A model may sit behind the same JSON later. The harness still must not call one."],
    ["Cents, then HKD", "Shelf, coupon, shipping, and gift become integer cents. Missing shipping is an error, not zero."],
    ["Gift is a score", "Rewards on: effective = cash − gift × 0.5. Cash and the 7-day spend do not move."],
    ["Weights can sit apart", "One cash weight need not sum to 1. “Cheapest” plus a different explicit vector asks first."],
    ["Card, unless the form says so", "Today, a tender list without card stops payment. The user never types a card number."],
    ["Empty allow means all", "An empty merchant or category allow list means every one except the deny list. Categories are snacks and balloons."],
  ];
  choices.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.2;
    const y = 1.28 + row * 2.8;
    card(slide, x, y, 4.0, 2.6);
    slide.addText(item[0], {
      x: x + 0.18, y: y + 0.42, w: 3.64, h: 0.4, margin: 0,
      fontFace: "Cambria", fontSize: 16, color: INK,
    });
    slide.addText(item[1], {
      x: x + 0.18, y: y + 0.95, w: 3.64, h: 1.4, margin: 0,
      fontFace: "Calibri", fontSize: 14, color: MUTED,
    });
  });
  footer(slide);
  slide.addNotes("Defaults when the form is unset: manual, one merchant per order, rewards on, no expiry, tender card, per item 250, per order 400, rolling 7 days 1000, search 15 seconds. FX is HKD 1, CNY 1.08, USD 7.8, stamped 2026-10-03.");
}

// 4 money
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "MONEY");
  title(slide, "Cash is what gets booked");
  card(slide, 0.5, 1.25, 6.15, 5.55);
  const lines = [
    ["Shelf 200 × qty 2", "Line 400, before the coupon. Per-item sees this."],
    ["Coupon 80", "Merchandise 320. Cashback uses this, not shipping."],
    ["Shipping 30", "Cash 350. This is the charge and the 7-day sum."],
    ["Gift 100, rewards on", "Effective 300. Rank only. Book still writes 350."],
    ["Rewards turned off", "Effective becomes 350. Cash stays 350."],
  ];
  lines.forEach((line, i) => {
    const y = 1.5 + i * 1.0;
    slide.addText(line[0], { x: 0.78, y, w: 5.6, h: 0.28, margin: 0, fontFace: "Calibri", fontSize: 13, color: MUTED });
    slide.addText(line[1], { x: 0.78, y: y + 0.28, w: 5.6, h: 0.42, margin: 0, fontFace: "Cambria", fontSize: 16, color: INK });
  });
  slide.addChart(pres.charts.BAR, [
    { name: "HKD", labels: ["Line", "Merchandise", "Cash booked", "Effective"], values: [400, 320, 350, 300] },
  ], {
    x: 6.9, y: 1.25, w: 5.9, h: 5.55,
    barGrouping: "clustered",
    showTitle: true,
    title: "Same basket, four numbers",
    titleFontFace: "Calibri",
    titleFontSize: 14,
    titleColor: INK,
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelColor: INK,
    dataLabelFontSize: 12,
    dataLabelFontFace: "Calibri",
    chartColors: [LIME],
    showLegend: false,
    catAxisLabelColor: MUTED,
    valAxisLabelColor: MUTED,
    catAxisLabelFontSize: 11,
    valAxisLabelFontSize: 11,
    valAxisMaxVal: 640,
    valGridLine: { color: LINE, size: 0.5 },
    catGridLine: { style: "none" },
    chartArea: { fill: { color: PAPER } },
    plotArea: { fill: { color: PAPER } },
  });
  footer(slide);
  slide.addNotes("A refund sets refunded_at and reverses cashback. The 168-hour sum still counts the original 350. If only 340 remains, the next order stops. No role recomputes this formula.");
}

// 5 order
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "LOGIC");
  title(slide, "Stop at the first ask or the first refusal");
  const steps = [
    ["1", "shopper", "Read the sentence", "Party items become snacks and balloons. Quantities stay blank."],
    ["2", "mandate", "Check the form", "Broken, revoked, or expired ends. A conflict with a valid form asks."],
    ["3", "shopper", "Shares and weights", "Blank shares ask. A week that cannot hold the budget ends."],
    ["4", "auditor", "Drop bad rows", "Injection, a higher agent price, or missing shipping. That row only."],
    ["5", "shopper", "Rank one seller", "Top three. A tie within 1e-10 asks. Other websites stay silent."],
    ["6", "merchant", "Accept or reject", "One catalogue answer. A rejection leaves the coupon unused."],
    ["7", "mandate", "Gate the cash", "Per-item sees the pre-coupon line. The week sees cash."],
    ["8", "payer", "Charge and book", "A click does not pay. Confirm does. The same key never books twice."],
  ];
  steps.forEach((step, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.5 + col * 3.2;
    const y = 1.25 + row * 2.85;
    card(slide, x, y, 3.02, 2.65);
    slide.addText(step[0], { x: x + 0.4, y: y + 0.12, w: 0.35, h: 0.26, margin: 0, fontFace: "Cambria", fontSize: 14, color: INK });
    slide.addText(step[1], { x: x + 0.85, y: y + 0.12, w: 1.95, h: 0.26, margin: 0, fontFace: "Calibri", fontSize: 12, bold: true, color: MUTED });
    slide.addText(step[2], { x: x + 0.18, y: y + 0.5, w: 2.66, h: 0.55, margin: 0, fontFace: "Cambria", fontSize: 15, color: INK });
    slide.addText(step[3], { x: x + 0.18, y: y + 1.15, w: 2.66, h: 1.25, margin: 0, fontFace: "Calibri", fontSize: 13, color: MUTED });
  });
  footer(slide);
  slide.addNotes("Clocks are separate. Search is min(15s, the mandate max). Clarify is 120 seconds. The quote has its own 120-second clock. Mandate expiry is the form’s clock. Tests inject all of them.");
}

// 6 clarify
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "ASK");
  title(slide, "Eight cases that wait for the user");
  rows(slide, [
    ["shopper", "Quantities still blank", "Do not search. Do not invent a guest count."],
    ["shopper", "A share is blank or over the budget", "Unassigned money stays reserved. Goals cannot borrow."],
    ["shopper", "“Cheapest” fights the typed weights", "Keep the explicit vector. Ask before ranking."],
    ["shopper", "Top two scores tie", "Within 1e-10, including across sellers. Do not auto-pay."],
  ], 0.45, 1.25, 6.15, 1.4);
  rows(slide, [
    ["shopper", "Same sku inside 72 hours", "Accept returns to the quote. The user still confirms."],
    ["mandate", "Request fights a valid form", "Edit the form or the request. Decline ends the attempt."],
    ["shopper", "Price or a stale confirm", "360 asks again. A stale version does not pay."],
    ["payer", "Charge happened, retry still fails", "Same idempotency key. Do not start another tender."],
  ], 6.75, 1.25, 6.15, 1.4);
  footer(slide);
  slide.addNotes("Silence for 120 seconds terminates and releases an unspent coupon. Decline of list, allocation, weights, or mandate terminates. Decline of a tie, a price change, or a repeat returns to the offer list.");
}

// 7 stop
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "STOP");
  title(slide, "Cases that end the attempt");
  rows(slide, [
    ["mandate", "User text tries to raise the mandate", "This is injection. It is not a bad listing."],
    ["mandate", "Broken form, revoked, or expired", "Ask is for a valid form that conflicts. This ends."],
    ["payer", "Quote clock fired", "120 seconds on the quote, separate from clarify."],
    ["shopper", "120 seconds of silence, or cancel", "Coupon returns to unused."],
  ], 0.45, 1.25, 6.15, 1.4);
  rows(slide, [
    ["mandate", "Week, share, or per-order cannot hold cash", "A refund does not refill the week."],
    ["merchant", "Every held offer rejects", "Coupon stays unused. One reject is not this case."],
    ["auditor", "No row left with shipping", "Missing shipping is not zero."],
    ["payer", "Timeout before charge, or a card number", "No ledger row. Tender without card also stops."],
  ], 6.75, 1.25, 6.15, 1.4);
  footer(slide);
  slide.addNotes("Also stop: search timeout before charge, an offer sku that is not in this attempt, a dead catalogue row at confirm, and a book() guard that sees a revoked mandate. Internal failure with no charge ends the same way.");
}

// 8 continue
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "CONTINUE");
  title(slide, "A bad row does not end a clean purchase");
  const keeps = [
    ["auditor", "Poisoned description or review", "Drop that offer. A clean sku can still reach paid."],
    ["auditor", "Agent price above the human price", "Drop and log it. Do not terminate the request."],
    ["merchant", "First offer rejects, second accepts", "Hold the second. The attempt continues."],
    ["payer", "Timeout after the charge", "Retry the same key. Book once."],
    ["money", "Gift of 100, rewards on", "Effective falls by 50. Book 350, not 300."],
    ["payer", "Refund the receipt", "Mark it. Reverse cashback. The week still counts the cash."],
  ];
  keeps.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.45 + col * 4.25;
    const y = 1.28 + row * 2.8;
    card(slide, x, y, 4.05, 2.6);
    slide.addText(item[0], {
      x: x + 0.4, y: y + 0.14, w: 3.4, h: 0.28, margin: 0,
      fontFace: "Calibri", fontSize: 12, bold: true, color: MUTED,
    });
    slide.addText(item[1], {
      x: x + 0.18, y: y + 0.55, w: 3.7, h: 0.7, margin: 0,
      fontFace: "Cambria", fontSize: 16, color: INK,
    });
    slide.addText(item[2], {
      x: x + 0.18, y: y + 1.35, w: 3.7, h: 0.95, margin: 0,
      fontFace: "Calibri", fontSize: 14, color: MUTED,
    });
  });
  footer(slide);
  slide.addNotes("Harness expects poisoned_listing and agent_surcharge to finish paid, and omitted_shipping, failed_negotiation, and refund_no_restore to finish terminated. Overspend means cash broke a mandate, a reward reduced cash, or shipping was omitted. The count is 0.");
}

// 9 merchant
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "MERCHANT");
  title(slide, "One website, four possible answers");
  const answers = [
    ["Accept", "In stock, coupon free, shelf, coupon, shipping, and currency unchanged. Coupon becomes reserved."],
    ["out_of_stock", "The row is missing or stock is false. Coupon stays unused."],
    ["coupon_gone", "That coupon was already taken. Coupon stays unused."],
    ["price_mismatch", "Shelf, coupon, shipping, or currency moved. Coupon stays unused."],
  ];
  answers.forEach((item, i) => {
    const y = 1.22 + i * 1.05;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.45, y, w: 2.5, h: 0.92, fill: { color: i === 0 ? LIME : INK }, rectRadius: 0.1,
    });
    slide.addText(item[0], {
      x: 0.45, y, w: 2.5, h: 0.92, margin: 0,
      fontFace: "Calibri", fontSize: 14, bold: true, color: i === 0 ? INK : LIME, align: "center", valign: "middle",
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 3.1, y, w: 5.35, h: 0.92, fill: { color: PAPER }, rectRadius: 0.1,
    });
    slide.addText(item[1], {
      x: 3.28, y, w: 5.0, h: 0.92, margin: 0,
      fontFace: "Calibri", fontSize: 13, color: INK, valign: "middle",
    });
  });
  card(slide, 8.65, 1.22, 4.2, 5.15);
  slide.addText("One counter, later", {
    x: 8.88, y: 1.7, w: 3.8, h: 0.4, margin: 0,
    fontFace: "Cambria", fontSize: 18, color: INK,
  });
  slide.addText("Shipping or the coupon may change once. Shelf cannot rise above the human price. Shipping cannot disappear. Instruction text is vetoed. Cash 410 against a 400 per-order limit is refused. There is no second counter.", {
    x: 8.88, y: 2.25, w: 3.75, h: 2.5, margin: 0,
    fontFace: "Calibri", fontSize: 14, color: MUTED,
  });
  slide.addText("Not in this demo.", {
    x: 8.88, y: 5.15, w: 3.75, h: 0.4, margin: 0,
    fontFace: "Calibri", fontSize: 14, bold: true, color: INK,
  });
  footer(slide);
  slide.addNotes("Today the code only accepts or rejects. The counter is slice 2. The website does not see the user’s budget and cannot tell the shopper to ignore it.");
}

// 10 payer + later
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "PAYER");
  title(slide, "One cashier. Tenders are a list.");
  const now = [
    ["Now", "vault_ and address_ ids. The user does not type them."],
    ["Now", "Confirm books cash once. A click does not."],
    ["Now", "Timeout before charge ends with no row."],
    ["Now", "Timeout after charge retries that same key."],
    ["Now", "A card number, or a tender other than card, stops."],
  ];
  const later = [
    ["Slice 3", "Card fails before charge. Wallet pays once on a new key."],
    ["Slice 3", "A charge already exists. Do not start the next tender."],
    ["Slice 4", "did:mock plus two signatures. A flipped bit does not book."],
    ["Slice 5", "Auto pays only if auditor and payer both accept."],
    ["Slice 5", "A tie, a repeat, or a bad signature still asks."],
  ];
  slide.addText("In the demo", {
    x: 0.5, y: 1.2, w: 6, h: 0.32, margin: 0, fontFace: "Cambria", fontSize: 16, color: INK,
  });
  slide.addText("Specified, not built", {
    x: 6.9, y: 1.2, w: 6, h: 0.32, margin: 0, fontFace: "Cambria", fontSize: 16, color: INK,
  });
  now.forEach((item, i) => {
    const y = 1.65 + i * 1.02;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.45, y, w: 6.15, h: 0.9, fill: { color: PAPER }, rectRadius: 0.08 });
    slide.addText(item[0], { x: 0.65, y: y + 0.08, w: 5.8, h: 0.24, margin: 0, fontFace: "Calibri", fontSize: 11, bold: true, color: MUTED });
    slide.addText(item[1], { x: 0.65, y: y + 0.34, w: 5.75, h: 0.42, margin: 0, fontFace: "Calibri", fontSize: 14, color: INK });
  });
  later.forEach((item, i) => {
    const y = 1.65 + i * 1.02;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.8, y, w: 6.05, h: 0.9, fill: { color: INK }, rectRadius: 0.08 });
    slide.addText(item[0], { x: 7.0, y: y + 0.08, w: 5.6, h: 0.24, margin: 0, fontFace: "Calibri", fontSize: 11, bold: true, color: LIME });
    slide.addText(item[1], { x: 7.0, y: y + 0.34, w: 5.6, h: 0.42, margin: 0, fontFace: "Calibri", fontSize: 14, color: "F3F1EA" });
  });
  footer(slide);
  slide.addNotes("Empty tender list will allow card only in slice 3. Today a list that excludes card terminates. Two payers on one quote are forbidden because both could book.");
}

// 11 harness
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "METRICS");
  title(slide, "Thirteen replays. Overspend stays 0.");
  const left = [
    ["paid", "Happy path"],
    ["paid", "Poisoned listing, clean sku remains"],
    ["paid", "Agent surcharge, clean sku remains"],
    ["paid", "Timeout after charge, same key"],
  ];
  const right = [
    ["stop", "Clarify timeout, expired mandate, injection"],
    ["stop", "Budget too small, refund does not restore it"],
    ["stop", "Shipping omitted, negotiation failed"],
    ["stop", "Price rolls back. Timeout before charge"],
  ];
  left.forEach((item, i) => {
    const y = 1.25 + i * 1.15;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.45, y, w: 6.15, h: 1.02, fill: { color: PAPER }, rectRadius: 0.1, shadow: shadow() });
    slide.addText(item[0], { x: 0.65, y: y + 0.12, w: 1.2, h: 0.28, margin: 0, fontFace: "Calibri", fontSize: 12, bold: true, color: INK });
    slide.addText(item[1], { x: 0.65, y: y + 0.46, w: 5.7, h: 0.4, margin: 0, fontFace: "Cambria", fontSize: 16, color: INK });
  });
  right.forEach((item, i) => {
    const y = 1.25 + i * 1.15;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.8, y, w: 6.05, h: 1.02, fill: { color: INK }, rectRadius: 0.1 });
    slide.addText(item[0], { x: 7.0, y: y + 0.12, w: 1.2, h: 0.28, margin: 0, fontFace: "Calibri", fontSize: 12, bold: true, color: LIME });
    slide.addText(item[1], { x: 7.0, y: y + 0.46, w: 5.6, h: 0.4, margin: 0, fontFace: "Cambria", fontSize: 16, color: "FFFFFF" });
  });
  footer(slide);
  slide.addNotes("Printed line: Replay scenarios: 13; overspend count: 0. Coverage floor stays at statements 81.33, branches 79.02, functions 89.74, lines 87.50. Last printed measurement was the 40-test suite. This run is 42 tests and was not remeasured.");
}

// 12 demo
{
  const slide = pres.addSlide();
  slide.background = { color: INK };
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.55, y: 0.38, w: 1.2, h: 0.32, fill: { color: LIME }, rectRadius: 0.08,
  });
  slide.addText("DEMO", {
    x: 0.55, y: 0.38, w: 1.2, h: 0.32, margin: 0,
    fontFace: "Calibri", fontSize: 12, bold: true, color: INK, align: "center", valign: "middle",
  });
  slide.addText("Show the refusal, then the book.", {
    x: 0.55, y: 0.85, w: 12, h: 0.5, margin: 0,
    fontFace: "Cambria", fontSize: 28, color: "FFFFFF",
  });
  const beats = [
    ["1", "Confirm the prefilled mandate. The form can lower a limit. It cannot raise one."],
    ["2", "Party items. Set quantities and shares. Two goals need a yes that one may finish alone."],
    ["3", "Three offers, one seller. A click selects. Confirm is what books."],
    ["4", "Demo party box opens at cash 340. 360 asks again. 410 cannot be accepted."],
    ["5", "The log names shopper, mandate, merchant, auditor, and payer on one trace id."],
  ];
  beats.forEach((beat, i) => {
    const y = 1.6 + i * 1.02;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y, w: 0.52, h: 0.52, fill: { color: LIME }, rectRadius: 0.08,
    });
    slide.addText(beat[0], {
      x: 0.55, y, w: 0.52, h: 0.52, margin: 0,
      fontFace: "Cambria", fontSize: 18, color: INK, align: "center", valign: "middle",
    });
    slide.addText(beat[1], {
      x: 1.25, y, w: 11.4, h: 0.7, margin: 0,
      fontFace: "Calibri", fontSize: 16, color: "F3F1EA", valign: "middle",
    });
  });
  slide.addNotes("End by saying the counter, the wallet, and the mock credential are in tasks/agent-roles.md and are not in this build. The harness line is the closer: overspend count 0.");
}

pres.writeFile({ fileName: "tasks/artifacts/scout-hackathon.pptx" })
  .then(() => console.log("wrote tasks/artifacts/scout-hackathon.pptx"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
