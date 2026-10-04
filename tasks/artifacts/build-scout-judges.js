async function main() {
const { createRequire } = await import("node:module");
const PptxGenJS = createRequire(__filename)("/tmp/pptx-deps/node_modules/pptxgenjs");

const pres = new PptxGenJS();
pres.defineLayout({ name: "WIDE", width: 13.3, height: 7.5 });
pres.layout = "WIDE";
pres.title = "Scout — how a purchase is allowed";
pres.author = "Scout";
pres.subject = "Hackathon walkthrough of roles, gates, flows, and metrics";

const INK = "0F1C2E";
const INK2 = "1A3048";
const PAPER = "FFFFFF";
const MIST = "EEF2F5";
const SLATE = "4E6070";
const TEXT = "14202C";
const GOLD = "A67C2D";
const PASS = "1E6B45";
const STOP = "A33B45";
const ASK = "9A5B12";
const LINE = "D5DEE6";
const MUTED = "6A7A88";

let page = 0;

function shadow() {
  return { type: "outer", color: "0F1C2E", blur: 12, opacity: 0.1, offset: 3, angle: 90 };
}

function footer(slide, dark) {
  const color = dark ? "8EA0B3" : MUTED;
  slide.addText("Scout", {
    x: 0.55, y: 7.1, w: 3, h: 0.22,
    fontFace: "Calibri", fontSize: 12, color, margin: 0,
  });
  slide.addText(String(page), {
    x: 11.4, y: 7.1, w: 1.35, h: 0.22,
    fontFace: "Calibri", fontSize: 12, color, align: "right", margin: 0,
  });
}

function open(dark) {
  page += 1;
  const slide = pres.addSlide();
  slide.background = { color: dark ? INK : PAPER };
  return slide;
}

function kicker(slide, text, color) {
  slide.addText(text, {
    x: 0.55, y: 0.28, w: 12.2, h: 0.26,
    fontFace: "Calibri", fontSize: 13, bold: true, color: color || GOLD,
    margin: 0, charSpacing: 1.1,
  });
}

function heading(slide, text, y) {
  slide.addText(text, {
    x: 0.55, y: y == null ? 0.54 : y, w: 12.2, h: 0.48,
    fontFace: "Cambria", fontSize: 32, bold: true, color: TEXT, margin: 0,
  });
}

function card(slide, x, y, w, h, fill) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: fill || PAPER },
    rectRadius: 0.08,
    shadow: shadow(),
  });
}

function words(slide, text, x, y, w, h, opts) {
  slide.addText(text, {
    x, y, w, h, margin: 0,
    fontFace: opts.face || "Calibri",
    fontSize: opts.size || 14,
    bold: !!opts.bold,
    color: opts.color || TEXT,
    align: opts.align || "left",
    valign: opts.valign || "top",
  });
}

function node(slide, x, y, w, h, title, sub, fill, titleColor, subColor) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    rectRadius: 0.08,
  });
  words(slide, title, x + 0.08, y + 0.1, w - 0.16, sub ? 0.42 : h - 0.2, {
    size: 13, bold: true, color: titleColor, align: "center",
  });
  if (sub) {
    words(slide, sub, x + 0.08, y + 0.5, w - 0.16, h - 0.6, {
      size: 11, color: subColor || SLATE, align: "center",
    });
  }
}

function arrow(slide, x, y) {
  slide.addShape(pres.shapes.RIGHT_ARROW, {
    x, y, w: 0.2, h: 0.12,
    fill: { color: "8AA0B2" },
  });
}

function chip(slide, x, y, w, text, fill) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h: 0.34,
    fill: { color: fill },
    rectRadius: 0.06,
  });
  words(slide, text, x + 0.06, y + 0.05, w - 0.12, 0.24, {
    size: 11, bold: true, color: PAPER, align: "center",
  });
}

// ---------------------------------------------------------------------------
// 1 Title
{
  const s = open(true);
  words(s, "HACKATHON", 0.7, 1.35, 6, 0.28, { size: 13, bold: true, color: GOLD });
  words(s, "Scout", 0.7, 1.7, 8, 0.9, { face: "Cambria", size: 72, bold: true, color: PAPER });
  words(s, "A purchase is a series of asks.\nOnly one role is allowed to book the money.", 0.7, 2.8, 8.2, 1.1, {
    face: "Cambria", size: 24, color: "E6EDF4",
  });
  card(s, 8.7, 1.7, 3.9, 3.7, INK2);
  const facts = [
    ["5", "roles, one cashier"],
    ["3", "gates before money moves"],
    ["HKD", "every quote, every booking"],
  ];
  facts.forEach((row, i) => {
    const y = 1.95 + i * 1.1;
    words(s, row[0], 8.95, y, 3.4, 0.42, { face: "Cambria", size: 26, bold: true, color: "F3D48A" });
    words(s, row[1], 8.95, y + 0.4, 3.4, 0.3, { size: 14, color: "D5E0EA" });
  });
  words(s, "Roles, then the three gates, then a few full purchases, then every number and why it is that number.", 0.7, 5.7, 11.8, 0.6, {
    size: 16, color: "C5D2DF",
  });
  s.addNotes("Open on the promise: the shopper asks, the other roles answer, and only the payer books. Tell the room the deck follows the use cases, with the decision notes as the reason each choice exists.");
  footer(s, true);
}

