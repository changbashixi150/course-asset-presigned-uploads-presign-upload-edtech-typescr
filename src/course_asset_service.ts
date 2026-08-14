import { createServer } from "node:http";
import { ZodError } from "zod";
import { decideCourseAssetUpload, EducatorReport, uploadRequestSchema } from "./course_delivery.js";
import { ensureCourseAssetBucket, InfraiError, infrai } from "./infrai_storage.js";

const port = Number(process.env.PORT ?? 3000);
const bucket = process.env.COURSE_ASSET_BUCKET ?? "course-delivery-assets";
const report = new EducatorReport();

function send(response: import("node:http").ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

await ensureCourseAssetBucket(bucket);

createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/course-assets/upload-url") {
      const input = uploadRequestSchema.parse(await readJson(request));
      const decision = decideCourseAssetUpload(input, new Date());
      if (!decision.allowed) {
        report.record({
          courseId: input.courseId,
          learnerId: input.learnerId,
          lessonId: input.lessonId,
          outcome: decision.reason,
          recordedAt: new Date().toISOString(),
        });
        send(response, 409, { decision: decision.reason });
        return;
      }

      const signed = await infrai.storage.object.presign(bucket, decision.objectKey, {
        op: "put",
        expires_seconds: 600,
        content_type: input.contentType,
        max_bytes: input.byteLength,
        idempotency_key: input.requestId,
      });
      report.record({
        courseId: input.courseId,
        learnerId: input.learnerId,
        lessonId: input.lessonId,
        outcome: "upload_url_issued",
        recordedAt: new Date().toISOString(),
      });
      send(response, 201, {
        decision: "upload_url_issued",
        upload: { ...signed, objectKey: decision.objectKey },
      });
      return;
    }

    if (request.method === "GET" && request.url?.startsWith("/educator-report?")) {
      const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
      const courseId = url.searchParams.get("courseId");
      if (!courseId) {
        send(response, 400, { error: "courseId is required" });
        return;
      }
      send(response, 200, { courseId, deliveries: report.forCourse(courseId) });
      return;
    }

    send(response, 404, { error: "route not found" });
  } catch (error) {
    if (error instanceof ZodError) {
      send(response, 400, { error: "invalid request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.code, message: error.message });
      return;
    }
    send(response, 500, { error: "request failed" });
  }
}).listen(port, () => console.log(`Course asset service listening on http://localhost:${port}`));
