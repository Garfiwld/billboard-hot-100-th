// Offline checks for the parsing/derivation logic. Run: node scripts/test_scrape.js
import assert from "node:assert/strict";
import * as cheerio from "cheerio";

const toInt = (s) => {
  const m = String(s ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
};
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function parse(html) {
  const $ = cheerio.load(html);
  const out = [];
  const seen = new Set();
  for (const li of $("ul.list-group-flush > li:not(.first)").toArray()) {
    const el = $(li);
    const tw = toInt(el.find(".num").text());
    if (seen.has(tw)) break;
    seen.add(tw);
    const peak = toInt(el.find(".peak").text());
    out.push({
      song: clean(el.find(".title").text()),
      artist: clean(el.find(".artist").text()),
      this_week: tw,
      last_week: toInt(el.find(".last").text()),
      peak_position: peak ?? tw,
      weeks_on_chart: toInt(el.find(".cntWeek").text()),
    });
  }
  return out;
}

const ROW = `
<ul class="list-group-flush">
  <li class="first"><div class="num">THIS WEEK</div></li>
  <li><div class="num"> 1 . </div><div class="chart_tit"><div class="title"> foo baa </div>
      <div class="artist"> Foo &amp; Bar </div></div>
      <div class="last"><span></span></div><div class="peak"><span></span></div>
      <div class="cntWeek"><span> 1 </span></div>
      <div class="share"><a href="detail?type=songchart&songId=111">x</a></div></li>
  <li><div class="num"> 2 . </div><div class="chart_tit"><div class="title"> Baz </div>
      <div class="artist"> Qux </div></div>
      <div class="last"><span> 5 </span></div><div class="peak"><span> 3 </span></div>
      <div class="cntWeek"><span> 9 </span></div>
      <div class="share"><a href="detail?type=songchart&songId=222">x</a></div></li>
</ul>`;

const e = parse(ROW);
assert.deepEqual(e[0], {
  song: "foo baa",
  artist: "Foo & Bar",
  this_week: 1,
  last_week: null,
  peak_position: 1, // blank peak -> this_week
  weeks_on_chart: 1,
});
assert.equal(e[1].last_week, 5);
assert.equal(e[1].peak_position, 3);

// doubled list collapses to one pass
const body = ROW.replace(/<\/?ul[^>]*>/g, "");
assert.equal(parse(`<ul class="list-group-flush">${body}${body}</ul>`).length, 2);

// empty page -> no rows
assert.equal(cheerio.load("<html></html>")("ul.list-group-flush > li:not(.first)").length, 0);

console.log("ok");
