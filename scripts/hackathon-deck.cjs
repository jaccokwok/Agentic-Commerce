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
  [["49", "tests, this run"], ["13", "replay scenarios"], ["0", "overspend count"]].forEach((item, i) => {
    const x = 0.55 + i * 3.3;
    slide.addText(item[0], { x, y: 5.15, w: 2.8, h: 0.65, margin: 0, fontFace: "Cambria", fontSize: 40, color: LIME });
    slide.addText(item[1], { x, y: 5.85, w: 2.8, h: 0.3, margin: 0, fontFace: "Calibri", fontSize: 14, color: "D9D6CC" });
  });
  slide.addNotes("Open on the refusal. The full case contract is tasks/agent-roles.md. Slices 0 through 5 are in the working tree and are not committed. There is no live card charge, no DID registry, and no hosted model.");
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
    ["merchant", "One website", "Taobao, HKTV Mall, or Pinduoduo. It accepts, rejects, or counters once, and only its own rows. The other two stay silent."],
    ["auditor", "The listing check", "Drops a poisoned row, a higher agent price, or missing shipping. It also checks the two slips before a charge. It never pays."],
    ["payer", "The only cashier", "Card, then wallet if card never charged. It books, retries the same key, and refunds. It is not a second payer."],
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
  slide.addText("One counter, in the tests", {
    x: 8.88, y: 1.7, w: 3.8, h: 0.4, margin: 0,
    fontFace: "Cambria", fontSize: 18, color: INK,
  });
  slide.addText("Shipping or the coupon may change once. Shelf cannot rise above the human price. Shipping cannot disappear. Instruction text is vetoed. Cash 410 against a 400 per-order limit is refused. There is no second counter.", {
    x: 8.88, y: 2.25, w: 3.75, h: 2.5, margin: 0,
    fontFace: "Calibri", fontSize: 14, color: MUTED,
  });
  slide.addText("Not on the click-through sku.", {
    x: 8.88, y: 5.15, w: 3.75, h: 0.4, margin: 0,
    fontFace: "Calibri", fontSize: 14, bold: true, color: INK,
  });
  footer(slide);
  slide.addNotes("The counter is in the tests, not on the party-items click-through sku. The website does not see the user’s budget. Instruction text in a counter is dropped. Cash 410 against a 400 per-order limit is refused.");
}

// 10 payer + later
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "PAYER");
  title(slide, "One cashier. Tenders are a list.");
  const now = [
    ["Built", "A blank tender list charges card. points stops."],
    ["Built", "Card declined before charge books wallet: once."],
    ["Built", "If card already charged, wallet is not started."],
    ["Built", "Two signed slips. Auto uses the same check."],
    ["Built", "Refund sets cashback to 0. The 168-hour total stays."],
  ];
  const later = [
    ["Not built", "No live card charge. Payment is the mock vault id."],
    ["Not built", "No DID registry and no blockchain."],
    ["Not built", "The parser is a function, not a hosted model."],
  ];
  slide.addText("In the code", {
    x: 0.5, y: 1.2, w: 6, h: 0.32, margin: 0, fontFace: "Cambria", fontSize: 16, color: INK,
  });
  slide.addText("Not in the code", {
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
  slide.addNotes("49 tests. Overspend count 0. Auto mode calls the same confirm. A unique winner shows the auditor line, then the payer line, then the booking. A tie asks. points books nothing. One flipped character in auto mode books nothing.");
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
  slide.addNotes("Printed line: Replay scenarios: 13; overspend count: 0. This run is 49 tests. Coverage was not remeasured. The floor in CONSTRAINTS.md is unchanged.");
}

// 12 build
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "BUILD");
  title(slide, "One slice. Then stop and read the tests.");
  const steps = [
    ["0", "Done", "Money, mandate, rank, mock card, 13 replays, overspend 0."],
    ["1", "Done in the tree", "Every trace row has a role. Commit this before Slice 2."],
    ["2", "In the tree", "One counter from the winning website. Auditor can veto the text."],
    ["3", "In the tree", "Card, then wallet if card never charged. Account refund leaves the week spent."],
    ["4", "In the tree", "Two signed slips. A bad signature books nothing."],
    ["5", "In the tree", "Auto pays a unique winner after the signature check. A tie asks."],
  ];
  steps.forEach((step, i) => {
    const y = 1.22 + i * 0.92;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y, w: 0.7, h: 0.78, fill: { color: i < 6 ? LIME : INK }, rectRadius: 0.08,
    });
    slide.addText(step[0], {
      x: 0.5, y, w: 0.7, h: 0.78, margin: 0,
      fontFace: "Cambria", fontSize: 20, color: i < 6 ? INK : LIME, align: "center", valign: "middle",
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 1.35, y, w: 2.3, h: 0.78, fill: { color: PAPER }, rectRadius: 0.08,
    });
    slide.addText(step[1], {
      x: 1.35, y, w: 2.3, h: 0.78, margin: 0,
      fontFace: "Calibri", fontSize: 14, bold: true, color: INK, align: "center", valign: "middle",
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 3.8, y, w: 9.0, h: 0.78, fill: { color: PAPER }, rectRadius: 0.08,
    });
    slide.addText(step[2], {
      x: 4.0, y, w: 8.6, h: 0.78, margin: 0,
      fontFace: "Calibri", fontSize: 15, color: INK, valign: "middle",
    });
  });
  footer(slide);
  slide.addNotes("The playbook is tasks/build-steps.md. Do not start Slice 3 in the same change as Slice 2. Do not add a second process or a hosted model. The harness line after every slice is overspend count 0.");
}

