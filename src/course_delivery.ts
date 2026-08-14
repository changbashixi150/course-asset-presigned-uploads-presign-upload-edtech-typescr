import { z } from "zod";

export const uploadRequestSchema = z.object({
  courseId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  lessonId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  learnerId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  fileName: z.string().min(1).max(160).regex(/^[a-zA-Z0-9._-]+$/),
  contentType: z.string().min(3).max(120),
  byteLength: z.number().int().positive().max(25_000_000),
  dueAt: z.string().datetime({ offset: true }),
  requestId: z.string().uuid(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export type UploadDecision =
  | { allowed: true; objectKey: string }
  | { allowed: false; reason: "deadline_passed" };

export function decideCourseAssetUpload(request: UploadRequest, now: Date): UploadDecision {
  if (Date.parse(request.dueAt) <= now.getTime()) {
    return { allowed: false, reason: "deadline_passed" };
  }
  return {
    allowed: true,
    objectKey: `courses/${request.courseId}/lessons/${request.lessonId}/learners/${request.learnerId}/${request.fileName}`,
  };
}

export type ReportEntry = {
  courseId: string;
  learnerId: string;
  lessonId: string;
  outcome: "upload_url_issued" | "deadline_passed";
  recordedAt: string;
};

export class EducatorReport {
  private readonly entries: ReportEntry[] = [];

  record(entry: ReportEntry): void {
    this.entries.push(entry);
  }

  forCourse(courseId: string): ReportEntry[] {
    return this.entries.filter((entry) => entry.courseId === courseId);
  }
}
