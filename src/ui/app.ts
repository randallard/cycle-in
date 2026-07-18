import { parseBundle, serializeBundle } from "../core/bundle";
import { parseBvConfig } from "../core/bvimport";
import type { CycleEvent } from "../core/events";
import { reduce } from "../core/reduce";
import { minutesByCategory } from "../core/rollup";
import type { SelectionEntry } from "../core/select";
import { selectOptions } from "../core/select";
import { stepProgress } from "../core/steps";
import type { Period } from "../core/rollup";
import { dayKey, fromDayKey } from "../core/time";
import type { BvStep, Cadence, ItemState, State } from "../core/types";
import type { EventStore } from "../shell/storage";
import { catColor, esc, fmtClock, fmtMin, isWebLink, safeHref } from "./format";
import type { HistoryModel } from "./history";
import { chartSvg, historyHtml, historyModel, tooltipHtml } from "./history";
import type { PickerState } from "./picker";
import {
  initPicker,
  moveNode,
  pickNodesHtml,
  pickerHtml,
  pickerSteps,
  selectedCount,
  slugify,
  toggleNode,
} from "./picker";

/** Omit distributed over the event union (plain Omit collapses a union to its
 * common properties, losing every kind-specific payload). */
type EventInput = CycleEvent extends infer E
  ? E extends CycleEvent
    ? Omit<E, "id" | "at" | "v">
    : never
  : never;

/** Transient view state — everything durable lives in the event log. */
interface UiState {
  openItem?: string;
  logItem?: string;
  cadenceItem?: string;
  checkinItem?: string;
  logPanelCat?: string;
  addOpen: boolean;
  status: string;
  statusError: boolean;
  /** Active branching-video import (ADR-0004); undefined = not importing. */
  picker?: PickerState;
  /** History view controls (the log itself is the durable part). */
  histPeriod: Period;
  histFocus: string;
}

function cadenceLabel(c: Cadence): string {
  const t = c.atTime;
  const time =
    t !== undefined
      ? ` · ${String(t.hour)}:${String(t.minute).padStart(2, "0")}`
      : "";
  return `${c.kind}${time}`;
}