// 13 hands
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "HANDS");
  title(slide, "Who touches which file");
  const hands = [
    ["Slice 2", "lib/negotiate.ts and lib/attempt.ts", "A counter inside the mandate updates the quote. Cash 410 against per-order 400 is refused."],
    ["Slice 3", "lib/pay.ts, lib/ledger.ts, account page", "Card fails before charge, wallet books once. Refund does not refill 168 hours."],
    ["Slice 4", "lib/credential.ts and lib/db.ts", "Valid signatures pay once. One flipped bit leaves no ledger row."],
    ["Slice 5", "lib/attempt.ts auto path", "Unique winner plus both gates pays. A tie still asks. A bad signature does not book."],
  ];
  hands.forEach((item, i) => {
    const y = 1.3 + i * 1.35;
    card(slide, 0.5, y, 12.3, 1.22);
    slide.addText(item[0], { x: 0.85, y: y + 0.12, w: 2.2, h: 0.3, margin: 0, fontFace: "Calibri", fontSize: 13, bold: true, color: MUTED });
    slide.addText(item[1], { x: 3.1, y: y + 0.12, w: 9.3, h: 0.3, margin: 0, fontFace: "Calibri", fontSize: 13, color: MUTED });
    slide.addText(item[2], { x: 0.85, y: y + 0.5, w: 11.6, h: 0.5, margin: 0, fontFace: "Cambria", fontSize: 16, color: INK });
  });
  footer(slide);
  slide.addNotes("Teammates who are not in these files keep the demo script, the case scorecard, and the deck honest. Two people do not edit attempt.ts in the same slice. The proof command is npm test.");
}

// 14 demo
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
  slide.addNotes("The click-through is still manual confirm. Auto mode is in the tests: a unique winner books after the signature check, a tie asks, and a flipped signature books nothing. The counter is not on the demo sku. The closer is overspend count 0.");
}

const FLOW = {
  user: { bg: INK, fg: "F3F1EA", sub: "D9D6CC" },
  shopper: { bg: LIME, fg: INK, sub: "3D4A1E" },
  mandate: { bg: "E7D48A", fg: INK, sub: "5C4C18" },
  merchant: { bg: "D5E4C8", fg: INK, sub: "24402C" },
  auditor: { bg: "F0D0C2", fg: INK, sub: "6E3424" },
  payer: { bg: "2C2C2C", fg: "F3F1EA", sub: "D9D6CC" },
  ask: { bg: "F6E7A8", fg: INK, sub: "5C4C18" },
  stop: { bg: "8C3A22", fg: "FFFCF6", sub: "F6D5CB" },
  paid: { bg: LIME, fg: INK, sub: "3D4A1E" },
  back: { bg: PAPER, fg: INK, sub: MUTED },
};

