// TEST ONLY. This deterministic HTTP fixture verifies the browser/API wiring.
// Never use it as the shopper in a real demonstration. It is not AI.
import { createServer } from "node:http";

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/v1/chat/completions") { res.writeHead(404); res.end(); return; }
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    const body = JSON.parse(raw);
    const { input, previous } = JSON.parse(body.messages.findLast(message => message.role === "user").content);
    const text = input.toLowerCase();
    const intent = { kind: "products", goals: [], guests: null, budget: null, question: null };
    if (/party|派对/.test(text) || previous?.kind === "party") {
      intent.kind = "party"; intent.budget = previous?.budget ?? 1000;
      intent.guests = text.match(/(\d+)\s*(人|people|guests)/)?.[1] ? Number(text.match(/(\d+)\s*(人|people|guests)/)[1]) : null;
    } else if (/cup|杯/.test(text)) {
      intent.goals = [{ category: "cup", qty: 1, preference: "portable" }]; intent.budget = /100/.test(text) ? 100 : null;
    } else if (/milk|牛奶|奶/.test(text)) {
      intent.goals = [{ category: "milk", qty: 1, preference: /无乳糖|lactose/.test(text) ? "无乳糖" : /低脂|low fat/.test(text) ? "低脂" : "" }];
    } else { intent.kind = "unsupported"; }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(intent) } }] }));
  } catch { res.writeHead(400); res.end("Invalid test fixture request"); }
}).listen(3211, "127.0.0.1", () => console.log("TEST FIXTURE (not AI): http://127.0.0.1:3211/v1"));