export async function startApp(
  store: EventStore,
  root: HTMLElement
): Promise<void> {
  const events: CycleEvent[] = [...(await store.all())];
  let state: State = reduce(events);
  const ui: UiState = {
    addOpen: false,
    status: "",
    statusError: false,
    histPeriod: "week",
    histFocus: "all",
  };
  let histModel: HistoryModel | undefined;

  const mkEvent = (e: EventInput): CycleEvent => ({
    ...e,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    v: 1,
  });

  async function dispatch(...inputs: EventInput[]): Promise<void> {
    for (const input of inputs) {
      const e = mkEvent(input);
      await store.append(e);
      events.push(e);
    }
    state = reduce(events);
    render();
  }

  function say(status: string, isError = false): void {
    ui.status = status;
    ui.statusError = isError;
    render();
  }

  /** Update the status line *without* re-rendering — for validation messages
   * on an open form, where a re-render would wipe the values typed into it
   * (the forms are DOM-held by design). Falls back to a render if the status
   * node isn't on the page. */
  function sayInPlace(status: string): void {
    ui.status = status;
    ui.statusError = true;
    const el = root.querySelector<HTMLElement>("p.status");
    if (el === null) {
      render();
      return;
    }
    el.textContent = status;
    el.classList.add("error");
  }

  // ── view helpers ─────────────────────────────────────────────────────────

  function categoriesOf(s: State): string[] {
    const cats = new Set<string>();
    for (const it of Object.values(s.items)) {
      if (!it.archived) cats.add(it.category);
    }
    for (const l of s.logEntries) cats.add(l.category);
    return [...cats].sort();
  }

  function focusCategory(): string | undefined {
    const m = /^#focus\/(.+)$/.exec(location.hash);
    return m ? decodeURIComponent(m[1] ?? "") : undefined;
  }

  function itemRoute(): string | undefined {
    const m = /^#item\/(.+)$/.exec(location.hash);
    return m ? decodeURIComponent(m[1] ?? "") : undefined;
  }

  function chipFor(entry: SelectionEntry): string {
    if (entry.orange) return `<span class="chip overdue">time went by</span>`;
    switch (entry.reason) {
      case "held":
        return `<span class="chip pinned">pinned</span>`;
      case "bumped":
        return `<span class="chip bumped">bumped</span>`;
      case "early":
        return `<span class="chip early">early</span>`;
      case "due-timed":
      case "due":
        return "";
    }
  }

  /** Compact at-a-glance "step k/n" chip for a BV item (current step title as
   * hover text); empty for non-BV items. */
  function stepChip(item: ItemState): string {
    const p = stepProgress(item);
    if (p === undefined) return "";
    const label =
      p.current !== undefined
        ? `step ${String(p.index + 1)}/${String(p.total)}`
        : `${String(p.total)} steps`;
    return `<span class="chip step" title="${esc(p.current?.title ?? "")}">${label}</span>`;
  }

  /** The step context + advance control shown inside a BV item's expanded
   * verbs: where you are now, and the button that moves to the next step. */
  function stepControl(item: ItemState): string {
    const p = stepProgress(item);
    if (p === undefined) return "";
    const now =
      p.current !== undefined
        ? `<span class="stepnow">now: <b>${esc(p.current.title)}</b> · step ${String(p.index + 1)}/${String(p.total)}</span>`
        : `<span class="stepnow">${String(p.total)} steps · not started</span>`;
    const advance =
      p.next !== undefined
        ? `<button class="do" data-action="advance" data-item="${esc(item.id)}">Advance to ${esc(p.next.title)} →</button>`
        : `<span class="chip">final step</span>`;
    return `<span class="stepctl">${now}${advance}</span>`;
  }

  function verbsFor(item: ItemState): string {
    if (ui.logItem === item.id) {
      return `
        <form class="inline-form" data-form="log" data-item="${esc(item.id)}">
          <label>minutes <input type="number" name="minutes" min="1" max="1440" required /></label>
          <label>note <input type="text" name="notes" maxlength="200" /></label>
          <label>tags <input type="text" name="tags" maxlength="120" placeholder="comma, separated" /></label>
          <button class="do" type="submit">Save log</button>
          <button class="do" type="button" data-action="close-forms">Cancel</button>
        </form>`;
    }
    if (ui.cadenceItem === item.id) {
      const opts = (["daily", "weekly", "monthly", "one-off"] as const)
        .map(
          (k) =>
            `<option value="${k}"${k === item.cadence.kind ? " selected" : ""}>${k}</option>`
        )
        .join("");
      const t = item.cadence.atTime;
      const timeVal =
        t !== undefined
          ? `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`
          : "";
      return `
        <form class="inline-form" data-form="cadence" data-item="${esc(item.id)}">
          <label>cadence <select name="kind">${opts}</select></label>
          <label>at <input type="time" name="time" value="${timeVal}" /></label>
          <button class="do" type="submit">Change</button>
          <button class="do" type="button" data-action="close-forms">Cancel</button>
        </form>`;
    }
    if (ui.openItem !== item.id) return "";
    const holdVerb = item.held
      ? `<button class="do" data-action="release" data-item="${esc(item.id)}">Release hold</button>`
      : `<button class="do" data-action="hold" data-item="${esc(item.id)}">Hold on list</button>`;
    return `
      <span class="allverbs">
        ${stepControl(item)}
        <button class="do" data-action="start" data-item="${esc(item.id)}">Start</button>
        <button class="do" data-action="open-log" data-item="${esc(item.id)}">Log time…</button>
        ${holdVerb}
        <button class="do" data-action="dismiss" data-item="${esc(item.id)}">Not today</button>
        <button class="do" data-action="bump" data-item="${esc(item.id)}">Bump for tomorrow</button>
        <button class="do" data-action="open-cadence" data-item="${esc(item.id)}">Change cadence…</button>
        <button class="do" data-action="archive" data-item="${esc(item.id)}">Archive</button>
      </span>`;
  }

  function itemRow(entry: SelectionEntry, sub: string): string {
    const it = entry.item;
    return `
      <li class="item">
        <button class="do" data-action="done" data-item="${esc(it.id)}">Done</button>
        <span class="name"><a class="itemlink" href="#item/${encodeURIComponent(it.id)}"><b>${esc(it.name)}</b></a><small>${esc(sub)}</small></span>
        ${stepChip(it)}
        ${chipFor(entry)}
        <button class="more" data-action="toggle-verbs" data-item="${esc(it.id)}"
          aria-label="More actions for ${esc(it.name)}" aria-expanded="${String(ui.openItem === it.id)}">⋯</button>
        ${verbsFor(it)}
      </li>`;
  }

  function balanceBar(cats: readonly string[], now: Date): string {
    if (cats.length === 0) return "";
    const day = minutesByCategory(state.logEntries, "day", now);
    const week = minutesByCategory(state.logEntries, "week", now);
    const month = minutesByCategory(state.logEntries, "month", now);
    const total = cats.reduce((a, c) => a + (day[c] ?? 0), 0);

    let acc = 0;
    const segs = cats
      .filter((c) => (day[c] ?? 0) > 0)
      .map((c) => {
        const w = ((day[c] ?? 0) / total) * 100;
        const s = `<span class="seg" style="left:${String(acc)}%; width:${String(w)}%; background:${catColor(c, cats)}"></span>`;
        acc += w;
        return s;
      })
      .join("");
    const ticks =
      cats.length > 1
        ? cats
            .slice(1)
            .map(
              (_c, i) =>
                `<span class="tick" style="left:${String(((i + 1) / cats.length) * 100)}%"></span>`
            )
            .join("")
        : "";
    const legend = cats
      .map((c) => {
        const short = total > 0 && (day[c] ?? 0) === 0;
        return `
          <div>
            <span class="dot" style="background:${catColor(c, cats)}"></span>
            <span class="cat">${esc(c)}</span>
            <span class="delta${short ? " short" : ""} mono">${fmtMin(day[c] ?? 0)} today · ${fmtMin(week[c] ?? 0)} wk · ${fmtMin(month[c] ?? 0)} mo</span>
          </div>`;
      })
      .join("");
    const summary =
      total === 0
        ? "Nothing logged yet today — an even split is wide open."
        : "Ticks mark an even split; the list below weights less-logged categories up.";
    return `
      <section class="balance" aria-label="Today's attention balance">
        <div class="head"><span class="micro">Today's balance</span><p>${summary}</p></div>
        <div class="bar">${segs}${ticks}</div>
        <div class="legend">${legend}</div>
      </section>`;
  }

  function panelFor(
    cat: string,
    entries: SelectionEntry[],
    cats: readonly string[],
    now: Date
  ): string {
    const day = minutesByCategory(state.logEntries, "day", now)[cat] ?? 0;
    const week = minutesByCategory(state.logEntries, "week", now)[cat] ?? 0;
    const month = minutesByCategory(state.logEntries, "month", now)[cat] ?? 0;
    const rows = entries
      .map((e) => {
        const subCat =
          e.item.subCategory !== undefined ? `${e.item.subCategory} · ` : "";
        return itemRow(e, `${subCat}${cadenceLabel(e.item.cadence)}`);
      })
      .join("");
    const list =
      rows !== ""
        ? `<ul class="items">${rows}</ul>`
        : `<p class="empty" style="color:var(--ink-3); font-size:0.78rem; margin:0.6rem 0 0.4rem">Caught up here for now.</p>`;
    const logForm =
      ui.logPanelCat === cat
        ? `
        <form class="inline-form" data-form="panel-log" data-cat="${esc(cat)}">
          <label>minutes <input type="number" name="minutes" min="1" max="1440" required /></label>
          <label>sub-category <input type="text" name="subCategory" maxlength="60" /></label>
          <label>note <input type="text" name="notes" maxlength="200" /></label>
          <label>tags <input type="text" name="tags" maxlength="120" placeholder="comma, separated" /></label>
          <button class="do" type="submit">Save log</button>
          <button class="do" type="button" data-action="close-forms">Cancel</button>
        </form>`
        : `<p class="paneltools"><button class="do" data-action="open-panel-log" data-cat="${esc(cat)}">Log time…</button></p>`;
    return `
      <section class="panel" style="border-top-color:${catColor(cat, cats)}">
        <header>
          <span class="dot" style="background:${catColor(cat, cats)}"></span>
          <h2>${esc(cat)}</h2>
          <a href="#focus/${encodeURIComponent(cat)}">focus →</a>
        </header>
        <ul class="stats mono" aria-label="${esc(cat)} minutes">
          <li><span class="v">${fmtMin(day)}</span><span class="k micro">today</span></li>
          <li><span class="v">${fmtMin(week)}</span><span class="k micro">week</span></li>
          <li><span class="v">${fmtMin(month)}</span><span class="k micro">month</span></li>
        </ul>
        ${list}
        ${logForm}
      </section>`;
  }

  function planningPanel(): string {
    return `
      <section class="panel planning">
        <header><h2>planning</h2></header>
        <p class="empty">Nothing waiting here yet. Connecting YouTube playlists — with a
        count of videos not yet cycled in — is on the roadmap
        (see <code>docs/PROGRESS.md</code>).</p>
      </section>`;
  }

  function addForm(cats: readonly string[]): string {
    if (!ui.addOpen) return "";
    const datalist = cats.map((c) => `<option value="${esc(c)}"></option>`).join("");
    return `
      <section class="balance">
        <div class="head"><span class="micro">Add an item</span></div>
        <form class="inline-form" data-form="add">
          <label>name <input type="text" name="name" required maxlength="120" /></label>
          <label>category <input type="text" name="category" list="cats" required maxlength="60" /></label>
          <datalist id="cats">${datalist}</datalist>
          <label>sub-category <input type="text" name="subCategory" maxlength="60" /></label>
          <label>cadence <select name="kind">
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
            <option value="one-off">one-off</option>
          </select></label>
          <label>at <input type="time" name="time" /></label>
          <button class="do" type="submit">Add to rotation</button>
          <button class="do" type="button" data-action="close-forms">Cancel</button>
        </form>
      </section>`;
  }

  function firstRun(): string {
    return `
      <section class="firstrun">
        <h2>Nothing in rotation yet</h2>
        <p>cycle-in surfaces what to practice or revisit right now — old skills cycling back
        in, new ones building momentum. Add your first item, import a branching-video, or
        import an event bundle exported from another device.</p>
        <p>
          <button class="do" data-action="open-add">Add an item…</button>
          <button class="do" data-action="import-video">Import a video…</button>
          <button class="do" data-action="import">Import bundle…</button>
        </p>
      </section>`;
  }

  // ── render ───────────────────────────────────────────────────────────────

  function render(): void {
    const now = new Date();
    if (ui.picker !== undefined) {
      renderPicker(ui.picker);
      return;
    }
    if (location.hash === "#history") {
      renderHistory(now);
      return;
    }
    const detailId = itemRoute();
    if (detailId !== undefined) {
      renderItemDetail(detailId);
      return;
    }
    histModel = undefined;
    const focus = focusCategory();
    const cats = categoriesOf(state);
    const selection = selectOptions(state, now, {}, focus);
    const anyItems = Object.values(state.items).some((it) => !it.archived);

    const stripEntries = selection.filter(
      (e) => e.reason === "held" || e.reason === "due-timed"
    );
    const panelEntries = selection.filter(
      (e) => e.reason !== "held" && e.reason !== "due-timed"
    );
    const byCat = new Map<string, SelectionEntry[]>();
    for (const e of panelEntries) {
      const list = byCat.get(e.item.category);
      if (list) list.push(e);
      else byCat.set(e.item.category, [e]);
    }
    const panelCats = focus !== undefined ? [focus] : cats;

    const strip = stripEntries
      .map((e) => {
        const it = e.item;
        const flavor = e.orange
          ? `${cadenceLabel(it.cadence)} — it went by`
          : e.reason === "held"
            ? `${esc(it.category)} — pinned until you release it`
            : cadenceLabel(it.cadence);
        return `
          <div class="card${e.orange ? " overdue" : ""}">
            <span class="dot" style="background:${catColor(it.category, cats)}"></span>
            <span class="what"><a class="itemlink" href="#item/${encodeURIComponent(it.id)}"><b>${esc(it.name)}</b></a><small>${flavor}</small></span>
            ${stepChip(it)}
            <button class="do" data-action="done" data-item="${esc(it.id)}">Done</button>
            <button class="more" data-action="toggle-verbs" data-item="${esc(it.id)}"
              aria-label="More actions for ${esc(it.name)}" aria-expanded="${String(ui.openItem === it.id)}">⋯</button>
            ${verbsFor(it)}
          </div>`;
      })
      .join("");

    const panels = panelCats
      .map((c) => panelFor(c, byCat.get(c) ?? [], cats, now))
      .join("");

    const dateStr = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const focusNav =
      focus !== undefined
        ? `<a href="#" data-action="unfocus">← all categories</a>`
        : "";

    root.innerHTML = `
      <div class="board">
        <div class="top">
          <h1><a href="#" data-action="unfocus">cycle-in</a></h1>
          <span class="date">${esc(dateStr)}${focus !== undefined ? ` · ${esc(focus)} focus` : ` · ${String(selection.length)} up now`}</span>
          <nav>
            ${focusNav}
            <a href="#history">History</a>
            <button data-action="open-add">Add item…</button>
            <button data-action="import-video">Import video…</button>
            <button data-action="export">Export events</button>
            <button data-action="import">Import bundle…</button>
            <input id="import-file" type="file" accept=".json,application/json" hidden />
            <input id="video-file" type="file" accept=".json,application/json" hidden />
          </nav>
        </div>
        <p class="status${ui.statusError ? " error" : ""}" role="status">${esc(ui.status)}</p>
        ${addForm(cats)}
        ${
          anyItems || state.logEntries.length > 0
            ? `
        ${focus === undefined ? balanceBar(cats, now) : ""}
        ${strip !== "" && focus === undefined ? `<div class="strip">${strip}</div>` : ""}
        <div class="panels">${panels}${focus === undefined ? planningPanel() : ""}</div>`
            : firstRun()
        }
        <footer class="page">
          <span>${String(events.length)} events in the log</span>
          <span>list capped at 10 · seeded by the day, stable until midnight</span>
        </footer>
      </div>`;

    recordImpressions(selection, now);
  }

  function renderPicker(p: PickerState): void {
    const cats = categoriesOf(state);
    root.innerHTML = `
      <div class="board">
        <div class="top">
          <h1><a href="#" data-action="close-picker">cycle-in</a></h1>
          <span class="date">import a video</span>
          <nav><button data-action="close-picker">← board</button></nav>
        </div>
        <p class="status${ui.statusError ? " error" : ""}" role="status">${esc(ui.status)}</p>
        ${pickerHtml(p, cats)}
      </div>`;
  }

  /** Targeted refresh of just the node list + step count — leaves the
   * metadata form's typed-in values alone (they live in the DOM, not state). */
  function refreshPickNodes(): void {
    const p = ui.picker;
    if (p === undefined) return;
    const ol = root.querySelector<HTMLElement>("#picknodes");
    if (ol) ol.innerHTML = pickNodesHtml(p);
    const count = root.querySelector<HTMLElement>("#pickcount");
    if (count) count.textContent = String(selectedCount(p));
  }

  function stepCoords(s: BvStep): string {
    if (s.start === undefined) return "";
    return s.end !== undefined
      ? `${fmtClock(s.start)}–${fmtClock(s.end)}`
      : `from ${fmtClock(s.start)}`;
  }

  /** The ordered steps of a BV item, current one highlighted, with jump/advance
   * controls. Empty for a non-BV item. */
  function stepsPanel(item: ItemState): string {
    const p = stepProgress(item);
    if (p === undefined) return "";
    const rows = p.steps
      .map((s, i) => {
        const on = i === p.index;
        const coords = stepCoords(s);
        const ctl = on
          ? `<span class="chip step">current</span>`
          : `<button class="do" data-action="set-step" data-item="${esc(item.id)}" data-node="${esc(s.nodeId)}">go here</button>`;
        return `
          <li class="detstep${on ? " on" : ""}">
            <span class="stepno mono">${String(i + 1)}</span>
            <span class="name"><b>${esc(s.title)}</b>${coords !== "" ? `<small>${esc(coords)}</small>` : ""}</span>
            ${ctl}
          </li>`;
      })
      .join("");
    const advance =
      p.next !== undefined
        ? `<button class="do" data-action="advance" data-item="${esc(item.id)}">Advance to ${esc(p.next.title)} →</button>`
        : `<span class="chip">on the final step</span>`;
    const where =
      p.current !== undefined
        ? `on step ${String(p.index + 1)} of ${String(p.total)}`
        : `${String(p.total)} steps · not started`;
    return `
      <section class="panel steps">
        <header><h2>steps</h2><span class="sub">${where}</span></header>
        <ol class="detsteps">${rows}</ol>
        <p class="paneltools">${advance}</p>
      </section>`;
  }

  /** This item's logged time / check-ins, newest day first. A check-in (an
   * entry carrying a `nodeId`) is labelled with the step it documents. */
  function itemLogList(item: ItemState): string {
    const entries = state.logEntries
      .filter((l) => l.itemId === item.id)
      .sort((a, b) => (a.effectiveDay < b.effectiveDay ? 1 : -1));
    if (entries.length === 0) {
      return `<p class="empty">Nothing logged against this yet.</p>`;
    }
    const stepLabel = new Map(
      (item.bvSource?.steps ?? []).map(
        (s, i) => [s.nodeId, `step ${String(i + 1)} · ${s.title}`] as const
      )
    );
    const rows = entries
      .map((l) => {
        const bits = [
          l.minutes !== undefined ? fmtMin(l.minutes) : "",
          l.reps !== undefined ? `${String(l.reps)} reps` : "",
          l.notes ?? "",
        ]
          .filter((x) => x !== "")
          .map((x) => esc(x))
          .join(" · ");
        const step =
          l.nodeId !== undefined
            ? `<span class="chip step">${esc(stepLabel.get(l.nodeId) ?? "step")}</span>`
            : "";
        // A non-web link (an old entry, or one merged in from another device)
        // is shown inert rather than as an anchor that silently goes nowhere.
        const link =
          l.link === undefined
            ? ""
            : isWebLink(l.link)
              ? ` <a href="${esc(safeHref(l.link))}" target="_blank" rel="noopener noreferrer">link ↗</a>`
              : ` <span class="deadlink" title="${esc(l.link)}">link (not a web address)</span>`;
        return `<li><span class="when mono">${esc(l.effectiveDay)}</span> ${step} <span class="what">${bits}</span>${link}</li>`;
      })
      .join("");
    return `<ul class="detlog">${rows}</ul>`;
  }

  /** The check-in capture form (a `time-logged` with a link + the current
   * step's node id); shown when its item's form is open. */
  function checkinForm(item: ItemState): string {
    const p = stepProgress(item);
    const target =
      p?.current !== undefined
        ? `attaches to step ${String(p.index + 1)} · ${esc(p.current.title)}`
        : "attaches to this time-option";
    return `
      <form class="inline-form" data-form="checkin" data-item="${esc(item.id)}">
        <label>link <input type="url" name="link" required pattern="https?://.*"
          title="a web address starting with http:// or https://" placeholder="https://…" /></label>
        <label>note <input type="text" name="notes" maxlength="200" /></label>
        <label>minutes <input type="number" name="minutes" min="1" max="1440" /></label>
        <button class="do" type="submit">Save check-in</button>
        <button class="do" type="button" data-action="close-forms">Cancel</button>
        <span class="checkin-hint micro">${target}</span>
      </form>`;
  }

  function renderItemDetail(id: string): void {
    const item = state.items[id];
    const topBar = `
      <div class="top">
        <h1><a href="#">cycle-in</a></h1>
        <span class="date">time-option</span>
        <nav><a href="#">← board</a></nav>
      </div>
      <p class="status${ui.statusError ? " error" : ""}" role="status">${esc(ui.status)}</p>`;
    if (item === undefined) {
      root.innerHTML = `
        <div class="board">
          ${topBar}
          <section class="firstrun">
            <h2>Not found</h2>
            <p>That time-option doesn't exist (it may have been removed).</p>
            <p><a href="#">← back to the board</a></p>
          </section>
        </div>`;
      return;
    }
    const cats = categoriesOf(state);
    const sub =
      item.subCategory !== undefined ? ` · ${esc(item.subCategory)}` : "";
    const holdVerb = item.held
      ? `<button class="do" data-action="release" data-item="${esc(item.id)}">Release hold</button>`
      : `<button class="do" data-action="hold" data-item="${esc(item.id)}">Hold on list</button>`;
    const archiveVerb = item.archived
      ? `<button class="do" data-action="unarchive" data-item="${esc(item.id)}">Unarchive</button>`
      : `<button class="do" data-action="archive" data-item="${esc(item.id)}">Archive</button>`;
    const show =
      item.bvSource !== undefined
        ? `<span class="sub">from ${esc(item.bvSource.showTitle)}</span>`
        : "";
    root.innerHTML = `
      <div class="board">
        ${topBar}
        <section class="balance detail">
          <div class="head">
            <span class="micro">Time-option</span>
            ${item.archived ? `<span class="chip">archived</span>` : ""}
          </div>
          <h2 class="detname">
            <span class="dot" style="background:${catColor(item.category, cats)}"></span>
            ${esc(item.name)}
          </h2>
          <p class="detmeta">${esc(item.category)}${sub} · ${esc(cadenceLabel(item.cadence))} ${show}</p>
          <div class="allverbs">
            <button class="do" data-action="done" data-item="${esc(item.id)}">Done</button>
            <button class="do" data-action="start" data-item="${esc(item.id)}">Start</button>
            ${holdVerb}
            <button class="do" data-action="open-log" data-item="${esc(item.id)}">Log time…</button>
            <button class="do" data-action="open-cadence" data-item="${esc(item.id)}">Change cadence…</button>
            ${archiveVerb}
          </div>
          ${verbsFor(item)}
        </section>
        ${stepsPanel(item)}
        <section class="panel">
          <header>
            <h2>logged time &amp; check-ins</h2>
            ${
              ui.checkinItem === item.id
                ? ""
                : `<button class="do" data-action="open-checkin" data-item="${esc(item.id)}">Add check-in…</button>`
            }
          </header>
          ${ui.checkinItem === item.id ? checkinForm(item) : ""}
          ${itemLogList(item)}
        </section>
      </div>`;
  }

  function renderHistory(now: Date): void {
    const cats = categoriesOf(state);
    const model = historyModel(state, cats, ui.histPeriod, ui.histFocus, now);
    histModel = model;
    const dateStr = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    root.innerHTML = `
      <div class="board">
        <div class="top">
          <h1><a href="#">cycle-in</a></h1>
          <span class="date">${esc(dateStr)} · history</span>
          <nav>
            <a href="#">← board</a>
            <button data-action="export">Export events</button>
            <button data-action="import">Import bundle…</button>
            <input id="import-file" type="file" accept=".json,application/json" hidden />
          </nav>
        </div>
        <p class="status${ui.statusError ? " error" : ""}" role="status">${esc(ui.status)}</p>
        ${historyHtml(model)}
        <footer class="page">
          <span>${String(events.length)} events in the log</span>
          <span>same event log as the board — an entry's category is what balance weighs; tags are extra lenses</span>
        </footer>
      </div>`;
    // The chart needs the container's rendered width, so it lands post-innerHTML.
    const chart = root.querySelector<HTMLElement>("#hist-chart");
    if (chart) chart.innerHTML = chartSvg(model, chart.clientWidth || 640);
  }

  function showHistTip(col: Element): void {
    const tip = root.querySelector<HTMLElement>("#hist-tip");
    if (!tip || histModel === undefined) return;
    const i = Number(col.getAttribute("data-i"));
    if (!Number.isInteger(i)) return;
    tip.innerHTML = tooltipHtml(histModel, i);
    tip.style.display = "block";
    const wrap = tip.parentElement;
    const ax = Number(col.getAttribute("data-ax"));
    const ay = Number(col.getAttribute("data-ay"));
    let x = ax + 12;
    if (wrap && x + tip.offsetWidth > wrap.clientWidth) x = ax - tip.offsetWidth - 12;
    tip.style.left = `${String(Math.max(0, x))}px`;
    tip.style.top = `${String(Math.max(0, ay - 8))}px`;
  }

  function hideHistTip(): void {
    const tip = root.querySelector<HTMLElement>("#hist-tip");
    if (tip) tip.style.display = "none";
  }

  /** Note which items were actually shown (deduped per item per day by the
   * reducer; we also avoid appending duplicates in the first place). */
  function recordImpressions(selection: SelectionEntry[], now: Date): void {
    const today = dayKey(now);
    const seen = new Set(
      state.impressions
        .filter((i) => i.date === today)
        .map((i) => i.itemId)
    );
    const fresh = selection.filter((e) => !seen.has(e.item.id));
    if (fresh.length === 0) return;
    void (async () => {
      for (const e of fresh) {
        const imp = mkEvent({
          kind: "impression-shown",
          itemId: e.item.id,
          date: today,
        });
        await store.append(imp);
        events.push(imp);
      }
      state = reduce(events);
    })();
  }

  // ── actions ──────────────────────────────────────────────────────────────

  function closeForms(): void {
    delete ui.openItem;
    delete ui.logItem;
    delete ui.cadenceItem;
    delete ui.checkinItem;
    delete ui.logPanelCat;
    ui.addOpen = false;
  }

  function tomorrow(now: Date): string {
    const d = fromDayKey(dayKey(now));
    d.setDate(d.getDate() + 1);
    return dayKey(d);
  }

  function doExport(): void {
    const blob = new Blob([serializeBundle(events, new Date().toISOString())], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cycle-in-events-${dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    say(`exported ${String(events.length)} events`);
  }

  async function loadVideoConfig(file: File): Promise<void> {
    try {
      const show = parseBvConfig(await file.text());
      ui.picker = initPicker(show);
      say(`loaded "${show.title}" — choose which nodes are steps`);
    } catch (err) {
      delete ui.picker;
      say(
        `couldn't read that config: ${err instanceof Error ? err.message : String(err)}`,
        true
      );
    }
  }

  async function doImport(file: File): Promise<void> {
    try {
      const incoming = parseBundle(await file.text());
      const known = new Set(events.map((e) => e.id));
      let added = 0;
      for (const e of incoming) {
        if (known.has(e.id)) continue;
        await store.append(e);
        events.push(e);
        added++;
      }
      state = reduce(events);
      say(`imported ${String(added)} new of ${String(incoming.length)} in bundle`);
    } catch (err) {
      say(
        `import failed: ${err instanceof Error ? err.message : String(err)}`,
        true
      );
    }
  }

  root.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset["action"] ?? "";
    const itemId = target.dataset["item"];
    const cat = target.dataset["cat"];
    const now = new Date();
    const nameOf = (id: string | undefined): string =>
      (id !== undefined ? state.items[id]?.name : undefined) ?? "that";
    /** Every verb reports what it did. The status line is shared and sticky, so
     * a verb that says nothing would leave the *previous* message standing —
     * which reads as confirmation of the wrong action. */
    const run = (input: EventInput, message: string): void => {
      closeForms();
      ui.status = message;
      ui.statusError = false;
      void dispatch(input); // dispatch re-renders, picking up the status above
    };
    /** Walking steps is a repeated action — keep the expanded verb row open so
     * advancing several steps from the board doesn't mean re-opening ⋯ each
     * time. (The detail view's steps panel is always visible, so this is a
     * no-op there.) */
    const runKeepingVerbs = (input: EventInput, message: string): void => {
      const open = ui.openItem;
      closeForms();
      if (open !== undefined) ui.openItem = open;
      ui.status = message;
      ui.statusError = false;
      void dispatch(input);
    };

    switch (action) {
      case "done":
        if (itemId !== undefined)
          run(
            { kind: "item-done", itemId, effectiveDate: dayKey(now) },
            `marked "${nameOf(itemId)}" done for today`
          );
        break;
      case "start":
        if (itemId !== undefined)
          run(
            { kind: "item-started", itemId },
            `started "${nameOf(itemId)}" — mark it done when you finish`
          );
        break;
      case "hold":
        if (itemId !== undefined)
          run(
            { kind: "item-held", itemId },
            `holding "${nameOf(itemId)}" on the list until you release it`
          );
        break;
      case "release":
        if (itemId !== undefined)
          run(
            { kind: "item-released", itemId },
            `released "${nameOf(itemId)}" — back on its normal cadence`
          );
        break;
      case "dismiss":
        if (itemId !== undefined)
          run(
            { kind: "dismissed-today", itemId, date: dayKey(now) },
            `"${nameOf(itemId)}" is off today's list — back tomorrow`
          );
        break;
      case "bump":
        if (itemId !== undefined)
          run(
            { kind: "priority-bumped", itemId, forDate: tomorrow(now) },
            `"${nameOf(itemId)}" is bumped up for tomorrow`
          );
        break;
      case "archive":
        if (itemId !== undefined)
          run(
            { kind: "item-archived", itemId },
            `archived "${nameOf(itemId)}" — its logged time is kept`
          );
        break;
      case "advance": {
        if (itemId === undefined) break;
        const it = state.items[itemId];
        const p = it !== undefined ? stepProgress(it) : undefined;
        // `index` is the *current* step (-1 before the first advance), so the
        // step being moved to displays as `index + 2`.
        if (p?.next !== undefined)
          runKeepingVerbs(
            { kind: "bv-node-advanced", itemId, nodeId: p.next.nodeId },
            `now on step ${String(p.index + 2)}/${String(p.total)} — ${p.next.title}`
          );
        break;
      }
      case "set-step": {
        const node = target.dataset["node"];
        if (itemId === undefined || node === undefined) break;
        const it = state.items[itemId];
        const at =
          it !== undefined
            ? (stepProgress(it)?.steps.findIndex((s) => s.nodeId === node) ?? -1)
            : -1;
        runKeepingVerbs(
          { kind: "bv-node-advanced", itemId, nodeId: node },
          at >= 0 ? `jumped to step ${String(at + 1)}` : "moved to that step"
        );
        break;
      }
      case "unarchive":
        if (itemId !== undefined)
          run(
            { kind: "item-unarchived", itemId },
            `unarchived "${nameOf(itemId)}" — it's back in rotation`
          );
        break;
      case "toggle-verbs": {
        const open = ui.openItem === itemId;
        closeForms();
        if (!open && itemId !== undefined) ui.openItem = itemId;
        render();
        break;
      }
      case "open-log":
        closeForms();
        if (itemId !== undefined) ui.logItem = itemId;
        render();
        break;
      case "open-cadence":
        closeForms();
        if (itemId !== undefined) ui.cadenceItem = itemId;
        render();
        break;
      case "open-checkin":
        closeForms();
        if (itemId !== undefined) ui.checkinItem = itemId;
        render();
        break;
      case "open-panel-log":
        closeForms();
        if (cat !== undefined) ui.logPanelCat = cat;
        render();
        break;
      case "open-add":
        closeForms();
        ui.addOpen = true;
        render();
        break;
      case "close-forms":
        closeForms();
        render();
        break;
      case "export":
        doExport();
        break;
      case "import":
        root.querySelector<HTMLInputElement>("#import-file")?.click();
        break;
      case "import-video":
        root.querySelector<HTMLInputElement>("#video-file")?.click();
        break;
      case "close-picker":
        e.preventDefault();
        delete ui.picker;
        closeForms();
        render();
        break;
      case "pick-up":
      case "pick-down": {
        const node = target.dataset["node"];
        if (ui.picker !== undefined && node !== undefined) {
          moveNode(ui.picker, node, action === "pick-up" ? -1 : 1);
          refreshPickNodes();
        }
        break;
      }
      case "unfocus":
        e.preventDefault();
        location.hash = "";
        break;
      case "hist-gran": {
        const g = target.dataset["g"] as Period | undefined;
        if (g !== undefined) {
          ui.histPeriod = g;
          render();
        }
        break;
      }
      default:
        break;
    }
  });

  root.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.dataset["action"] === "pick-toggle") {
      const node = input.dataset["node"];
      if (ui.picker !== undefined && node !== undefined) {
        toggleNode(ui.picker, node);
        refreshPickNodes();
      }
      return;
    }
    if (input.id === "hist-focus") {
      ui.histFocus = input.value;
      render();
      return;
    }
    if (input.id === "video-file") {
      const vf = input.files?.[0];
      input.value = ""; // let the same file be re-picked later
      if (vf) void loadVideoConfig(vf);
      return;
    }
    if (input.id !== "import-file") return;
    const f = input.files?.[0];
    if (f) {
      void (async () => {
        await doImport(f);
        closeForms();
        render();
      })();
    }
  });

  root.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement;
    const kind = form.dataset["form"];
    if (kind === undefined) return;
    e.preventDefault();
    const data = new FormData(form);
    const str = (name: string): string => {
      const v = data.get(name);
      return typeof v === "string" ? v.trim() : "";
    };
    const num = (name: string): number | undefined => {
      const v = Number(str(name));
      return Number.isFinite(v) && v > 0 ? v : undefined;
    };
    const timeOf = (name: string): Cadence["atTime"] => {
      const m = /^(\d{2}):(\d{2})$/.exec(str(name));
      return m
        ? { hour: Number(m[1]), minute: Number(m[2]) }
        : undefined;
    };
    const now = new Date();

    if (kind === "log" || kind === "panel-log") {
      const minutes = num("minutes");
      if (minutes === undefined) return;
      const itemId = form.dataset["item"];
      const item = itemId !== undefined ? state.items[itemId] : undefined;
      const category = item?.category ?? form.dataset["cat"] ?? "";
      if (category === "") return;
      const subCategory =
        item?.subCategory ?? (str("subCategory") !== "" ? str("subCategory") : undefined);
      const notes = str("notes") !== "" ? str("notes") : undefined;
      const tags = [
        ...new Set(
          str("tags")
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== "")
        ),
      ];
      closeForms();
      // Status set before dispatch — dispatch renders, so this lands in one
      // pass (and no verb leaves the previous message standing).
      ui.status = `logged ${fmtMin(minutes)} to ${item?.name ?? category}`;
      ui.statusError = false;
      void dispatch({
        kind: "time-logged",
        entryId: crypto.randomUUID(),
        category,
        effectiveDate: dayKey(now),
        minutes,
        ...(subCategory !== undefined ? { subCategory } : {}),
        ...(tags.length > 0 ? { tags } : {}),
        ...(item !== undefined ? { itemId: item.id } : {}),
        ...(notes !== undefined ? { notes } : {}),
      });
    } else if (kind === "cadence") {
      const itemId = form.dataset["item"];
      if (itemId === undefined) return;
      const cadKind = str("kind") as Cadence["kind"];
      const atTime = timeOf("time");
      const cadName = state.items[itemId]?.name ?? "that";
      closeForms();
      const cad: Cadence = {
        kind: cadKind,
        ...(atTime !== undefined ? { atTime } : {}),
      };
      ui.status = `"${cadName}" is now ${cadenceLabel(cad)}`;
      ui.statusError = false;
      void dispatch({ kind: "cadence-changed", itemId, cadence: cad });
    } else if (kind === "add") {
      const name = str("name");
      const category = str("category");
      if (name === "" || category === "") return;
      const subCategory = str("subCategory") !== "" ? str("subCategory") : undefined;
      const atTime = timeOf("time");
      closeForms();
      ui.status = `added "${name}" to ${category}`;
      ui.statusError = false;
      void dispatch({
        kind: "item-added",
        item: {
          id: crypto.randomUUID(),
          name,
          category,
          cadence: {
            kind: str("kind") as Cadence["kind"],
            ...(atTime !== undefined ? { atTime } : {}),
          },
          ...(subCategory !== undefined ? { subCategory } : {}),
        },
      });
    } else if (kind === "picker") {
      const p = ui.picker;
      if (p === undefined) return;
      const name = str("name");
      const category = str("category");
      if (name === "" || category === "") return;
      const subCategory =
        str("subCategory") !== "" ? str("subCategory") : undefined;
      const atTime = timeOf("time");
      const steps = pickerSteps(p);
      delete ui.picker;
      closeForms();
      void dispatch({
        kind: "item-added",
        item: {
          id: crypto.randomUUID(),
          name,
          category,
          cadence: {
            kind: str("kind") as Cadence["kind"],
            ...(atTime !== undefined ? { atTime } : {}),
          },
          ...(subCategory !== undefined ? { subCategory } : {}),
          // Always carried, even with no steps chosen: this came from a video,
          // and the provenance is worth keeping (an empty `steps` just means
          // "no step sequence" — `stepProgress` returns undefined for it).
          bvSource: {
            showId: slugify(p.show.title),
            showTitle: p.show.title,
            steps,
          },
        },
      });
      const n = steps.length;
      say(
        n > 0
          ? `added "${name}" — ${String(n)} step${n === 1 ? "" : "s"}, starting at step 1`
          : `added "${name}" — no steps chosen, so it has no step sequence`
      );
    } else if (kind === "checkin") {
      const itemId = form.dataset["item"];
      const item = itemId !== undefined ? state.items[itemId] : undefined;
      const link = str("link");
      if (item === undefined || link === "") return;
      // `type="url"` happily accepts `javascript:`/`data:`/`mailto:`, so the
      // http(s)-only rule is enforced here too. The form stays open (and its
      // typed-in values with it) so the link can be fixed.
      if (!isWebLink(link)) {
        sayInPlace("a check-in link needs to start with http:// or https://");
        return;
      }
      const minutes = num("minutes");
      const notes = str("notes") !== "" ? str("notes") : undefined;
      const nodeId = item.currentNodeId;
      closeForms();
      void dispatch({
        kind: "time-logged",
        entryId: crypto.randomUUID(),
        category: item.category,
        itemId: item.id,
        effectiveDate: dayKey(now),
        link,
        ...(nodeId !== undefined ? { nodeId } : {}),
        ...(minutes !== undefined ? { minutes } : {}),
        ...(item.subCategory !== undefined
          ? { subCategory: item.subCategory }
          : {}),
        ...(notes !== undefined ? { notes } : {}),
      });
      say("check-in saved");
    }
  });

  // History chart tooltips: enhance, never gate — the entries table below
  // carries the same values. Same content on keyboard focus as on hover.
  root.addEventListener("pointerover", (e) => {
    const col = (e.target as Element).closest(".col");
    if (col) showHistTip(col);
    else hideHistTip();
  });
  root.addEventListener("pointerout", (e) => {
    const to = e.relatedTarget as Element | null;
    if (!to || !to.closest(".col")) hideHistTip();
  });
  root.addEventListener("focusin", (e) => {
    const col = (e.target as Element).closest(".col");
    if (col) showHistTip(col);
  });
  root.addEventListener("focusout", () => {
    hideHistTip();
  });

  let resizeTimer: number | undefined;
  window.addEventListener("resize", () => {
    if (histModel === undefined) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const chart = root.querySelector<HTMLElement>("#hist-chart");
      if (chart && histModel !== undefined) {
        chart.innerHTML = chartSvg(histModel, chart.clientWidth || 640);
      }
    }, 120);
  });

  window.addEventListener("hashchange", () => {
    closeForms();
    render();
  });

  render();
}
