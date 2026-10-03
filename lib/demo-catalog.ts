export const DEMO_CATEGORIES = ["milk", "cup", "snacks", "balloons", "tableware"] as const;
export type DemoCategory = typeof DEMO_CATEGORIES[number];
export type DemoProduct = { id: string; category: DemoCategory; name: string; merchant: string; price: number; shipping: number; stock: number; tags: string[] };
export const DEMO_CATALOG: DemoProduct[] = [
  { id: "milk", category: "milk", name: "全脂牛奶 · 1 盒 / 1L", merchant: "Fresh Market", price: 24, shipping: 8, stock: 100, tags: ["全脂", "full cream"] },
  { id: "milk-low", category: "milk", name: "低脂牛奶 · 1 盒 / 1L", merchant: "Fresh Market", price: 26, shipping: 8, stock: 100, tags: ["低脂", "low fat"] },
  { id: "milk-oat", category: "milk", name: "燕麦奶 · 1 盒 / 1L", merchant: "Fresh Market", price: 30, shipping: 8, stock: 100, tags: ["燕麦", "oat", "植物"] },
  { id: "milk-lactose", category: "milk", name: "无乳糖牛奶 · 1 盒 / 1L", merchant: "Fresh Market", price: 28, shipping: 8, stock: 0, tags: ["无乳糖", "lactose free"] },
  { id: "milk-lactose-alt", category: "milk", name: "无乳糖牛奶替代款 · 1 盒 / 1L", merchant: "Daily Grocer", price: 32, shipping: 10, stock: 100, tags: ["无乳糖", "lactose free"] },
  { id: "cup", category: "cup", name: "Portable leakproof cup · 450ml", merchant: "Travel Goods", price: 98, shipping: 10, stock: 100, tags: ["便携", "portable", "防漏", "leakproof"] },
  { id: "snacks", category: "snacks", name: "派对零食分享包 · 每包供 4 人", merchant: "Fresh Market", price: 80, shipping: 8, stock: 100, tags: [] },
  { id: "balloons", category: "balloons", name: "红气球 · 20 个 / 包", merchant: "Party Studio", price: 50, shipping: 10, stock: 100, tags: ["红", "red"] },
  { id: "balloons-blue", category: "balloons", name: "蓝气球 · 20 个 / 包", merchant: "Party Studio", price: 50, shipping: 10, stock: 100, tags: ["蓝", "blue"] },
  { id: "tableware", category: "tableware", name: "派对餐具 · 10 人 / 套", merchant: "Party Studio", price: 40, shipping: 10, stock: 100, tags: [] },
];
