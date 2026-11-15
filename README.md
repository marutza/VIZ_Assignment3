# The Boyband Blueprint

An interactive, radial visualization of formula strength and exceptions across 55 boybands and 234 members in `boys.csv`.

## Run

Double-click `index.html` — it works directly from disk, no server needed.

The source data in `boys.csv` is embedded into `boys-data.js` by a small build step, so the browser never has to fetch a local file. If you edit `boys.csv`, regenerate `boys-data.js`:

```powershell
node -e "const fs=require('fs');const s=fs.readFileSync('boys.csv','utf8');fs.writeFileSync('boys-data.js','/* Generated from boys.csv. */\nwindow.BOYS_CSV = '+JSON.stringify(s)+';\n');"
```

Running it through a server (`python -m http.server 8123`, or `Open Assignment3.cmd`) also still works.

## Files

- `index.html` — page structure, reading guide, marks/channels table, chart, evidence ledger, reflection and limitations
- `styles.css` — editorial layout, legends, responsive states and SVG styling
- `main.js` — data preparation, radial geometry, encodings, confidence logic and interaction
- `boys.csv` — source dataset
- `boys-data.js` — embedded dataset for direct file:// use
- `d3.v7.min.js` — local D3 build

## Design summary

**Question:** How tightly did each band enforce a visual formula — and which members broke it?

**Encodings**

1. Wedge depth and outer arc length — band size.
2. Four metric-coloured ring fills — repetition of hair colour, hair length, shirt colour and trouser colour.
3. Ring hue — which metric is being read; 25/50/75% ticks make the scale countable.
4. Member dots — hair colour (fill) and height (area); missing height is a visible hollow ring with a hair-colour centre pip.
5. Confidence badge — solid for 5+ members, open plus text for 3–4-member low-confidence scores.
6. Outer arc colour — median birth decade, used as secondary context.

The angle is a categorical slot for each band. The exact values of all four rings form a 0–100 formula-strength index. Groups are ordered by median birth year by default and can be reordered by formula rank.

**Interactions**

- Hover a wedge to push that slice outward smoothly and read its rings; other slices stay at full strength.
- Click a wedge (or ledger row) to pull that slice forward and open a floating member card with off-formula traits.
- Reorder by chronology or formula rank.
- Filter by birth decade or to low-confidence bands.
- Spotlight the ten strongest formulas.
- Keyboard: focus a wedge, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close.

## Method and limits

Each ring is the largest repeated value divided by the members with a documented value. The index is the mean of the four rings. Undocumented values are excluded from the denominator so missing fields do not count as agreement.

Birth decade is a proxy for era because the dataset has no debut dates. Samples are uneven (9 bands born in the 1960s, 4 in the 1990s, 6 undated), so the downward pattern is secondary and suggestive rather than statistical. The index also cannot see silhouette, pose or the difference between a shared black outfit and a shared silver one.