<h1 align="center">
    <div>Historic Billboard Thailand Top Thai Song Data</div>
</h1>

This repository provides JSON files for every Billboard Thailand "Top Thai Song"
chart, scraped from [billboardth.com](https://billboardth.com/thai_song) and
updated automatically.

## Data Access Methods

**Current Chart:**
```
https://raw.githubusercontent.com/<user>/billboard-hot-100-th/main/latest.json
```

**Specific Week:**
```
https://raw.githubusercontent.com/<user>/billboard-hot-100-th/main/week/<WEEK>.json
```
(Use `YYYY-Www` ISO week format, e.g. `2022-W29`; see `week/` for available weeks)

**All Historical Charts:**
```
https://raw.githubusercontent.com/<user>/billboard-hot-100-th/main/all.json
```

## Data Structure

Responses contain chart objects with this format:

```javascript
{
    "week": String,
    "source_label": String,
    "data": [
        {
            "song": String,
            "artist": String,
            "this_week": Number,
            "last_week": Number || null,
            "peak_position": Number,
            "weeks_on_chart": Number,
            "song_id": String || null
        }
    ]
}
```

**Field Definitions:**
- `week`: ISO week (`YYYY-Www`)
- `source_label`: Date-range label as printed on billboardth.com (format varies over time)
- `data`: Array of 100 song entries
- `song`: Track title (Thai or Latin script)
- `artist`: Performer name
- `this_week`: Current ranking
- `last_week`: Previous week's position or null (new / re-entry)
- `peak_position`: Highest rank achieved (falls back to `this_week` when the site leaves it blank)
- `weeks_on_chart`: Duration on chart
- `song_id`: billboardth.com's stable song id — a more reliable join key than the title

Coverage starts at `2022-W29`, the earliest week the site serves. A few interior
weeks are absent because billboardth.com does not publish.
