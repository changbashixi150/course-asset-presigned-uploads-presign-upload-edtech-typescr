import { describe, expect, it } from "vitest";
import { decideCourseAssetUpload, uploadRequestSchema } from "../src/course_delivery.js";

const request = uploadRequestSchema.parse({
  courseId: "geometry-101",
  lessonId: "triangles",
  learnerId: "learner-42",
  fileName: "proof.pdf",
  contentType: "application/pdf",
  byteLength: 2048,
  dueAt: "2027-01-15T17:00:00+08:00",
  requestId: "4b1f3ed8-b595-4cf0-a495-8f02df33f40b",
});

describe("course asset deadline", () => {
  it("issues an object key before the deadline", () => {
    expect(decideCourseAssetUpload(request, new Date("2027-01-15T08:59:59Z"))).toEqual({
      allowed: true,
      objectKey: "courses/geometry-101/lessons/triangles/learners/learner-42/proof.pdf",
    });
  });

  it("rejects an upload at the deadline", () => {
    expect(decideCourseAssetUpload(request, new Date("2027-01-15T09:00:00Z"))).toEqual({
      allowed: false,
      reason: "deadline_passed",
    });
  });
});