function flowSlide(label, heading, talk, steps, note) {
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, label);
  slide.addText(heading, {
    x: 0.45, y: 0.64, w: 12.4, h: 0.38, margin: 0,
    fontFace: "Cambria", fontSize: 24, color: INK,
  });
  slide.addText(talk, {
    x: 0.45, y: 1.06, w: 12.4, h: 0.28, margin: 0,
    fontFace: "Calibri", fontSize: 13, color: MUTED,
  });
  const first = steps.slice(0, 4);
  const second = steps.slice(4);
  [first, second].forEach((row, r) => {
    if (!row.length) return;
    const count = row.length;
    const arrowW = 0.28;
    const marginX = 0.4;
    const natural = (13.333 - marginX * 2 - arrowW * (count - 1)) / count;
    const w = Math.min(3.05, natural);
    const h = 2.22;
    const y = r === 0 ? 1.48 : 4.18;
    const rowW = count * w + (count - 1) * arrowW;
    const x0 = count < 4 ? (13.333 - rowW) / 2 : marginX;
    row.forEach((step, i) => {
      const x = x0 + i * (w + arrowW);
      const tone = FLOW[step.role];
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w, h, fill: { color: tone.bg }, rectRadius: 0.1,
        line: step.role === "back" ? { color: INK, width: 1.25 } : undefined,
      });
      slide.addText(String(r * 4 + i + 1) + "  " + step.who, {
        x: x + 0.12, y: y + 0.1, w: w - 0.24, h: 0.28, margin: 0,
        fontFace: "Calibri", fontSize: 12, bold: true, color: tone.fg,
      });
      slide.addText(step.title, {
        x: x + 0.12, y: y + 0.42, w: w - 0.24, h: 0.58, margin: 0,
        fontFace: "Cambria", fontSize: 15, color: tone.fg,
      });
      slide.addText(step.body, {
        x: x + 0.12, y: y + 1.04, w: w - 0.24, h: 1.05, margin: 0,
        fontFace: "Calibri", fontSize: 12, color: tone.sub,
      });
      if (i < count - 1) {
        slide.addShape(pres.shapes.RIGHT_ARROW, {
          x: x + w + 0.03, y: y + h / 2 - 0.09, w: 0.22, h: 0.18, fill: { color: INK },
        });
      }
    });
  });
  if (second.length) {
    slide.addText("continues", {
      x: 0.45, y: 3.78, w: 1.4, h: 0.22, margin: 0,
      fontFace: "Calibri", fontSize: 12, italic: true, color: MUTED,
    });
  }
  footer(slide);
  slide.addNotes(note);
}

// 15 map
{
  const slide = pres.addSlide();
  light(slide);
  kicker(slide, "FLOWS");
  slide.addText("Every path the attempt can take", {
    x: 0.45, y: 0.64, w: 12.4, h: 0.4, margin: 0,
    fontFace: "Cambria", fontSize: 26, color: INK,
  });
  const map = [
    ["Paid", "Manual confirm books card"],
    ["Paid", "Auto pays a unique winner"],
    ["Paid", "Card declined, wallet books"],
    ["Paid", "Bad listing dropped, clean sku pays"],
    ["Paid", "Counter inside the mandate, then confirm"],
    ["Paid", "Timeout after charge, same key once"],
    ["Offers", "A click holds one of the three. Confirm pays."],
    ["Asks", "Blank qty, shares, mandate, weights"],
    ["Asks", "Tie, repeat sku, new cash 360"],
    ["Offers", "Decline a tie, a price, or a repeat"],
    ["Stop", "Injection, dead mandate, budget, clock"],
    ["Stop", "No offers, all talks rejected, bad counter"],
    ["Stop", "Bad signature, points, timeout before charge"],
    ["Stop", "Refund does not refill 168 hours"],
    ["Stop", "Quote expired, cancel, 120s silence"],
  ];
  map.forEach((item, i) => {
    const col = i < 8 ? 0 : 1;
    const row = i % 8;
    const x = 0.45 + col * 6.45;
    const y = 1.2 + row * 0.72;
    const tone = item[0] === "Paid" ? LIME : item[0] === "Asks" ? "F6E7A8" : item[0] === "Offers" ? PAPER : "8C3A22";
    const fg = item[0] === "Stop" ? "FFFCF6" : INK;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: 6.2, h: 0.64, fill: { color: tone }, rectRadius: 0.08,
      line: item[0] === "Offers" ? { color: INK, width: 1.25 } : undefined,
    });
    slide.addText(item[0], {
      x: x + 0.14, y, w: 1.15, h: 0.64, margin: 0,
      fontFace: "Calibri", fontSize: 13, bold: true, color: fg, valign: "middle",
    });
    slide.addText(item[1], {
      x: x + 1.3, y, w: 4.7, h: 0.64, margin: 0,
      fontFace: "Calibri", fontSize: 15, color: fg, valign: "middle",
    });
  });
  footer(slide);
  slide.addNotes("The charts after this slide are the code in lib/attempt.ts, lib/negotiate.ts, lib/pay.ts, and lib/ledger.ts. One attempt has one trace id. The user is the only person who confirms a mandate, breaks a tie, accepts a repeat sku, or accepts a new cash total.");
}

