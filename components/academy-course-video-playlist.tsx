import { AcademyVideoCourseJourney } from "@/components/academy-video-course-journey";
import type { PublicLocale } from "@/lib/public-locales";

export type AcademyOrderedVideoLesson = {
  id: string;
  title: string;
  order: number;
};

/** Preserve original PsiMaster IDs and order; display one video and one reflection per slide. */
export function AcademyCourseVideoPlaylist({
  locale,
  courseTitle,
  courseId,
  description,
  lessons,
}: {
  locale: PublicLocale;
  courseTitle: string;
  courseId: string;
  description?: string;
  lessons: AcademyOrderedVideoLesson[];
}) {
  return (
    <div id="academy-video-lessons" data-academy-course-playlist data-video-lesson-count={lessons.length}>
      <AcademyVideoCourseJourney
        locale={locale}
        courseId={"source:" + courseId}
        title={courseTitle}
        description={description}
        poster={lessons[0] ? "https://i.ytimg.com/vi/" + lessons[0].id + "/hqdefault.jpg" : undefined}
        lessons={lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          youtubeId: lesson.id,
        }))}
      />
    </div>
  );
}
