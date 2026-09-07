// Scrape one week of the billboardth.com Top Thai Song chart.
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const URL = "https://billboardth.com/thai_song";

const toInt = (s) => {
  const m = String(s ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
};
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// Return a snapshot object for an ISO week (e.g. "2022-W29"), or null if the
// site has no chart for that week. Throws if the page is present but malformed.
export async function scrapeWeek(week) {
  const res = await fetch(`${URL}?week=${encodeURIComponent(week)}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`${week}: HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());

  const rows = $("ul.list-group-flush > li:not(.first)").toArray();
  if (rows.length === 0) return null; // week not published yet

  const entries = [];
  const seenPos = new Set();
  for (const li of rows) {
    const el = $(li);
    const thisWeek = toInt(el.find(".num").text());
    // Some weeks render the whole 100-row list twice; stop at the repeat.
    if (seenPos.has(thisWeek)) break;
    seenPos.add(thisWeek);

    const peak = toInt(el.find(".peak").text());
    const href = el.find(".share a").attr("href") || "";
    const idMatch = href.match(/songId=([^&"]+)/);
    entries.push({
      song: clean(el.find(".title").text()),
      artist: clean(el.find(".artist").text()),
      this_week: thisWeek,
      last_week: toInt(el.find(".last").text()),
      peak_position: peak ?? thisWeek,
      weeks_on_chart: toInt(el.find(".cntWeek").text()),
      // opaque id from the source URL param; numeric on old weeks, alphanumeric
      // (e.g. "SG...") since ~2026. Kept as a string throughout.
      song_id: idMatch ? idMatch[1] : null,
    });
  }

  if (entries.length !== 100)
    throw new Error(`${week}: got ${entries.length} entries, expected 100`);

  const ids = entries.map((e) => e.song_id).filter((x) => x !== null);
  if (new Set(ids).size !== ids.length) {
    // billboardth.com occasionally lists the same song at two positions
    // (e.g. 2023-W03). Keep the source as-is, just flag it.
    const dupes = [...new Set(ids.filter((i) => ids.indexOf(i) !== ids.lastIndexOf(i)))];
    console.error(`${week}: warning, duplicate song_id(s) ${dupes.join(", ")}`);
  }

  return {
    week,
    source_label: clean($(".week").first().text()),
    data: entries,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const week = process.argv[2];
  if (!week) {
    console.error("usage: node scripts/scrape.js YYYY-Www");
    process.exit(2);
  }
  console.log(JSON.stringify(await scrapeWeek(week), null, 2));
}
