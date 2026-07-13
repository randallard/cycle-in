import "./ui/style.css";
import { createInMemoryStore, openIndexedDbStore } from "./shell/storage";
import { startApp } from "./ui/app";

async function main(): Promise<void> {
  // Real IndexedDB store (persists across reloads); in-memory only where
  // IndexedDB doesn't exist. First run shows the empty state — no demo
  // seeding anymore now that items can be added in the UI.
  const store =
    typeof indexedDB === "undefined"
      ? createInMemoryStore()
      : await openIndexedDbStore();
  const app = document.querySelector<HTMLDivElement>("#app");
  if (app) await startApp(store, app);
}

void main();