flowSlide("HAPPY", "Manual path, from the sentence to a held quote", "User talks to the shopper. The shopper asks the mandate, the auditor, then one website.", [
  { role: "user", who: "User", title: "Send the request", body: "Sentence, confirmed form, a whole quantity, and one share per goal." },
  { role: "shopper", who: "Shopper", title: "Parse the sentence", body: "One product is one goal. Party items become snacks and balloons. Quantities stay blank." },
  { role: "mandate", who: "Mandate", title: "Check the form", body: "Broken, revoked, or expired stops. A hint above per-order 400 asks. Limits are not raised." },
  { role: "shopper", who: "Shopper", title: "Shares, then weights", body: "Each share is positive and fits the request. Default weights 0.35, 0.25, 0.15, 0.10, 0.15." },
  { role: "auditor", who: "Auditor", title: "Drop bad rows", body: "Injection, agent price above human price, missing shipping, or an invalid row. A clean sibling stays." },
  { role: "mandate", who: "Mandate", title: "Drop rows over cash", body: "Line is shelf × qty, before the coupon. Cash is merchandise + shipping. Share and 168 hours see cash." },
  { role: "shopper", who: "Shopper", title: "Rank one seller", body: "At most 3 offers of one merchant_id. Scores within 1e-10 ask. Search clock is min(15s, the form)." },
  { role: "merchant", who: "Merchant", title: "Answer its own rows", body: "Only taobao, hktvmall, or pinduoduo. Accept reserves the coupon. The other websites stay silent." },
], "runAttempt through rank and the first negotiate. Money is priceLine. The merchant does not see the budget.");

flowSlide("HAPPY", "Confirm signs two slips, then the payer books", "The user talks to the shopper. The shopper asks the auditor, then the only payer.", [
  { role: "mandate", who: "Mandate", title: "Gate this quote", body: "Ready holds it for 120 seconds. An accept that fails the gate stops the whole attempt." },
  { role: "user", who: "User", title: "Confirm this version", body: "Manual mode waits for the click. A stale version asks and does not pay." },
  { role: "auditor", who: "Auditor", title: "Re-read the row", body: "Gone or unsafe stops. A changed shelf, coupon, shipping, or cash voids the old confirm and asks." },
  { role: "auditor", who: "Auditor", title: "Sign both slips", body: "Intent copies the form and did:mock plus the user id. Payment copies cash, tender, merchant, and the quote fingerprint." },
  { role: "payer", who: "Payer", title: "Charge the vault id", body: "Card uses the stored key. book() writes cash and cashback. The coupon becomes spent. Status is paid." },
], "advanceAttempt confirm calls pay(). The HMAC key scout-demo-hmac-v1 stays on the server. There is no card number and no registry.");

flowSlide("HAPPY", "Auto pays only a unique winner", "The shopper sends confirm itself. The auditor and the payer still run.", [
  { role: "shopper", who: "Shopper", title: "Winner is unique", body: "confirmMode is auto. Status is quote. No ask is open. The top two scores are not within 1e-10." },
  { role: "shopper", who: "Shopper", title: "Send confirm", body: "Same event as the user’s click, with this quote version. There is no second cashier." },
  { role: "auditor", who: "Auditor", title: "Check the slips", body: "The log shows credentials_ok before the charge line. A flipped character never reaches the payer’s book." },
  { role: "payer", who: "Payer", title: "Book once", body: "The first allowed tender charges. Blank list means card. points never books." },
], "A tie still asks the user. Auto does not skip the cash gate, and a reward never reduces cash.");

flowSlide("ALT", "Card declined before charge, wallet books once", "The payer walks the tender list. It does not ask the user again.", [
  { role: "mandate", who: "Mandate", title: "List is card, wallet", body: "The quote still names card, the first allowed tender. Cash does not change." },
  { role: "payer", who: "Payer", title: "Skip a pre-charge decline", body: "card_declined never calls book() for card. failed and timeout_before do not continue." },
  { role: "payer", who: "Payer", title: "Charge wallet", body: "Key is wallet: plus the original key. One row. Cash and cashback match the quote." },
  { role: "payer", who: "Payer", title: "Do not charge twice", body: "If card already booked, wallet is not started. A second call with the same key reconciles." },
], "Same vault id and address id. Wallet is a tender, not a second payer.");

