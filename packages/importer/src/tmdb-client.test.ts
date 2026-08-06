import { describe, expect, it } from "vitest";
import { backdropUrl, posterUrl, profileUrl } from "./tmdb-client.js";

describe("tmdb-client URL helpers", () => {
  it("builds CDN URLs and handles null paths", () => {
    expect(posterUrl("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w500/abc.jpg");
    expect(backdropUrl("/bg.jpg")).toBe("https://image.tmdb.org/t/p/w1280/bg.jpg");
    expect(profileUrl("/p.jpg")).toBe("https://image.tmdb.org/t/p/w185/p.jpg");
    expect(posterUrl(null)).toBeNull();
    expect(backdropUrl(undefined)).toBeNull();
  });
});
