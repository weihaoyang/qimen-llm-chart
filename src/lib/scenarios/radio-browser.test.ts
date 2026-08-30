import { describe, expect, it } from "vitest";
import { normalizeRadioBrowserStation, publicHttpsUrl } from "./radio-browser";

describe("Radio Browser normalization", () => {
  it("keeps usable HTTPS audio and strips unsafe metadata", () => {
    expect(normalizeRadioBrowserStation({ stationuuid:"123e4567-e89b-12d3-a456-426614174000", name:" Test  FM ", geo_lat:31.2, geo_long:121.5, url_resolved:"https://radio.example.com/live.mp3", homepage:"https://radio.example.com", tags:"news,talk", language:"Chinese", country:"China", countrycode:"CN", codec:"MP3", bitrate:128, lastcheckok:1, hls:0 })).toMatchObject({ name:"Test FM", countryCode:"CN", codec:"MP3", bitrate:128 });
  });

  it("rejects private targets and non-HTTPS streams", () => {
    expect(publicHttpsUrl("https://127.0.0.1/audio")).toBeNull();
    expect(publicHttpsUrl("http://radio.example.com/audio")).toBeNull();
  });
});