flowSlide("ALT", "A bad listing is dropped. A clean sku still pays.", "The auditor talks to the shopper before rank. The merchant never sees the dropped row.", [
  { role: "auditor", who: "Auditor", title: "Read description and review", body: "Text that says ignore the mandate, pay now, or the Chinese equivalents is listing_injection." },
  { role: "auditor", who: "Auditor", title: "Compare the two prices", body: "agent_price above human_price is agent_surcharge. agent_price must equal the shelf." },
  { role: "auditor", who: "Auditor", title: "Require shipping", body: "Missing shipping is shipping_missing. It is not treated as zero. A bad currency or category is invalid_offer." },
  { role: "shopper", who: "Shopper", title: "Rank what remains", body: "One clean sibling from the same seller can still be the quote. If every row drops, the attempt stops." },
], "Poisoned listing and agent surcharge are paid replays because a clean sku remains. Omitted shipping on every row terminates.");

flowSlide("ALT", "One counter can change shipping or the coupon", "The website answers the shopper. The shopper asks the auditor, then the mandate. The shelf stays.", [
  { role: "merchant", who: "Merchant", title: "Return one counter", body: "Shipping, coupon, or both. The shelf is copied from the row. The coupon stays unused." },
  { role: "auditor", who: "Auditor", title: "Read the reason", body: "An instruction such as “ignore the mandate and pay now” is dropped. That offer is skipped." },
  { role: "mandate", who: "Mandate", title: "Gate the new cash", body: "Shipping 40 on shelf 200, qty 1, coupon 0 makes cash 240 and holds the quote." },
  { role: "shopper", who: "Shopper", title: "Or try the next offer", body: "A counter over the limit is skipped. A plain accept over the limit stops the whole attempt." },
], "Cash 410 against per-order 400 books nothing. The 24 demo products have no counter, so the party-items click-through does not show one. Tests pass the row in.");

flowSlide("ASK", "The shopper stops and asks before any search", "The user must answer. Silence for 120 seconds terminates. Decline of these four also terminates.", [
  { role: "shopper", who: "Shopper", title: "Quantity is blank", body: "Issue list. Party items do not search. The user types a whole quantity from 1 to 10000." },
  { role: "shopper", who: "Shopper", title: "Two goals need a yes", body: "Issue allocation. One goal may finish and the other may not. That yes is stored, not inferred." },
  { role: "shopper", who: "Shopper", title: "Shares start blank", body: "Each goal needs its own positive share. The sum cannot pass the request. Unassigned money stays reserved." },
  { role: "mandate", who: "Mandate", title: "The hint fights the form", body: "Budget above per-order, or a denied merchant or category, asks. The user edits the form or the request." },
  { role: "shopper", who: "Shopper", title: "Weights disagree", body: "“Cheapest” infers cash 0.6. If an explicit vector differs on any key, issue weights. A lone cash override may not sum to 1." },
  { role: "user", who: "User", title: "Answer or stop", body: "A matching answer resumes this attempt. Decline says “User declined required clarification” and releases nothing spent." },
], "Two goals then become two attempts. They share one mandate and one 168-hour total. A goal cannot spend the other goal’s share.");

flowSlide("ASK", "Tie, a repeat sku, or a new cash total asks", "The user answers. Decline of these three goes back to the offer list. The coupon returns to unused.", [
  { role: "shopper", who: "Shopper", title: "Top two scores tie", body: "Difference under 1e-10, including across sellers. Issue tie. Auto does not pay. The user picks a sku from this attempt." },
  { role: "shopper", who: "Shopper", title: "Same sku inside 72 hours", body: "Issue repeat. accept_repeat puts the quote back. The user still has to confirm. Decline releases the coupon." },
  { role: "merchant", who: "Merchant", title: "price-demo moves", body: "Only cash 360 or 410, and only sku price-demo. Shipping changes by the delta. Quote version increases by 1." },
  { role: "user", who: "User", title: "360 can be accepted", body: "Confirm the new version. 410 asks, and confirming it fails the per-order 400 gate. Nothing is booked." },
  { role: "auditor", who: "Auditor", title: "Catalogue moved", body: "At confirm, a changed fingerprint asks. The reason is “Final catalogue terms changed.” A missing row stops." },
  { role: "shopper", who: "Shopper", title: "Stale click", body: "Confirm with the old version asks “Stale confirmation.” Pay does not run." },
], "Opening cash on price-demo is 340. Rollback of the price ask returns status to offers. That is the price_rollback replay.");

