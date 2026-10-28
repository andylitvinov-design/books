import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertBusinessConstellationVideo } from "./helpers/business-constellation-video-contract.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("retained Business Constellations is exact, localized and click-to-load on the Business landing", () => {
  assertBusinessConstellationVideo(read);
});

test("Business video contract rejects wrong source, placement, locale and automatic playback", () => {
  const landing = "components/business-consulting-landing.tsx";
  const library = "data/service-video-library.ts";
  const player = "components/site-video-player.tsx";
  const showcase = "components/service-video-showcase.tsx";
  const placement = '<ServiceVideoShowcase topic="constellation-case" locale={locale} id="business-constellation-video" />';
  for (const [path, before, after] of [
    [landing, placement, ""],
    [landing, placement, placement + placement],
    [landing, placement, placement + '<iframe src="https://www.youtube.com/embed/sfVFOQNr2qk?autoplay=1" />'],
    [landing, placement, placement.replace('topic="constellation-case"', 'topic="overview"')],
    [landing, placement, placement.replace("locale={locale}", 'locale="en"')],
    [library, 'youtubeId: "sfVFOQNr2qk"', 'youtubeId: "s30Y42IwPcg"'],
    [library, 'language: "en", title: "Business Constellations"', 'language: "ru", title: "Business Constellations"'],
    [library, 'youtubeId: "sfVFOQNr2qk"', 'youtubeId: "sfVFOQNr2qk", driveUrl: "https://drive.google.com/private-fixture"'],
    [showcase, 'video={video.video} locale={locale}', 'video={video.video} locale="en"'],
    [showcase, '<div className={styles.player}>', '<div className={styles.player}><iframe src="https://www.youtube.com/embed/sfVFOQNr2qk?autoplay=1" />'],
    [player, 'const [playing, setPlaying] = useState(false)', 'const [playing, setPlaying] = useState(true)'],
    [player, 'useEffect(() => { setInteractive(true); }, [])', 'useEffect(() => { setInteractive(true); setPlaying(true); }, [])'],
    [player, 'www.youtube-nocookie.com/embed/', 'www.youtube.com/embed/'],
    [player, 'const externalLink = internalOnly ? null :', 'const externalLink = true ? null :'],
  ]) {
    const source = read(path);
    assert.equal(source.split(before).length, 2, "Exactly one synthetic mutation: " + before);
    const changed = source.replace(before, after);
    assert.throws(() => assertBusinessConstellationVideo(input => input === path ? changed : read(input)),
      { code: "ERR_ASSERTION" }, "Must reject: " + before);
  }
});
