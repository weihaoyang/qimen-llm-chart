"""Compare Celestine house cusps with Swiss Ephemeris over a reproducible grid.

Run from the repository root after npm ci / dependency patching, with Node and
pyswisseph==2.10.3.2 available. The reference uses the house system actually
returned by Celestine, so this compares values, not the fallback selection.
"""
import json
import subprocess

import swisseph as swe


NODE = r"""
import { calculateChart } from 'celestine';
const result = [];
for (const year of [1980, 2000, 2050])
  for (const month of [1, 6, 10])
    for (const latitude of [-89.95, -70, -60, 0, 30, 60, 70, 89.95])
      for (const longitude of [-120, 0, 121.47]) {
        const c = calculateChart({ year, month, day: 1, hour: 12, minute: 0,
          second: 0, timezone: 0, latitude, longitude });
        result.push({ year, month, latitude, longitude, system: c.houses.systemName,
          cusps: c.houses.cusps.map(cusp => cusp.longitude) });
      }
console.log(JSON.stringify(result));
"""

systems = {"Placidus": b"P", "Porphyry": b"O", "Whole Sign": b"W"}
rows = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", NODE], text=True))
differences = []
for row in rows:
    jd = swe.julday(row["year"], row["month"], 1, 12)
    reference = swe.houses(jd, row["latitude"], row["longitude"], systems[row["system"]])[0]
    assert len(row["cusps"]) == len(reference) == 12
    for index, (actual, expected) in enumerate(zip(row["cusps"], reference), 1):
        difference = abs((actual - expected + 180) % 360 - 180)
        differences.append((difference, row, index, actual, expected))

worst = max(differences, key=lambda entry: entry[0])
print(f"Swiss Ephemeris {swe.version}; {len(rows)} charts; {len(differences)} cusps")
print(f"maximum difference {worst[0]:.9f} degrees; case {worst[1]}, cusp {worst[2]}; "
      f"Celestine {worst[3]:.9f}, Swiss {worst[4]:.9f}")
assert worst[0] < 0.02, "A sampled cusp exceeds 0.02 degrees; inspect the model and case."