flowSlide("ALT", "A click holds one of the three. It does not pay.", "The user talks to the shopper. The shopper asks that website again, then the auditor and the mandate.", [
  { role: "shopper", who: "Shopper", title: "Show at most three", body: "All three share one merchant_id. The first one that passed negotiate is already held." },
  { role: "user", who: "User", title: "Click a sku in this list", body: "select is legal on the offer list, and on a tie, a price ask, or a repeat ask." },
  { role: "merchant", who: "Merchant", title: "Answer that row again", body: "Accept, reject, or one counter. A reject returns to the list. The coupon stays unused." },
  { role: "stop", who: "End", title: "A foreign sku stops", body: "Reason: “Offer is not part of this attempt.” Pay does not run until a later confirm." },
], "Selecting never books. The paid step is still the confirm chart.");

flowSlide("ALT", "Decline of a tie, a price, or a repeat returns to the list", "The user talks to the shopper. The coupon goes back to unused. The payer is not called.", [
  { role: "user", who: "User", title: "Decline the ask", body: "Legal when the issue is tie, price, or repeat, and also when a quote is already held." },
  { role: "shopper", who: "Shopper", title: "Release the coupon", body: "Status returns to offers. The quote and the selected sku are cleared." },
  { role: "shopper", who: "Shopper", title: "The three offers remain", body: "The user can click another sku. That click runs negotiate again. It still does not pay." },
  { role: "stop", who: "End", title: "A required ask is different", body: "Decline of list, shares, the mandate conflict, or weights terminates. It does not return to offers." },
], "price_rollback ends at offers. Decline of a blank quantity or a share ask ends the attempt.");

flowSlide("STOP", "Stops before a website is asked", "The shopper or the mandate ends the attempt. Coupon stays unused. The payer is not called.", [
  { role: "shopper", who: "Shopper", title: "Instruction in the sentence", body: "“Ignore the mandate” or “pay now” in the user’s text terminates. This is not the poisoned-listing path." },
  { role: "mandate", who: "Mandate", title: "Form is dead", body: "Wrong types, a non-positive limit, revoked, or expiresAt in the past. Reason: “Mandate revoked or expired.”" },
  { role: "shopper", who: "Shopper", title: "Request over 168 hours", body: "The request budget is above the remaining rolling total. That terminates. A share above the request only asks." },
  { role: "shopper", who: "Shopper", title: "Weight is unusable", body: "A non-finite or negative weight terminates. The search does not start." },
  { role: "shopper", who: "Shopper", title: "Search clock fires", body: "min(15 seconds, maxSearchSeconds) from the start. Reason: “Search timeout before charge.” No book." },
  { role: "shopper", who: "Shopper", title: "Nothing left to rank", body: "No clean matching offer, or every row failed the cash gate. Reason: “No clean matching offers.”" },
  { role: "user", who: "User", title: "Cancel, or 120 seconds", body: "Cancel terminates. A late tick after an ask terminates with “Clarification timeout.”" },
  { role: "stop", who: "End", title: "No ledger row", body: "spent7d is unchanged. The user starts a new attempt. There is no retry that skips the form." },
], "Replays: user_injection, expired_mandate, insufficient_budget, clarify_timeout.");

flowSlide("STOP", "The website says no, or the counter is refused", "The merchant talks to the shopper. A reject skips to the next of the three. None left stops.", [
  { role: "merchant", who: "Merchant", title: "out_of_stock", body: "Unknown platform, a platform that does not match the held row, or stock false. Coupon unused." },
  { role: "merchant", who: "Merchant", title: "coupon_gone", body: "The coupon flag is already gone. The shopper does not reserve it." },
  { role: "merchant", who: "Merchant", title: "price_mismatch", body: "Shelf, coupon, shipping, or currency moved, or the counter has no usable number." },
  { role: "auditor", who: "Auditor", title: "Counter is an instruction", body: "listing_injection on the counter reason. That offer is skipped. The coupon stays unused." },
  { role: "mandate", who: "Mandate", title: "Counter cash is 410", body: "Against per-order 400 the counter is skipped. If no later offer fits, the attempt stops and nothing is booked." },
  { role: "stop", who: "End", title: "All three rejected", body: "Reason: “All catalogue negotiations rejected.” This is the failed_negotiation replay." },
], "A counter that fails the gate is skipped. A normal accept that fails the gate stops immediately and does not try the next offer.");

