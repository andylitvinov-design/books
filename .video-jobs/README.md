# Video jobs

Each new `.json` file in this directory is an explicit publication command for the English YouTube worker.

Example shape (documentation only; do not commit a sample JSON unless you intend to publish it):

~~~text
{
  "version": 1,
  "target": "youtube-en-private",
  "sourceUrl": "https://files2.heygen.ai/.../video.mp4?...",
  "title": "Video title",
  "description": "Video description",
  "tags": ["Holistic House", "Andy Litvinov"],
  "language": "en",
  "fileName": "2026-09-29_homeopathy_example_en_avatarV_16x9_v01.mp4"
}
~~~

The uploader ignores any attempt to request Public or Unlisted visibility and fails closed.
