import { isDue } from "./core/cadence";
import type { Item } from "./core/types";
import { createInMemoryStore } from "./shell/storage";

const demoItems: Item[] = [
  {
    id: "1",
    name: "Piano",
    category: "music",
    subCategory: "piano",
    cadence: { kind: "monthly" },
    held: false,
    archived: false,
  },
  {
    id: "2",
    name: "Cello",
    category: "music",
    subCategory: "cello",
    cadence: { kind: "daily" },
    held: false,
    archived: false,
  },
  {
    id: "3",
    name: "Drawing",
    category: "drawing",
    cadence: { kind: "weekly" },
    held: false,
    archived: false,
  },
];

const store = createInMemoryStore();
store.items.push(...demoItems);

const now = new Date();
const due = store.items.filter((item) => isDue(item, now));

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  const items = due
    .map((item) => `<li>${item.name} (${item.category})</li>`)
    .join("");
  app.innerHTML = `
    <h1>cycle-in</h1>
    <p>Scaffolding proof-of-life — the real data layer/sync model is still
    undecided (see <code>docs/PROGRESS.md</code>).</p>
    <h2>Due right now</h2>
    <ul>${items}</ul>
  `;
}
