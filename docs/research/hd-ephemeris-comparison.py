"""Recompute independent reference longitudes; requires pyswisseph 2.10.3.2.

Swiss Ephemeris is used only for this research comparison, not by the app.
Run: python docs/research/hd-ephemeris-comparison.py
"""
import swisseph as swe

PLANETS = {
    "sun": swe.SUN, "moon": swe.MOON, "mercury": swe.MERCURY,
    "venus": swe.VENUS, "mars": swe.MARS, "jupiter": swe.JUPITER,
    "saturn": swe.SATURN, "uranus": swe.URANUS, "neptune": swe.NEPTUNE,
    "pluto": swe.PLUTO,
}
DATES = [2415020.5, 2451545.0, 2460000.0, 2488069.5, 2488069.513888889, 2488069.7813657406]

print("Swiss Ephemeris", swe.version, "geocentric apparent tropical, Moshier")
for jd in DATES:
    longitudes = {name: round(swe.calc_ut(jd, body, swe.FLG_MOSEPH)[0][0], 9) for name, body in PLANETS.items()}
    print(jd, longitudes)
