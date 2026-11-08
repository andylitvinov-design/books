/**
 * First-party, PRE-ENCODED H.264 MOVING footage for the Holistic House editor.
 * 12 branded, edited scenes remixed from commercially licensed moving videos.
 * Static CDN URLs: no paid provider, no client photo network upload.
 * Do not swap these with a JPG, SVG animation or a simulated Canvas loop.
 */
import type { MoneySceneId } from "./money-flow-effects";
import { newMoneyFilms } from "./film-collection-v2";

const ROOT = "/videos/holistic-house/money-films-v1/";
export const realMoneyFilms: Record<MoneySceneId, {src:string; poster:string; seconds:number; mediaType:"video/mp4"}> = {
  "golden-rain": {src:ROOT+"golden-rain.mp4",poster:ROOT+"golden-rain.jpg",seconds:5,mediaType:"video/mp4"},
  "cosmic-flow": {src:ROOT+"cosmic-flow.mp4",poster:ROOT+"cosmic-flow.jpg",seconds:5,mediaType:"video/mp4"},
  "abundance-tree": {src:ROOT+"abundance-tree.mp4",poster:ROOT+"abundance-tree.jpg",seconds:5,mediaType:"video/mp4"},
  "opportunity-falls": {src:ROOT+"opportunity-falls.mp4",poster:ROOT+"opportunity-falls.jpg",seconds:5,mediaType:"video/mp4"},
  "money-magnet": {src:ROOT+"money-magnet.mp4",poster:ROOT+"money-magnet.jpg",seconds:5,mediaType:"video/mp4"},
  "path-to-goals": {src:ROOT+"path-to-goals.mp4",poster:ROOT+"path-to-goals.jpg",seconds:5,mediaType:"video/mp4"},
  partners: {src:ROOT+"partners.mp4",poster:ROOT+"partners.jpg",seconds:5,mediaType:"video/mp4"},
  "infinite-flow": {src:ROOT+"infinite-flow.mp4",poster:ROOT+"infinite-flow.jpg",seconds:5,mediaType:"video/mp4"},
  "golden-shield": {src:ROOT+"golden-shield.mp4",poster:ROOT+"golden-shield.jpg",seconds:5,mediaType:"video/mp4"},
  "abundance-circle": {src:ROOT+"abundance-circle.mp4",poster:ROOT+"abundance-circle.jpg",seconds:5,mediaType:"video/mp4"},
  "life-gifts": {src:ROOT+"life-gifts.mp4",poster:ROOT+"life-gifts.jpg",seconds:5,mediaType:"video/mp4"},
  dreams: {src:ROOT+"dreams.mp4",poster:ROOT+"dreams.jpg",seconds:5,mediaType:"video/mp4"},
  ...newMoneyFilms,
};
export function getRealMoneyFilm(id:MoneySceneId) {
  return realMoneyFilms[id];
}
