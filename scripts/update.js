// Backfill every missing week up to now, then rebuild aggregates.
// Idempotent: only writes week files that don't exist yet. Safe to run daily.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeWeek } from "./scrape.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEEK_DIR = join(ROOT, "week");
const FIRST_WEEK = [2022, 29]; // earliest week billboardth.com serves
const DELAY_MS = 1500;
const MAX_CONSECUTIVE_MISSES = 8; // tolerate interior gaps; stop scanning the future

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ISO week helpers ----------------------------------------------------------
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return [t.getUTCFullYear(), week];
}
function mondayOf(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monWeek1 = new Date(jan4);
  monWeek1.setUTCDate(jan4.getUTCDate() - day + 1);
  const d = new Date(monWeek1);
  d.setUTCDate(monWeek1.getUTCDate() + (week - 1) * 7);
  return d;
}
function* isoWeeks([startY, startW], end) {
  let [y, w] = [startY, startW];
  const [ey, ew] = isoWeek(end);
  while (y < ey || (y === ey && w <= ew)) {
    yield `${y}-W${String(w).padStart(2, "0")}`;
    const next = mondayOf(y, w);
    next.setUTCDate(next.getUTCDate() + 7);
    [y, w] = isoWeek(next);
  }
}

// ------------------------------------------------------------------------
async function backfill() {
  mkdirSync(WEEK_DIR, { recursive: true });
  const added = [];
  let misses = 0;
  for (const week of isoWeeks(FIRST_WEEK, new Date())) {
    const path = join(WEEK_DIR, `${week}.json`);
    if (existsSync(path)) {
      misses = 0;
      continue;
    }
    const snap = await scrapeWeek(week);
    await sleep(DELAY_MS);
    if (snap === null) {
      misses += 1;
      console.log(`${week}: not available`);
      if (misses >= MAX_CONSECUTIVE_MISSES) {
        console.log(`stopping after ${misses} consecutive misses`);
        break;
      }
      continue;
    }
    misses = 0;
    writeFileSync(path, JSON.stringify(snap, null, 2) + "\n");
    added.push(week);
    console.log(`${week}: saved`);
  }
  return added;
}

function rebuildAggregates() {
  const files = readdirSync(WEEK_DIR).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) return;
  const snaps = files.map((f) => JSON.parse(readFileSync(join(WEEK_DIR, f), "utf8")));
  writeFileSync(join(ROOT, "all.json"), JSON.stringify(snaps, null, 2) + "\n");
  writeFileSync(join(ROOT, "latest.json"), JSON.stringify(snaps.at(-1), null, 2) + "\n");
  console.log(`aggregates: ${snaps.length} weeks, latest ${snaps.at(-1).week}`);
}

const added = await backfill();
rebuildAggregates();
console.log(`done, ${added.length} new week(s)`);