flowSlide("STOP", "A bad signature never reaches book()", "The auditor talks to the shopper. The payer is not started.", [
  { role: "shopper", who: "Shopper", title: "Build the two slips", body: "At confirm, including auto confirm. Intent from the form. Payment from this quote." },
  { role: "auditor", who: "Auditor", title: "Compare the signatures", body: "HMAC-SHA256. One changed character fails. The log row is credentials_bad, role auditor." },
  { role: "auditor", who: "Auditor", title: "Compare the bodies", body: "Intent must match this mandate. Payment must match this cash, tender, merchant, and quote fingerprint." },
  { role: "stop", who: "End", title: "Terminate, no row", body: "Reason: “Signature does not match” or “Payment slip does not match the quote.” spent7d stays 0." },
], "A swapped merchant or cash plus one fails even when that slip’s own signature is valid. Manual and auto use this same check.");

flowSlide("STOP", "The payer refuses before any charge", "The auditor already passed. The payer talks only to the ledger, and it writes nothing.", [
  { role: "payer", who: "Payer", title: "points is not a tender", body: "Only card and wallet are allowed. An empty list means card. Neither card nor wallet stops." },
  { role: "payer", who: "Payer", title: "Extra fields or a bad ref", body: "A card number, a vault id that does not start with vault_, or a non-HKD amount terminates." },
  { role: "payer", who: "Payer", title: "failed or timeout_before", body: "Reason: “Failed before any charge; no spend booked.” Wallet is not tried." },
  { role: "payer", who: "Payer", title: "Key already means something else", body: "Same key with a different user, amount, request, goal, or sku list terminates. “Idempotency key mismatch.”" },
  { role: "mandate", who: "Mandate", title: "Revoked inside book()", body: "The guard re-checks the form, the quote, the share, and the 168-hour remainder. A throw writes no row." },
  { role: "stop", who: "End", title: "Quote already expired", body: "120 seconds on the quote, separate from the 120-second ask. Reason: “Quote expired” or “Tender or authorization is invalid or expired.”" },
], "timeout_before_pay is a terminate replay. Card declined with no later tender stops with “Card was declined before charge and no later tender booked.”");

flowSlide("EDGE", "A timeout after the charge retries the same key", "The payer talks to the ledger. It does not ask the merchant, and it does not start wallet.", [
  { role: "payer", who: "Payer", title: "book() already ran", body: "timeout_after returns an ask: “Response timed out after pay attempt; retry the same key.”" },
  { role: "payer", who: "Payer", title: "The key is frozen", body: "Card’s key stays the original key. Wallet is not started, even if wallet is next on the list." },
  { role: "shopper", who: "Shopper", title: "Retry is the same pay", body: "Issue pay. A tick 120 seconds later terminates and leaves the coupon unused only if no row exists." },
  { role: "payer", who: "Payer", title: "The second call reconciles", body: "The existing row matches user, cash, request, goal, and skus. Status becomes paid. No second cash row." },
], "timeout_after_pay is a paid replay. Cash is booked once.");

flowSlide("EDGE", "A refund does not give the week back", "The user talks to the account page. The ledger talks to the next attempt’s mandate.", [
  { role: "user", who: "User", title: "Refund this receipt", body: "The button sends that receipt’s key. Another user’s key is ignored." },
  { role: "payer", who: "Payer", title: "Mark it refunded", body: "refunded_at is set. cashback_cents becomes 0. The order row stays." },
  { role: "mandate", who: "Mandate", title: "168 hours ignore the refund", body: "spent7d sums cash_cents and does not look at refunded_at. The figure on the account page does not fall." },
  { role: "stop", who: "End", title: "The next buy can still stop", body: "A later attempt that needed that cash terminates. This is the refund_no_restore replay." },
], "The account page says the receipt is refunded and that the 168-hour figure did not change.");

pres.writeFile({ fileName: "tasks/artifacts/scout-hackathon.pptx" })
  .then(() => console.log("wrote tasks/artifacts/scout-hackathon.pptx"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