// ---------------------------------------------------------------------------
// 2 Glance
{
  const s = open(false);
  kicker(s, "THE SHOP");
  heading(s, "One sentence in. One booking out.");
  words(s, "The person names a goal and has already signed a spending form. Scout ranks only the rows that survive the auditor and the form, asks one website, and charges the tender and the cash already stored on the quote.", 0.55, 1.2, 7.3, 1.35, { size: 16, color: TEXT });

  const beats = [
    ["Shopper", "Chooses the row and the card."],
    ["Mandate", "Allows or stops. A sentence cannot raise it."],
    ["Merchant", "Accepts, rejects, or counters once."],
    ["Auditor", "Drops a bad listing. Checks both slips."],
    ["Payer", "Books that quote once, or refuses."],
  ];
  beats.forEach((b, i) => {
    const y = 2.7 + i * 0.78;
    card(s, 0.55, y, 7.3, 0.68, i === 4 ? INK : MIST);
    words(s, b[0], 0.75, y + 0.16, 1.7, 0.36, { size: 15, bold: true, color: i === 4 ? "F3D48A" : INK });
    words(s, b[1], 2.5, y + 0.16, 5.1, 0.36, { size: 15, color: i === 4 ? PAPER : TEXT });
  });

  card(s, 8.15, 1.2, 4.55, 5.45, INK);
  words(s, "The worked purchase", 8.4, 1.45, 4.1, 0.3, { size: 13, bold: true, color: GOLD });
  words(s, "60", 8.4, 1.85, 4.1, 0.85, { face: "Cambria", size: 60, bold: true, color: PAPER });
  words(s, "Red balloons. Shelf 50 plus shipping 10. One card charge. The week rises by 60, not by the score.", 8.4, 2.85, 4.05, 1.15, { size: 15, color: "E6EDF4" });
  words(s, "Default caps on the form", 8.4, 4.15, 4.1, 0.3, { size: 13, bold: true, color: GOLD });
  words(s, "250 per item, before any coupon\n400 per order, after the card discount\n1,000 in the past 168 hours", 8.4, 4.5, 4.1, 1.2, { size: 15, color: PAPER });
  s.addNotes("The 60 is the demo balloon, not the big worked example. The big example, 350 cash and 300 score cost, comes later with the formulas. Caps are the unset form.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 3 Section — roles
{
  const s = open(true);
  words(s, "01", 0.7, 2.15, 4, 0.7, { face: "Cambria", size: 54, color: GOLD });
  words(s, "Five roles", 0.7, 2.95, 10, 0.7, { face: "Cambria", size: 44, bold: true, color: PAPER });
  words(s, "Only the shopper ranks. The other four allow, refuse, or charge what the shopper already held.", 0.7, 3.8, 10, 0.8, { size: 20, color: "D5E0EA" });
  s.addNotes("This sentence is the decision note in one line. Spend time here. Judges should leave knowing the shopper is the only chooser.");
  footer(s, true);
}

// ---------------------------------------------------------------------------
// 4 Cast
{
  const s = open(false);
  kicker(s, "WHO ACTS");
  heading(s, "Five jobs. No shared cashier.");
  card(s, 0.5, 1.3, 4.35, 5.45, INK);
  words(s, "Shopper", 0.75, 1.55, 3.9, 0.45, { face: "Cambria", size: 28, bold: true, color: PAPER });
  words(s, "The buyer. The only role that ranks.", 0.75, 2.1, 3.85, 0.55, { size: 15, color: "E6EDF4" });
  const chooses = [
    ["Weights", "The form’s five shares, unless this attempt set its own."],
    ["Product", "Highest score. A tie closer than 0.0000000001 asks the person."],
    ["Card", "Each allowed tender is priced alone. Lowest cash is stored."],
  ];
  chooses.forEach((c, i) => {
    const y = 2.85 + i * 1.15;
    words(s, c[0], 0.75, y, 3.85, 0.3, { size: 14, bold: true, color: "F3D48A" });
    words(s, c[1], 0.75, y + 0.32, 3.85, 0.65, { size: 14, color: PAPER });
  });

  const others = [
    ["Mandate", "The signed form", "Compares the line with 250 and the cash with 400, the share, and the week. A confirm cannot raise a limit."],
    ["Merchant", "One website", "Taobao, HKTV Mall, or Pinduoduo. Accepts the shelf, rejects it, or sends one counter on shipping or the coupon."],
    ["Auditor", "Listings and slips", "Drops a poisoned row, a higher agent price, or missing shipping. Later, both signatures must match."],
    ["Payer", "The only cashier", "Charges the tender and the cash on the quote, using the vault id created with the account."],
  ];
  others.forEach((o, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 5.05 + col * 4.0;
    const y = 1.3 + row * 2.8;
    card(s, x, y, 3.85, 2.6, MIST);
    words(s, o[0], x + 0.22, y + 0.2, 3.4, 0.36, { face: "Cambria", size: 22, bold: true, color: INK });
    words(s, o[1], x + 0.22, y + 0.62, 3.4, 0.3, { size: 13, bold: true, color: GOLD });
    words(s, o[2], x + 0.22, y + 1.05, 3.4, 1.3, { size: 14, color: TEXT });
  });
  s.addNotes("Shopper examples are from the decision notes: weights, product, card. Mandate’s 250 and 400 are the default form. The payer does not pick the card.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 5 Who may choose
{
  const s = open(false);
  kicker(s, "THE ORDER OF A CHOICE");
  heading(s, "The person writes. The shopper asks.");
  const steps = [
    ["1", "Person", "A sentence and a signed form."],
    ["2", "Shopper", "Resolve the five shares."],
    ["3", "Auditor", "Drop unsafe rows."],
    ["4", "Mandate", "Drop rows over the limits."],
    ["5", "Shopper", "Score what remains."],
    ["6", "Shopper", "One seller. Best three. Lowest cash."],
    ["7", "Merchant", "Accept, reject, or one counter."],
    ["8", "Auditor, then payer", "Slips match. Then one charge."],
  ];
  steps.forEach((st, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.5 + col * 3.2;
    const y = 1.35 + row * 2.15;
    card(s, x, y, 3.02, 1.95, row === 0 && col === 0 ? INK : PAPER);
    words(s, st[0], x + 0.18, y + 0.16, 0.5, 0.4, {
      face: "Cambria", size: 22, bold: true, color: row === 0 && col === 0 ? "F3D48A" : GOLD,
    });
    words(s, st[1], x + 0.7, y + 0.22, 2.1, 0.36, {
      size: 14, bold: true, color: row === 0 && col === 0 ? PAPER : INK,
    });
    words(s, st[2], x + 0.18, y + 0.8, 2.66, 0.9, {
      size: 15, color: row === 0 && col === 0 ? "E6EDF4" : TEXT,
    });
  });
  s.addNotes("This is the decision diagram, read left to right, then the second row. Brand, colour, and category are gates before any score. A row that fails one of them never receives a score.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 6 Role examples from decisions
{
  const s = open(false);
  kicker(s, "A MOMENT EACH");
  heading(s, "What each role does with a real case");
  const cases = [
    [GOLD, "Shopper, weights", "The form is balanced. The sentence says cheapest.", "Ask the person. Keep 0.35, 0.25, 0.15, 0.10, 0.15. A phrase does not replace the signed objective."],
    [PASS, "Shopper, product", "Two scores differ by less than 0.0000000001.", "Ask. Do not negotiate. A real one-cent gap is still larger than that, and still ranks."],
    [INK, "Shopper, card", "Merchandise 280, shipping 20. Three tenders.", "HSBC 260, Citi 290, wallet 300. The quote stores hsbc-visa and 260. Equal cash keeps the earlier name on the form."],
    [STOP, "Mandate", "A row’s cash is 410. The order cap is 400.", "Drop it, with the gate’s reason. The website does not know the person’s limits."],
    [ASK, "Auditor", "One character in the payment slip is flipped.", "credentials_bad. The payer is not asked. Nothing is booked."],
    [INK2, "Payer", "The quote holds citi-mastercard and cash 290.", "Book 290 on citi-mastercard:key. The same key and the same cash reconcile. A different cash stops."],
  ];
  cases.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.45 + col * 4.25;
    const y = 1.28 + row * 2.8;
    card(s, x, y, 4.05, 2.6, PAPER);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.18, y: y + 0.2, w: 0.18, h: 0.18,
      fill: { color: c[0] }, rectRadius: 0.04,
    });
    words(s, c[1], x + 0.48, y + 0.14, 3.35, 0.32, { size: 14, bold: true, color: INK });
    words(s, c[2], x + 0.2, y + 0.58, 3.65, 0.7, { size: 14, color: TEXT });
    words(s, c[3], x + 0.2, y + 1.35, 3.65, 1.05, { size: 13, color: SLATE });
  });
  s.addNotes("These six are the decision file’s examples, not new stories. The card numbers return as a full scene later. The one-cent proof is 0.25 times 0.01 over 1,000, which is 0.0000025, above the tie line.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 7 Section gates
{
  const s = open(true);
  words(s, "02", 0.7, 1.9, 4, 0.7, { face: "Cambria", size: 54, color: GOLD });
  words(s, "Three gates", 0.7, 2.7, 11, 0.7, { face: "Cambria", size: 44, bold: true, color: PAPER });
  words(s, "A pass continues. A fail takes the labeled exit.\nThe shopper asks. The other role answers. The shopper does not skip a failed gate.", 0.7, 3.6, 11, 1.1, { size: 20, color: "D5E0EA" });
  const names = ["May we shop?", "What does the website answer?", "May we pay?"];
  names.forEach((name, i) => {
    card(s, 0.7 + i * 4.1, 5.15, 3.85, 1.15, INK2);
    words(s, String(i + 1), 0.9 + i * 4.1, 5.32, 0.4, 0.4, { face: "Cambria", size: 20, bold: true, color: GOLD });
    words(s, name, 1.4 + i * 4.1, 5.38, 2.9, 0.7, { size: 16, color: PAPER });
  });
  s.addNotes("Promise the room that each gate is drawn, then read exit by exit. Do not rush the pay gate: the decline paths are where overspend would hide.");
  footer(s, true);
}

// ---------------------------------------------------------------------------
// 8 May we shop — diagram
{
  const s = open(false);
  kicker(s, "GATE 1");
  heading(s, "May we shop?");
  words(s, "Search has not started. Every exit on this row happens before a website is called.", 0.55, 1.12, 12, 0.3, { size: 14, color: SLATE });

  const row = [
    ["Person names a goal", "Snacks or balloons. Quantity can stay blank.", MIST, TEXT, SLATE],
    ["Sentence overrides the form?", "Ignore the mandate, raise a limit, switch mode.", "F8E8EA", STOP, TEXT],
    ["Form still valid?", "The shopper asks the mandate.", MIST, TEXT, SLATE],
    ["Hint above 400?", "A budget hint is not a new cap.", "FBF3E4", ASK, TEXT],
    ["Share and the week?", "This goal’s own money, and the 168 hours left.", MIST, TEXT, SLATE],
  ];
  const w = 2.2;
  const gap = 0.28;
  const x0 = (13.3 - (5 * w + 4 * gap)) / 2;
  row.forEach((r, i) => {
    const x = x0 + i * (w + gap);
    node(s, x, 1.55, w, 1.28, r[0], r[1], r[2], r[3], r[4]);
    if (i < 4) arrow(s, x + w + 0.04, 2.1);
  });
  chip(s, x0 + (w + gap) + 0.15, 2.95, 1.9, "Stop. No search", STOP);
  chip(s, x0 + 2 * (w + gap) + 0.15, 2.95, 1.9, "Stop. No search", STOP);
  chip(s, x0 + 3 * (w + gap) + 0.1, 2.95, 2.0, "Ask them to edit", ASK);
  chip(s, x0 + 4 * (w + gap) + 0.15, 2.95, 1.9, "Stop. No search", STOP);

  const mid = [
    ["Auditor drops unsafe rows", "Poison, a higher agent price, or missing shipping."],
    ["Mandate drops over-limit rows", "Line over 250, or cash over 400, the share, or the week."],
    ["Shopper scores the rest", "Higher score first. One seller keeps its best three."],
  ];
  mid.forEach((m, i) => {
    const x = 0.55 + i * 4.2;
    node(s, x, 3.5, 3.7, 1.15, m[0], m[1], i === 2 ? INK : MIST, i === 2 ? PAPER : TEXT, i === 2 ? "D5E0EA" : SLATE);
    if (i < 2) arrow(s, x + 3.75, 3.98);
  });

  const ends = [
    [STOP, "None left", "Stop. Nothing is negotiated."],
    [ASK, "Top two scores tie", "Ask the person. Do not negotiate."],
    [PASS, "One seller wins", "Ask that seller’s website only."],
  ];
  ends.forEach((e, i) => {
    const x = 0.55 + i * 4.2;
    card(s, x, 4.9, 3.95, 1.85, PAPER);
    words(s, e[1], x + 0.2, 5.08, 3.55, 0.35, { size: 16, bold: true, color: e[0] });
    words(s, e[2], x + 0.2, 5.5, 3.55, 0.9, { size: 15, color: TEXT });
  });
  s.addNotes("Walk the top row first: four ways to never search. Then the filter row. Then the three score exits. The tie line is one ten-billionth. A tie includes two sellers.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 9 Shop detail
{
  const s = open(false);
  kicker(s, "GATE 1, READ CLOSE");
  heading(s, "What each exit is protecting");
  const cols = [
    [STOP, "Unsafe row", "The auditor drops it and continues if a sibling is clean.", ["The text says to ignore the mandate.", "The agent price is higher than the human price.", "Shipping is missing. It is not treated as zero.", "A pool emptied only by missing shipping stops the attempt."]],
    [INK, "The money gates", "The mandate applies these before a score exists.", ["Per item looks at the pre-coupon line. Default 250.", "Per order, the share, and the week look at cash, after any card discount.", "Points is not a tender, so that row fails here.", "An empty merchant allow list means every seller except the deny list."]],
    [ASK, "The score exits", "Ranking starts only after both filters.", ["A tie is a gap under 0.0000000001, across sellers too.", "The person picks, or 120 seconds ends the attempt.", "Otherwise the winning seller, not the website, keeps its best three.", "Other sellers are not mixed into that order."]],
  ];
  cols.forEach((c, i) => {
    const x = 0.45 + i * 4.25;
    card(s, x, 1.28, 4.05, 5.45, PAPER);
    words(s, c[1], x + 0.22, 1.48, 3.6, 0.4, { face: "Cambria", size: 22, bold: true, color: c[0] });
    words(s, c[2], x + 0.22, 2.0, 3.6, 0.7, { size: 14, color: SLATE });
    c[3].forEach((line, j) => {
      const y = 2.8 + j * 0.9;
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.25, y: y + 0.06, w: 0.16, h: 0.16, fill: { color: c[0] },
      });
      words(s, line, x + 0.55, y, 3.25, 0.8, { size: 14, color: TEXT });
    });
  });
  s.addNotes("Seller is merchant_id. Website is platform_id. One order keeps one seller. Top three means that seller’s three best rows, not three websites.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 10 Website diagram
{
  const s = open(false);
  kicker(s, "GATE 2");
  heading(s, "What does the website answer?");
  words(s, "One catalogue request. The shelf stays the shelf. Shipping or the coupon may change once.", 0.55, 1.12, 12.2, 0.28, { size: 14, color: SLATE });

  const lanes = [
    {
      y: 1.55,
      tone: "F8E8EA",
      title: "Rejected, or out of stock",
      steps: ["Only this seller is asked", "Another of its top three?"],
      exits: [["Yes", "Ask the next row", PASS], ["No", "Stop. Coupon unused", STOP]],
    },
    {
      y: 3.35,
      tone: "FBF3E4",
      title: "One counter",
      steps: ["Auditor reads the reason", "Mandate checks the cash"],
      exits: [["Instruction", "Skip the row", STOP], ["Cash fits", "Quote held", PASS], ["Cash fails", "Try the next row", ASK]],
    },
    {
      y: 5.15,
      tone: "E5F2EA",
      title: "Accepted",
      steps: ["Shelf, coupon, shipping as quoted", "Mandate checks that cash"],
      exits: [["Cash fits", "Quote held. Coupon reserved", PASS], ["Cash fails", "The whole attempt stops", STOP]],
    },
  ];
  lanes.forEach((lane) => {
    node(s, 0.45, lane.y, 2.35, 1.55, lane.title, "", lane.tone, TEXT);
    lane.steps.forEach((step, i) => {
      const x = 3.05 + i * 2.35;
      node(s, x, lane.y + 0.15, 2.15, 1.25, step, "", MIST, TEXT);
      if (i === 0) arrow(s, 2.85, lane.y + 0.7);
      if (i === 0) arrow(s, x + 2.2, lane.y + 0.7);
    });
    lane.exits.forEach((ex, i) => {
      const x = 7.7 + i * 1.78;
      card(s, x, lane.y + 0.12, 1.68, 1.3, PAPER);
      words(s, ex[0], x + 0.08, lane.y + 0.22, 1.5, 0.4, { size: 12, bold: true, color: ex[2], align: "center" });
      words(s, ex[1], x + 0.08, lane.y + 0.62, 1.5, 0.65, { size: 11, color: TEXT, align: "center" });
    });
  });
  s.addNotes("The difference judges should hear: a counter that fails the cash gate tries the next row. An accept that fails the cash gate ends the attempt. The coupon stays unused until the new cash passes.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 11 Website detail
{
  const s = open(false);
  kicker(s, "GATE 2, READ CLOSE");
  heading(s, "Three replies, three different stops");

  const blocks = [
    ["240", "A counter that still fits", "Shelf 200, quantity 1, coupon 0. The website changes shipping from 30 to 40. The reason is “Shipping quote revised.” The auditor says that is not an instruction. Cash 240 is inside 400. The quote is held. The person has not paid."],
    ["410", "A counter that does not fit", "Shipping 210 makes cash 410. The mandate refuses it. That coupon stays unused. The shopper asks the next row of the same seller. That row accepts at 280. A new quote is held. Still not paid."],
    ["Stop", "A counter that gives orders", "The reason says to ignore the mandate and pay now. The auditor vetoes it. The row is skipped. If no later row fits, the attempt stops and nothing is booked."],
  ];
  blocks.forEach((b, i) => {
    const x = 0.45 + i * 4.25;
    card(s, x, 1.28, 4.05, 5.45, i === 2 ? INK : PAPER);
    words(s, b[0], x + 0.25, 1.5, 3.55, 0.7, { face: "Cambria", size: 36, bold: true, color: i === 2 ? "F3D48A" : i === 1 ? STOP : PASS });
    words(s, b[1], x + 0.25, 2.3, 3.55, 0.7, { face: "Cambria", size: 20, bold: true, color: i === 2 ? PAPER : INK });
    words(s, b[2], x + 0.25, 3.2, 3.55, 3.1, { size: 15, color: i === 2 ? "E6EDF4" : TEXT });
  });
  s.addNotes("Flow 13, 14, and 15. Say the punchline out loud: a bad counter is a skip, a bad accept is a stop, an instruction is a veto.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 12 May we pay diagram
{
  const s = open(false);
  kicker(s, "GATE 3");
  heading(s, "May we pay?");
  words(s, "The quote is held and the coupon is reserved. Nothing is booked until this row finishes.", 0.55, 1.1, 12, 0.28, { size: 14, color: SLATE });

  const rail = [
    ["Quote held", MIST, TEXT],
    ["Person confirms, or auto and one clear winner", INK, PAPER],
    ["Form still valid, quote under 120 seconds", MIST, TEXT],
    ["Same sku in 72 hours?", "FBF3E4", ASK],
    ["Both slips match?", MIST, TEXT],
    ["Shopper asks the payer", PASS, PAPER],
  ];
  const rw = 1.9;
  const rg = 0.18;
  const rx = (13.3 - (6 * rw + 5 * rg)) / 2;
  rail.forEach((r, i) => {
    const x = rx + i * (rw + rg);
    node(s, x, 1.52, rw, 1.15, r[0], "", r[1], r[2], r[2] === PAPER ? "D5E0EA" : SLATE);
    if (i < 5) arrow(s, x + rw + 0.0, 2.02);
  });
  chip(s, rx + 2 * (rw + rg) + 0.05, 2.78, 1.8, "Stop", STOP);
  chip(s, rx + 3 * (rw + rg) + 0.05, 2.78, 1.8, "Ask first", ASK);
  chip(s, rx + 4 * (rw + rg) + 0.05, 2.78, 1.8, "Payer not asked", STOP);

  const outs = [
    [PASS, "Paid", "Booked once. Coupon spent. The week rises by cash."],
    [INK, "Card declined, no discount", "Wallet may book the same cash, on its own key."],
    [ASK, "Declined after a discount", "Reprice the next tender. If cash rises, ask."],
    [ASK, "Timeout after the write", "Retry the same key. Do not start another tender."],
    [STOP, "Fail before any charge", "Stop. Wallet is not used. Coupon unused."],
  ];
  outs.forEach((o, i) => {
    const x = 0.4 + i * 2.56;
    card(s, x, 3.35, 2.44, 3.3, PAPER);
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.18, y: 3.55, w: 0.28, h: 0.28, fill: { color: o[0] },
    });
    words(s, o[1], x + 0.16, 4.0, 2.12, 0.85, { size: 15, bold: true, color: TEXT });
    words(s, o[2], x + 0.16, 4.95, 2.12, 1.4, { size: 13, color: SLATE });
  });
  s.addNotes("Auto is not a second cashier. It runs the same three asks: form, slips, charge. A tie never takes the auto path. A charge sent before credentials_ok is refused and the payer is not called.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 13 Pay detail
{
  const s = open(false);
  kicker(s, "GATE 3, READ CLOSE");
  heading(s, "The cashier runs last, on a stored choice");
  const items = [
    ["The two slips", "The intent slip is the signed form: limits, tenders, confirm mode, expiry, and did:mock for this account. The payment slip is the signed quote: that intent’s signature, the quote fingerprint, the cash, the tender, and the seller. One flipped character, a swapped seller, or a cash total that differs is credentials_bad."],
    ["What is sent", "Seven fields: vault id, address id, cash, HKD, the tender stored on the quote, the quote expiry, and this attempt’s idempotency key. The vault id must start with vault_. The address id must start with address_. Any other field stops the call. No card number is read."],
    ["Same key, one booking", "A generic card books the raw key. A named card books tender:key. Wallet books wallet:key. A retry with the same user, cash, request, goal, and skus returns the existing receipt. A different cash on that key stops. A timeout before any charge books nothing."],
  ];
  items.forEach((item, i) => {
    const y = 1.25 + i * 1.85;
    card(s, 0.5, y, 12.3, 1.7, i === 1 ? INK : PAPER);
    words(s, item[0], 0.75, y + 0.18, 3.3, 1.3, { face: "Cambria", size: 22, bold: true, color: i === 1 ? "F3D48A" : INK, valign: "middle" });
    words(s, item[1], 4.2, y + 0.22, 8.3, 1.28, { size: 14, color: i === 1 ? PAPER : TEXT });
  });
  s.addNotes("Checkout copies one idea from Stripe’s Agentic Commerce Protocol: pay by a stored reference. This release does not call Stripe and does not mint a shared payment token. The login cookie is not part of the pay call.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 14 Section watch
{
  const s = open(true);
  words(s, "03", 0.7, 2.05, 4, 0.7, { face: "Cambria", size: 54, color: GOLD });
  words(s, "Watch it run", 0.7, 2.85, 11, 0.7, { face: "Cambria", size: 44, bold: true, color: PAPER });
  words(s, "Four full passes. Same gates. Different answers.\nThe numbers on these slides are the use-case numbers.", 0.7, 3.75, 11, 1.0, { size: 20, color: "D5E0EA" });
  s.addNotes("Shift tone. These are scenes. Read the result line of each beat, not every label.");
  footer(s, true);
}

// ---------------------------------------------------------------------------
// 15 Red balloons
{
  const s = open(false);
  kicker(s, "FLOW 1  ·  TWELVE STEPS, SIX SCENES");
  heading(s, "Red balloons, then one card charge");
  const scenes = [
    ["1", "“Red balloons.”", "Shopper, alone", "One balloon goal. Quantity stays editable. A sentence that overrides the form never becomes a search."],
    ["2", "The form says yes.", "Shopper asks mandate", "The form is valid. The budget hint does not fight 400. This goal’s share fits the week."],
    ["3", "Three rows drop.", "Shopper asks auditor, then mandate", "Poison, a higher agent price, and missing shipping are dropped. The clean balloon rows fit the caps."],
    ["4", "Taobao wins.", "Shopper, alone, then the merchant", "The winning seller’s best three stay. Only Taobao is called. It accepts. Shelf 50. Shipping 10."],
    ["5", "A quote for 60.", "Shopper asks mandate", "60 fits the form, the share, and the week. The person sees the quote. The coupon is reserved. Nothing is booked."],
    ["6", "Then the cashier.", "Mandate, auditor, payer", "The person confirms. The form is still valid. Both slips match. One card charge of 60. Cashback posts. The week rises by 60."],
  ];
  scenes.forEach((sc, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.28;
    const y = 1.25 + row * 2.85;
    card(s, x, y, 4.1, 2.68, i === 5 ? INK : PAPER);
    words(s, sc[0], x + 0.2, y + 0.16, 0.45, 0.4, { face: "Cambria", size: 22, bold: true, color: i === 5 ? "F3D48A" : GOLD });
    words(s, sc[1], x + 0.7, y + 0.2, 3.15, 0.36, { size: 16, bold: true, color: i === 5 ? PAPER : INK });
    words(s, sc[2], x + 0.2, y + 0.7, 3.7, 0.3, { size: 12, bold: true, color: i === 5 ? "E6C56A" : GOLD });
    words(s, sc[3], x + 0.2, y + 1.1, 3.7, 1.35, { size: 13, color: i === 5 ? "E6EDF4" : TEXT });
  });
  s.addNotes("If they ask who was not called: HKTV and Pinduoduo stay silent because they do not own the winning row. Clicking an offer in manual mode selects it. Confirm is a separate yes.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 16 Website story already partly in gate 2 — this is the pay-side drama: decline, timeout, void
{
  const s = open(false);
  kicker(s, "FLOWS 16, 17, 18, 2 AND 3");
  heading(s, "Same quote. Five different endings.");
  const ends = [
    ["60", PASS, "Auto, one clear winner", "The form says auto. The same three asks still run: the form, both slips, then one charge. Auto is not a second cashier. Paid once. Cash is 60."],
    ["Ask", ASK, "Two scores tie", "The shopper stops before any website. The person must choose. If nobody answers in 120 seconds, the coupon stays unused."],
    ["340", STOP, "The price moves after a yes", "The held quote was shelf 200 plus shipping 140. A material term then changes. The old yes is void. The person declines. Coupon unused. Nothing booked."],
    ["Wallet", INK, "Decline, then wallet", "No card discount, so wallet may pay the same 60 on wallet:key. The card is not charged. A discount forbids this path."],
    ["Same key", INK2, "Reply times out", "The charge is already written. Retry that key. Do not start wallet. Still one booking. A timeout before any charge books nothing."],
  ];
  ends.forEach((e, i) => {
    const x = 0.42 + i * 2.56;
    card(s, x, 1.28, 2.44, 5.45, PAPER);
    words(s, e[0], x + 0.12, 1.48, 2.2, 0.7, { face: "Cambria", size: 24, bold: true, color: e[1], align: "center" });
    words(s, e[2], x + 0.12, 2.25, 2.2, 1.2, { size: 14, bold: true, color: INK, align: "center" });
    words(s, e[3], x + 0.14, 3.55, 2.16, 2.9, { size: 13, color: TEXT });
  });
  s.addNotes("Flow 25 is the forbidden shortcut: a 40 card discount declined before charge must not book 260 on the wallet. The next scene shows the named-card version of that rule.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 17 Named card full flow
{
  const s = open(false);
  kicker(s, "FLOW 27  ·  THE FULL CARD PASS");
  heading(s, "The card that earns the discount");
  words(s, "Merchandise 280. Shipping 20. The form lists hsbc-visa, then citi-mastercard, then wallet. Each rule applies only to the tender it names.", 0.55, 1.12, 12.2, 0.4, { size: 15, color: SLATE });

  const prices = [
    ["hsbc-visa", "260", "40 off, once merchandise is at least 250", true],
    ["citi-mastercard", "290", "10 off, at the same minimum", false],
    ["wallet", "300", "No card rule on wallet", false],
  ];
  prices.forEach((p, i) => {
    const x = 0.5 + i * 4.2;
    card(s, x, 1.65, 4.0, 2.15, p[3] ? INK : PAPER);
    words(s, p[0], x + 0.22, 1.8, 3.55, 0.3, { size: 14, bold: true, color: p[3] ? GOLD : SLATE });
    words(s, p[1], x + 0.22, 2.12, 3.55, 0.7, { face: "Cambria", size: 40, bold: true, color: p[3] ? PAPER : INK });
    words(s, p[2], x + 0.22, 2.95, 3.55, 0.55, { size: 14, color: p[3] ? "D5E0EA" : TEXT });
  });

  const after = [
    ["1", "Quote held", "Tender hsbc-visa, cash 260. Coupon reserved. The person has not paid."],
    ["2", "HSBC declines", "Before any charge. The 260 must not move onto the next card."],
    ["3", "The person is asked", "Citi is repriced at 290. Decline releases the coupon. Accept stores the new quote."],
    ["4", "One booking", "290 on citi-mastercard:key. The HSBC key is empty. The vault id is the same account reference."],
  ];
  after.forEach((a, i) => {
    const x = 0.5 + i * 3.2;
    card(s, x, 4.05, 3.05, 2.65, PAPER);
    words(s, a[0], x + 0.16, 4.2, 0.4, 0.35, { face: "Cambria", size: 18, bold: true, color: GOLD });
    words(s, a[1], x + 0.55, 4.22, 2.3, 0.35, { size: 14, bold: true, color: INK });
    words(s, a[2], x + 0.16, 4.7, 2.72, 1.75, { size: 14, color: TEXT });
  });
  s.addNotes("Generic card, flow 25, is the same rule with one name: HKTV at 260 on card, Taobao at 270. A decline asks for wallet at 300. Nothing is booked at 260. Wallet-only, flow 26, never sees the card rule, so Taobao at 270 wins.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 18 Stops that continue vs stops that end
{
  const s = open(false);
  kicker(s, "FLOWS 4, 8, 9, 11");
  heading(s, "A bad row is not a bad request");
  const tiles = [
    [STOP, "The form is already dead", "Red balloons, but the expiry has passed. The shopper asks the mandate. Stop. No website is called. A revoked form ends the same way."],
    [PASS, "One listing is poisoned", "The text tells the agent to ignore the mandate. A clean sibling from the same seller remains. The poison drops. The clean row is signed and paid once."],
    [STOP, "Shipping is simply absent", "The only matching row has no shipping fee. It is dropped. Missing shipping is not zero. No clean offer remains, so the attempt stops."],
    [ASK, "A refund does not refill the week", "Cashback on that receipt becomes 0. The cash still counts inside 168 hours. The next purchase still does not fit. Nothing new is booked."],
  ];
  tiles.forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.4;
    const y = 1.28 + row * 2.8;
    card(s, x, y, 6.15, 2.6, PAPER);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.22, y: y + 0.28, w: 0.16, h: 0.16, fill: { color: t[0] }, rectRadius: 0.03,
    });
    words(s, t[1], x + 0.52, y + 0.18, 5.3, 0.4, { size: 18, bold: true, color: INK });
    words(s, t[2], x + 0.25, y + 0.75, 5.65, 1.55, { size: 15, color: TEXT });
  });
  s.addNotes("Contrast is the point of this slide: a poisoned listing continues; a poisoned user sentence, shown earlier, stops the whole request before search. A refund reverses cashback and leaves the week.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 19 Section metrics
{
  const s = open(true);
  words(s, "04", 0.7, 2.05, 4, 0.7, { face: "Cambria", size: 54, color: GOLD });
  words(s, "Every number", 0.7, 2.85, 11, 0.7, { face: "Cambria", size: 44, bold: true, color: PAPER });
  words(s, "Cash is what can be booked.\nThe score only chooses which row is offered first.", 0.7, 3.75, 11, 1.0, { size: 22, color: "D5E0EA" });
  s.addNotes("Draw the line in the air: two numbers, two jobs. Everything after this slide is a definition of one or the other.");
  footer(s, true);
}

// ---------------------------------------------------------------------------
// 20 Cash identity
{
  const s = open(false);
  kicker(s, "CASH");
  heading(s, "How a shelf price becomes cash");
  const formula = [
    ["Line", "shelf × quantity", "200 × 2 = 400"],
    ["Merchandise", "line − coupon, never below 0", "400 − 80 = 320"],
    ["Card discount", "the off on this tender’s own rule, if merchandise meets its minimum", "0 on this row"],
    ["Cash", "merchandise − card discount + shipping", "320 + 30 = 350"],
  ];
  formula.forEach((f, i) => {
    const y = 1.25 + i * 1.15;
    card(s, 0.5, y, 8.3, 1.02, i === 3 ? INK : PAPER);
    words(s, f[0], 0.72, y + 0.28, 2.3, 0.45, { size: 16, bold: true, color: i === 3 ? "F3D48A" : INK });
    words(s, f[1], 3.1, y + 0.15, 3.3, 0.72, { size: 14, color: i === 3 ? PAPER : TEXT });
    words(s, f[2], 6.4, y + 0.28, 2.2, 0.45, { size: 16, bold: true, color: i === 3 ? PAPER : PASS, align: "right" });
  });
  card(s, 9.05, 1.25, 3.7, 4.6, MIST);
  words(s, "Where the caps look", 9.28, 1.5, 3.25, 0.7, { face: "Cambria", size: 20, bold: true, color: INK });
  words(s, "Per item sees the line, before the coupon and before the card discount.", 9.28, 2.35, 3.25, 1.15, { size: 14, color: TEXT });
  words(s, "Per order, the goal’s share, and the 168-hour week see cash, after the card discount.", 9.28, 3.6, 3.25, 1.3, { size: 14, color: TEXT });
  words(s, "The red-balloon quote is the same identity at a smaller size: 50 + 10 = 60. No card rule, so the discount is 0.", 0.55, 6.0, 12.2, 0.7, { size: 14, color: SLATE });
  s.addNotes("Identity check on a quote: cash must equal merchandise minus card discount plus shipping. If it does not, the quote is invalid. A published discount larger than the merchandise does not apply.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 21 Gift, cashback, FX, week
{
  const s = open(false);
  kicker(s, "WHAT DOES NOT CHANGE THE CHARGE");
  heading(s, "350 can be booked. 300 cannot.");
  card(s, 0.5, 1.25, 6.15, 3.15, INK);
  words(s, "Cash stays 350", 0.75, 1.45, 5.7, 0.4, { size: 16, color: GOLD });
  words(s, "Score cost becomes 300", 0.75, 1.95, 5.7, 0.55, { face: "Cambria", size: 26, bold: true, color: PAPER });
  words(s, "Rewards on. Gift 100 counts as half, so the score moves by 50. Cash, the order cap, and the week do not move. Rewards off: score cost equals cash.", 0.75, 2.7, 5.6, 1.4, { size: 15, color: "E6EDF4" });

  card(s, 6.85, 1.25, 5.9, 3.15, PAPER);
  words(s, "Cashback", 7.1, 1.45, 5.4, 0.35, { size: 16, bold: true, color: INK });
  words(s, "merchandise × reward rate", 7.1, 1.9, 5.4, 0.35, { face: "Cambria", size: 20, color: PASS });
  words(s, "Shipping is excluded. It is written only after a successful booking. A refund sets that receipt’s cashback to 0 and leaves the week unchanged.", 7.1, 2.4, 5.4, 1.6, { size: 15, color: TEXT });

  const fx = [
    ["HKD", "× 1"],
    ["CNY", "× 1.08"],
    ["USD", "× 7.8"],
    ["Stamp", "2026-10-03 00:00 UTC"],
  ];
  fx.forEach((f, i) => {
    const x = 0.5 + i * 3.2;
    card(s, x, 4.6, 3.02, 1.35, MIST);
    words(s, f[0], x + 0.18, 4.75, 2.66, 0.35, { size: 13, bold: true, color: SLATE });
    words(s, f[1], x + 0.18, 5.15, 2.66, 0.5, { face: "Cambria", size: 20, bold: true, color: INK });
  });
  words(s, "Foreign shelf prices are converted to the cent before scoring. The stamp is stored on the quote.", 0.55, 6.15, 12, 0.4, { size: 14, color: SLATE });
  s.addNotes("Half the gift is this release’s own rule, from the worked example in the prompt. It is not a fitted rate. Highest cash and highest purchase count are at least 1, so one row does not divide by zero.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 22 Six parts defined
{
  const s = open(false);
  kicker(s, "THE SCORE");
  heading(s, "Six parts, added. Higher wins.");
  const parts = [
    ["Relevance", "0.35", "The full share, on every survivor. Category, brand, and appearance already removed mismatches, so this part does not reorder the rows."],
    ["Cash", "0.25", "Share × (1 − this cash / highest cash). The cash is the cheapest tender the form allows. Lower cash makes a larger part."],
    ["Rating", "0.15", "Share × stars / 5. The catalogue stops at 5 stars."],
    ["Purchases", "0.10", "Share × this count / the highest count still racing. The catalogue’s count, not this person’s history."],
    ["History", "0.15", "The full share if this sku appears on any earlier booking. Otherwise 0. This is not the 72-hour question."],
    ["Reward", "0 or more", "Cash share × (cash − score cost) / highest cash, only when rewards are on. Otherwise 0."],
  ];
  parts.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.28;
    const y = 1.25 + row * 2.8;
    card(s, x, y, 4.1, 2.62, PAPER);
    words(s, p[1], x + 0.2, y + 0.16, 3.7, 0.45, { face: "Cambria", size: 26, bold: true, color: GOLD });
    words(s, p[0], x + 0.2, y + 0.68, 3.7, 0.35, { size: 16, bold: true, color: INK });
    words(s, p[2], x + 0.2, y + 1.12, 3.7, 1.25, { size: 13, color: TEXT });
  });
  s.addNotes("Balanced shares: 0.35, 0.25, 0.15, 0.10, 0.15. Lowest cash: 0.20, 0.60, 0.10, 0.05, 0.05. A remaining sku tie after the scores is broken by sku id. The reward part is the sixth. The five shares are the weights.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 23 Clocks and caps
{
  const s = open(false);
  kicker(s, "CAPS AND CLOCKS");
  heading(s, "The limits that are not a score");
  const caps = [
    ["250", "Per item", "The pre-coupon line. Default on an unset form."],
    ["400", "Per order", "Cash after the card discount."],
    ["1,000", "The week", "Booked cash in the past 168 hours. A refund still counts."],
    ["72 h", "Repeat", "Same sku asks the person before pay. It does not change the score."],
    ["15 s", "Search", "Or less, if the form sets a shorter max."],
    ["120 s", "Quote and questions", "A quote older than this cannot be paid. An unanswered question ends the attempt."],
    ["0.0000000001", "Tie", "A smaller gap asks the person, including across sellers."],
    ["1", "Floor for a divisor", "Highest cash and highest purchase count are at least 1."],
  ];
  caps.forEach((c, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.4 + col * 3.22;
    const y = 1.28 + row * 2.8;
    card(s, x, y, 3.05, 2.58, PAPER);
    words(s, c[0], x + 0.16, y + 0.18, 2.73, 0.55, { face: "Cambria", size: 22, bold: true, color: INK });
    words(s, c[1], x + 0.16, y + 0.8, 2.73, 0.35, { size: 14, bold: true, color: GOLD });
    words(s, c[2], x + 0.16, y + 1.25, 2.73, 1.05, { size: 13, color: TEXT });
  });
  s.addNotes("Qualifying merchandise is merchandise after the shelf coupon, before the card discount, shipping excluded. That is the minimum a card rule measures.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 24 Section why
{
  const s = open(true);
  words(s, "05", 0.7, 2.0, 4, 0.7, { face: "Cambria", size: 54, color: GOLD });
  words(s, "Why these choices", 0.7, 2.8, 11, 0.7, { face: "Cambria", size: 44, bold: true, color: PAPER });
  words(s, "The shares were stated for this shop.\nThey were not fitted to a sales sample.", 0.7, 3.7, 11, 1.0, { size: 22, color: "D5E0EA" });
  s.addNotes("Transition: definitions are done. The next slides are the justification from the decision notes, including why the roles are split and why each share has that size.");
  footer(s, true);
}

// ---------------------------------------------------------------------------
// 25 Why the roles are split
{
  const s = open(false);
  kicker(s, "WHY THE WORK IS SPLIT");
  heading(s, "A constraint is not a preference");
  const reasons = [
    ["Shopper", "Adds unlike facts into one score, and prices each tender. It cannot sign the form, drop a listing by itself, or book."],
    ["Mandate", "Holds the hard limits. Category, brand, appearance, and the money caps are constraints. They remove a row before it can earn points."],
    ["Auditor", "Treats listing text as data. One bad row does not end a request that still has a clean row. The slips are a separate check, immediately before money."],
    ["Merchant", "Speaks only for its own catalogue. It does not see the budget and does not pick a different product. The shelf stays the human price."],
    ["Payer", "Books a choice that already exists on the quote. It does not re-rank, re-price, or read a card number."],
    ["The model", "May draft a parse, add one sentence, and propose the next legal message. The tool’s cash, tender, signature, and booking stay."],
  ];
  reasons.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.28;
    const y = 1.25 + row * 2.8;
    card(s, x, y, 4.1, 2.62, PAPER);
    words(s, r[0], x + 0.22, y + 0.22, 3.65, 0.4, { face: "Cambria", size: 22, bold: true, color: INK });
    words(s, r[1], x + 0.22, y + 0.8, 3.65, 1.55, { size: 14, color: TEXT });
  });
  s.addNotes("Belton and Stewart: constraints versus criteria. Stars, cash, purchases, and history are criteria. The money limits are constraints. Say that the model is refused if it names the payer, a charge, or a retry.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 26 Why the shares
{
  const s = open(false);
  kicker(s, "WHY THESE SHARES");
  heading(s, "A stated tradeoff, not a fitted weight");
  const lines = [
    ["0.35  Relevance", "Largest, so the card shows that matching the request was the main concern in balanced mode. Among survivors it is a constant, so it does not pick the winner. Setting it to 0 would say the request did not count."],
    ["0.25  Cash", "Second, because balanced mode is not cheapest-only. Lowest cash moves this share to 0.60 and shrinks the others to 0.20, 0.10, 0.05, 0.05. “Cheapest” in a sentence asks; it does not swap the vector."],
    ["0.15  Rating and history", "Equal, and both smaller than cash. Stars are a 0-to-1 grade. History is yes or no: any earlier booking of this sku. The 72-hour rule stays a question, so a familiar item is not punished at the moment the person is asked about it."],
    ["0.10  Purchases", "Smallest. Dividing by the highest count in the race puts a shop of 10 and a shop of 10,000 on one scale. Popularity can nudge a close call. It cannot overturn a large price or star gap."],
  ];
  lines.forEach((ln, i) => {
    const y = 1.22 + i * 1.4;
    card(s, 0.5, y, 12.3, 1.28, PAPER);
    words(s, ln[0], 0.72, y + 0.18, 3.3, 0.9, { face: "Cambria", size: 18, bold: true, color: INK, valign: "middle" });
    words(s, ln[1], 4.15, y + 0.16, 8.4, 0.98, { size: 14, color: TEXT });
  });
  s.addNotes("An explicit override that does not add to 1, such as cash 0.50 with the others left alone, is used as written. Rescaling would change numbers the person did not edit. A negative or missing share stops the attempt before search.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 27 Worked pair chart
{
  const s = open(false);
  kicker(s, "THE SAME TWO ROWS, TWO VECTORS");
  heading(s, "Row A wins. Cash is why it wins harder.");
  words(s, "Rewards off. Neither sku bought before. Highest cash in the race is 300. Highest purchase count is 10.", 0.55, 1.12, 8, 0.45, { size: 13, color: SLATE });

  const bars = [
    ["Relevance", 0.35, 0.35],
    ["Cash", 0.0333, 0],
    ["Rating", 0.12, 0.15],
    ["Purchases", 0.1, 0.02],
    ["History", 0, 0],
  ];
  words(s, "A   cash 260, 4 stars, 10 purchases", 2.15, 1.62, 3.2, 0.24, { size: 12, bold: true, color: PASS });
  words(s, "B   cash 300, 5 stars, 2 purchases", 5.4, 1.62, 3.1, 0.24, { size: 12, bold: true, color: INK2 });
  bars.forEach((row, i) => {
    const y = 2.02 + i * 0.88;
    words(s, row[0], 0.45, y + 0.16, 1.55, 0.4, { size: 14, bold: true, color: INK });
    [row[1], row[2]].forEach((value, series) => {
      const yBar = y + series * 0.36;
      const width = value === 0 ? 0 : Math.max(0.14, (value / 0.35) * 3.4);
      if (width > 0) {
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: 2.15, y: yBar, w: width, h: 0.28,
          fill: { color: series === 0 ? PASS : INK2 },
          rectRadius: 0.04,
        });
      }
      words(s, value === 0 ? "0" : String(value), 2.15 + width + 0.08, yBar, 0.85, 0.28, {
        size: 12, color: series === 0 ? PASS : INK2, valign: "middle",
      });
    });
  });

  card(s, 8.75, 1.6, 4.05, 2.35, INK);
  words(s, "Balanced", 8.95, 1.75, 3.65, 0.28, { size: 13, bold: true, color: GOLD });
  words(s, "0.6033   vs   0.52", 8.95, 2.1, 3.65, 0.5, { face: "Cambria", size: 22, bold: true, color: PAPER });
  words(s, "Purchases 0.08 and cash 0.0333 outweigh B’s extra star of 0.03.", 8.95, 2.7, 3.65, 0.95, { size: 13, color: "E6EDF4" });

  card(s, 8.75, 4.15, 4.05, 2.35, PAPER);
  words(s, "Lowest cash", 8.95, 4.3, 3.65, 0.28, { size: 13, bold: true, color: GOLD });
  words(s, "0.41   vs   0.31", 8.95, 4.65, 3.65, 0.5, { face: "Cambria", size: 22, bold: true, color: INK });
  words(s, "The cash gap grows to 0.08. The star gap shrinks to 0.02. That is what 0.60 does.", 8.95, 5.25, 3.65, 1.0, { size: 13, color: TEXT });
  s.addNotes("Relevance sits on both bars and does not decide. Row A cash part is 0.25 times 40 over 300. Read the two score pairs, then say the chart is the balanced vector only.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 28 Cent and sources
{
  const s = open(false);
  kicker(s, "THE TIE LINE, AND WHERE THE METHOD COMES FROM");
  heading(s, "A real cent still ranks");
  card(s, 0.5, 1.25, 6.2, 2.7, INK);
  words(s, "0.0000025", 0.75, 1.5, 5.7, 0.7, { face: "Cambria", size: 36, bold: true, color: "F3D48A" });
  words(s, "One cent, when the highest cash is 1,000 and the cash share is 0.25. The tie line is 0.0000000001. The cent is larger, so it still sorts. The tie line catches floating-point dust.", 0.75, 2.35, 5.7, 1.3, { size: 15, color: PAPER });

  card(s, 6.9, 1.25, 5.9, 2.7, PAPER);
  words(s, "Gift, restated", 7.15, 1.48, 5.4, 0.35, { size: 16, bold: true, color: INK });
  words(s, "A gift is not money. It may change which row is offered. It does not reduce the charge. Half is the published rule: line 400, merchandise 320, cash 350, score cost 300.", 7.15, 2.0, 5.4, 1.6, { size: 15, color: TEXT });

  const sources = [
    ["Weighted sum", "Normalise each fact from 0 to 1, multiply by its share, add. A cost is flipped first. Hwang and Yoon, 1981. Triantaphyllou, 2000."],
    ["Constraint vs criterion", "Filters remove rows. The score grades whoever remains. Belton and Stewart, 2002."],
    ["Shares that add to 1", "A value tradeoff the person declares, not a coefficient from data. Keeney and Raiffa, 1976. No sales sample estimated 0.35 or 0.25."],
  ];
  sources.forEach((src, i) => {
    const x = 0.5 + i * 4.2;
    card(s, x, 4.15, 4.0, 2.55, MIST);
    words(s, src[0], x + 0.18, 4.32, 3.64, 0.55, { size: 15, bold: true, color: INK });
    words(s, src[1], x + 0.18, 4.95, 3.64, 1.5, { size: 13, color: TEXT });
  });
  s.addNotes("The flip is 1 minus this cash over highest cash, the linear cost scale when the floor is treated as 0. Do not claim the shares were learned. They are a prior for snacks and balloons.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 29 Customizability — the form
{
  const s = open(false);
  kicker(s, "WHAT THE PERSON CAN SET");
  heading(s, "The form is the standing instruction");
  const fields = [
    ["Confirm", "Manual, or auto when one offer is strictly first."],
    ["Expiry", "No expiry, or a time. A past time stops before search."],
    ["Sellers", "Allow list and deny list. Empty allow means everyone except deny."],
    ["Categories", "Allow and deny, from the closed snack and balloon tree."],
    ["Per item", "Default 250, on the pre-coupon line."],
    ["Per order", "Default 400, on cash."],
    ["The week", "Default 1,000 across 168 hours."],
    ["Tenders", "card, hsbc-visa, citi-mastercard, wallet. Default is card."],
    ["One seller", "On. One order does not mix merchant ids."],
    ["Search clock", "15 seconds, or a shorter cap on the form."],
    ["Objective", "Balanced, or lowest cash. This picks the five shares."],
    ["Rewards", "On by default. Off makes the score cost equal cash."],
  ];
  fields.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.28;
    const y = 1.22 + row * 1.4;
    card(s, x, y, 4.1, 1.26, PAPER);
    words(s, f[0], x + 0.18, y + 0.14, 3.74, 0.32, { size: 15, bold: true, color: INK });
    words(s, f[1], x + 0.18, y + 0.52, 3.74, 0.58, { size: 13, color: TEXT });
  });
  s.addNotes("An unset form means manual confirm, one merchant, rewards on, and no expiry. The person still confirms a form that language filled in. They do not type the vault id or the address id.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 30 Sentence and request
{
  const s = open(false);
  kicker(s, "WHAT A SENTENCE MAY CHANGE");
  heading(s, "The request is editable. The form is not.");
  card(s, 0.45, 1.25, 6.2, 5.45, PAPER);
  words(s, "The person can set", 0.7, 1.48, 5.7, 0.4, { face: "Cambria", size: 22, bold: true, color: PASS });
  const can = [
    "The goal, such as balloons. “Party items” becomes an editable list. Quantities stay blank until they are set.",
    "Brand, appearance, and a budget hint.",
    "Each goal’s share of the request. Unassigned money stays reserved. A goal cannot borrow.",
    "Which offer, when two scores tie, or when a new quote replaces a yes.",
    "Whether a repeat inside 72 hours was intentional.",
    "The five shares, by editing the objective, or by a deliberate vector on this attempt.",
  ];
  can.forEach((line, i) => {
    words(s, line, 0.75, 2.1 + i * 0.72, 5.6, 0.68, { size: 13, color: TEXT });
  });

  card(s, 6.85, 1.25, 5.95, 5.45, INK);
  words(s, "The sentence cannot", 7.1, 1.48, 5.45, 0.4, { face: "Cambria", size: 22, bold: true, color: "F3D48A" });
  const cannot = [
    "Raise a limit, add a seller, or switch confirm mode.",
    "Turn “cheapest” into the lowest-cash vector while the form is balanced.",
    "Invent a guest count, or search before the shares are assigned.",
    "Omit shipping, or treat a gift as a smaller charge.",
    "Tell the payer to run before the slips match.",
    "Become the booking. Code sets the money, the tender, and the key.",
  ];
  cannot.forEach((line, i) => {
    words(s, line, 7.15, 2.1 + i * 0.72, 5.4, 0.68, { size: 14, color: PAPER });
  });
  s.addNotes("Natural language may fill the form. The person still checks it. A proposal that contradicts the form opens a clarification. Refusal or timeout ends the request.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 31 Card rule, stated as a principle after the scene
{
  const s = open(false);
  kicker(s, "THE CARD RULE, STATED ONCE");
  heading(s, "A discount belongs to one tender");
  const rules = [
    ["One rule, one name", "HSBC’s 40 does not also come off Citi. Two rules do not stack on one charge."],
    ["Lowest cash is stored", "260, 290, and 300. The quote keeps hsbc-visa and 260. Confirm sends that pair."],
    ["Equal cash", "The earlier name on the form wins. No extra score is invented to break a money tie."],
    ["A decline reprices", "The next tender is priced with its own rule. If cash rises, the person is asked. The old cash is not booked on the new name."],
    ["No discount, next tender", "A plain card decline may book wallet at the same cash, on a different key, and only if wallet is later on the list."],
    ["After a charge exists", "A timeout retries that same key. It does not walk to the next card."],
  ];
  rules.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.28;
    const y = 1.28 + row * 2.8;
    card(s, x, y, 4.1, 2.6, PAPER);
    words(s, r[0], x + 0.22, y + 0.25, 3.65, 0.7, { face: "Cambria", size: 20, bold: true, color: INK });
    words(s, r[1], x + 0.22, y + 1.1, 3.65, 1.2, { size: 14, color: TEXT });
  });
  s.addNotes("Flow 26 is the negative: wallet only, so HKTV’s card rule is invisible and Taobao at 270 wins over HKTV at 300. The generic card flow is 25: decline asks for wallet at 300.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 32 The log
{
  const s = open(false);
  kicker(s, "THE DECISION LOG");
  heading(s, "The same comparison, in three places");
  const places = [
    ["On the offer", "The five shares, the six parts, the cash, the tender when a discount was used, and the score."],
    ["On the screen", "One line per step: who, the rule, the reason, and each fact on its own line. The trace id is on the log."],
    ["While it runs", "The terminal prints each line. scout.log, in the logs folder, keeps that line with the trace id and the clock. SCOUT_TRACE=0 turns both off."],
  ];
  places.forEach((p, i) => {
    const x = 0.45 + i * 4.25;
    card(s, x, 1.25, 4.05, 2.7, i === 2 ? INK : PAPER);
    words(s, p[0], x + 0.22, 1.45, 3.6, 0.45, { face: "Cambria", size: 22, bold: true, color: i === 2 ? "F3D48A" : INK });
    words(s, p[1], x + 0.22, 2.05, 3.6, 1.65, { size: 14, color: i === 2 ? PAPER : TEXT });
  });
  const rows = [
    ["Shares", "relevance 0.35, cash 0.25, rating 0.15, purchases 0.10, history 0.15"],
    ["Each scored row", "sku, cash, tender, score, and the six parts"],
    ["The outcome", "the winning sku"],
    ["A charge", "tender, cash, and the idempotency key. The vault id is not written on the line."],
    ["A reprice", "card_reprice names the next cash and the next tender"],
    ["A booking", "stores this attempt’s trace id, so the receipt and the log are the same story"],
  ];
  rows.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.45 + col * 6.4;
    const y = 4.15 + row * 0.9;
    card(s, x, y, 6.2, 0.78, MIST);
    words(s, r[0], x + 0.16, y + 0.18, 1.7, 0.42, { size: 13, bold: true, color: INK });
    words(s, r[1], x + 1.9, y + 0.12, 4.1, 0.54, { size: 12, color: TEXT });
  });
  s.addNotes("Tests stay quiet because the test runner sets VITEST. The app and the demo print. A write failure is reported and does not abort the purchase.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 33 Security
{
  const s = open(false);
  kicker(s, "SECURITY");
  heading(s, "Instructions are data. Money has a gate.");
  const threats = [
    ["A poisoned listing", "Description, photograph, or review says to ignore the budget or pay now. That offer drops. A clean sibling can still be paid. The request continues."],
    ["The person types the attack", "“Ignore the mandate” in the request is a different case. Search does not start. The whole attempt stops."],
    ["A secret agent price", "agent price above human price drops that row and is logged. The shelf that remains is the human price."],
    ["A counter with orders in it", "The auditor vetoes “ignore the mandate.” The row is skipped. The coupon on that row stays unused."],
    ["A slip that was touched", "Flipped character, swapped seller, or a cash total that is not the quote. The payer is not asked. A charge sent early is refused."],
    ["The card itself", "The account mints vault_ and address_ ids. The pay call sends those. There is no card number, no bank lookup, and no shared payment token in this release."],
  ];
  threats.forEach((t, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.28;
    const y = 1.25 + row * 2.85;
    card(s, x, y, 4.1, 2.68, PAPER);
    words(s, t[0], x + 0.2, y + 0.18, 3.7, 0.6, { face: "Cambria", size: 18, bold: true, color: INK });
    words(s, t[1], x + 0.2, y + 0.9, 3.7, 1.55, { size: 13, color: TEXT });
  });
  s.addNotes("Also say the model cannot invent a charge. If its proposed next message names the payer, charge, or retry, the proposal is refused and the tool’s message is sent. Overspend on the replay set is 0: cash broke a mandate, reward reduced cash, or shipping was omitted. A real card discount that lowers cash is not an overspend.");
  footer(s, false);
}

// ---------------------------------------------------------------------------
// 34 Close
{
  const s = open(true);
  words(s, "One trace. One booking.", 0.7, 1.85, 12, 0.8, { face: "Cambria", size: 40, bold: true, color: PAPER });
  words(s, "The week rises by the cash that was booked, not by the score that chose the row.", 0.7, 2.8, 11, 0.8, { size: 20, color: "D5E0EA" });
  const close = [
    ["Ask", "Five roles, and the shopper is the only one that ranks."],
    ["Pass the gate", "A fail has a reason. The next role is not skipped."],
    ["Book once", "The quote’s tender, the quote’s cash, the account’s vault id."],
  ];
  close.forEach((c, i) => {
    card(s, 0.7 + i * 4.1, 4.15, 3.9, 1.9, INK2);
    words(s, c[0], 0.92 + i * 4.1, 4.35, 3.5, 0.4, { size: 16, bold: true, color: "F3D48A" });
    words(s, c[1], 0.92 + i * 4.1, 4.85, 3.5, 0.9, { size: 15, color: PAPER });
  });
  s.addNotes("Stop. If there is one question, take the card decline: why 260 is not booked on Citi. Answer from flow 27.");
  footer(s, true);
}

await pres.writeFile({ fileName: "/Users/bono/Desktop/Agentic-Commerce/tasks/artifacts/scout-judges.pptx" })
  .then(() => console.log("wrote", page, "slides"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
