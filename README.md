# The Boyband Blueprint

An interactive, radial visualization of visual uniformity across 55 boybands and 234 members in `boys.csv`.

## Run

Double-click `index.html` — it works directly from disk, no server needed.

The source data in `boys.csv` is embedded into `boys-data.js` by a small build step, so the browser never has to fetch a local file. If you edit `boys.csv`, regenerate `boys-data.js`:

```powershell
node -e "const fs=require('fs');const s=fs.readFileSync('boys.csv','utf8');fs.writeFileSync('boys-data.js','/* Generated from boys.csv. */\nwindow.BOYS_CSV = '+JSON.stringify(s)+';\n');"
```

Running it through a server (`python -m http.server 8123`, or `Open Assignment3.cmd`) also still works.

## Files

- `index.html` — page structure, reading guide, chart, evidence ledger and design reflection
- `styles.css` — editorial layout, legends, responsive states and SVG styling
- `main.js` — data preparation, radial geometry, encodings and interaction
- `boys.csv` — source dataset
- `d3.v7.min.js` — local D3 build

## Design summary

**Question:** Does visual conformity fall as the boyband moves from the 1960s to the 1990s?

**Encodings**

1. Wedge depth and outer arc length — band size.
2. Four concentric ring fills — the share of members sharing a hair colour, hair length, shirt colour and trouser colour.
3. Outer arc colour — median birth decade.
4. Member dots — hair colour (colour) and height (area); hollow dots have no listed height.

The angle is a categorical slot for each band. The exact values of all four rings form a 0–100 uniformity index. Groups are ordered by median birth year by default and can be reordered by index.

**Interactions**

- Hover a wedge to isolate it and read its rings.
- Click a wedge (or ledger row) to pull that slice forward and open a floating member card with off-formula traits.
- Reorder by chronology or uniformity rank.
- Filter by birth decade.
- Spotlight the ten most uniform bands.
- Keyboard: focus a wedge, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close.

## Method and limits

Each ring is the largest repeated value divided by the members with a documented value. The index is the mean of the four rings. Undocumented values are excluded from the denominator so missing fields do not count as agreement.

Birth decade is a proxy for era because the dataset has no debut dates. Samples are uneven (9 bands born in the 1960s, 4 in the 1990s, 6 undated), so the downward trend is suggestive rather than statistical. The index also cannot see silhouette, pose or the difference between a shared black outfit and a shared silver one.