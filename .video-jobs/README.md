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
  "fileName": "2026-09-29_homeopathy_example_en_avatarV_16x9_v01.mp4",
  "driveFolderId": "<current AI Videos/Homeopathy/Public/YEAR folder ID from #219 / Drive>"
}
~~~

Execution order is strict: **HeyGen download -> Drive archive -> YouTube Private**.

The uploader rejects Public/Unlisted requests. If Drive archiving fails, YouTube upload does not start.

For retries, create a new job file with a new filename instead of editing an existing job.
