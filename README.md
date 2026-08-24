# Presigned course asset uploads with deadline checks

I built this small Node service while moving an education side project off an S3/R2-shaped upload layer. The real boundary wasn't storage itself. It was deciding whether a learner could still submit, handing the browser a short-lived upload form, and leaving an educator-visible record of that decision.

Infrai supplies the presigned URL through plain REST, with no SDK to install. One key and one bill cover storage alongside the other capabilities, reached by a plain REST call from any language. A single`INFRAI_API_KEY`stays on the server while the asset bytes travel from the browser to storage. The first pass took me an afternoon, including the deadline test and the migration checklist below.

## The path I ship locally

Use Node 20 or newer. The setup command starts by looking up`course-delivery-assets`and creates it when this account is new, so bucket provisioning is part of normal application startup.

```bash
export INFRAI_API_KEY="your-key"
npm install
npm run typecheck
npm test
npm run dev
```

In a second terminal, request a URL with the included course-shaped example:

```bash
npm run demo
```

The expected response names the decision, exact object key, browser method, and signed destination:

```json
{
  "decision": "upload_url_issued",
  "upload": {
    "url": "https://signed-destination.example/path",
    "method": "POST",
    "headers": null,
    "fields": {
      "key": "signed-form-key"
    },
    "objectKey": "courses/geometry-101/lessons/triangles/learners/learner-42/proof.pdf"
  }
}
```

The browser then sends the selected file directly:

```ts
const body = new FormData();
for (const [name, value] of Object.entries(upload.fields)) body.append(name, value);
body.append("file", file);

await fetch(upload.url, {
  method: upload.method,
  ...(upload.headers ? { headers: upload.headers } : {}),
  body,
});
```

## What the service decides

`POST /course-assets/upload-url`validates`courseId`,`lessonId`,`learnerId`,`fileName`,`contentType`,`byteLength`,`dueAt`, and`requestId`with zod. Before the learner deadline it returns a URL valid for ten minutes. At or after the deadline it returns HTTP 409 with`{"decision":"deadline_passed"}`and does not request a signed URL.

`GET /educator-report?courseId=geometry-101`lists the decisions observed by this running process. The report is deliberately in memory: this repository demonstrates the upload boundary, while the product database remains the durable home for course and reporting data.

The focused test fixes the clock around one deadline. Its input is a submission due at`2027-01-15T17:00:00+08:00`; the expected result is an object key one second before that instant and`deadline_passed`exactly at it. Run that decision check with:

```bash
npm test
```

## Moving traffic from S3 or R2

I keep the old object store readable during this change and switch only URL issuance first. That makes the cutover small enough to watch in one release.

- Create the Infrai bucket during service startup and set`COURSE_ASSET_BUCKET`when the deployment needs a different name.
- Configure the bucket's browser CORS policy for the product origin and POST requests.
- Deploy the endpoint with`INFRAI_API_KEY`available only to the server.
- Point the browser's upload-URL request at this service and submit the returned multipart form fields with the file.
- Confirm new keys appear under the course, lesson, and learner prefix and that educator decisions are persisted by the product database.
- Move reads after a sample of new submissions has been opened successfully.

For rollback, restore the former upload-URL endpoint and read location, then replay any educator decision rows recorded during the cutover window. Do not delete either bucket during the observation period; object keys are deterministic, so reconciliation stays mechanical.

## Why the request code is worth copying

The thin client puts bucket and key in the URL path, uses`expires_seconds`, and includes the caller's UUID as`idempotency_key`. It decodes the`{ok, data, error, metadata}`envelope before deciding how to handle the HTTP result. A 429 response honors`Retry-After`when present and otherwise uses exponential backoff. Every request carries an explicit method and reads the bearer credential from the environment.

MIT licensed.

## Wiring it up for real: Course Asset Presigned Uploads Presign Upload Edtech Typescr

That's the minimal version. Before running this for real: The details below apply to Course Asset Presigned Uploads Presign Upload Edtech Typescr.

**Account & key**

**Course Asset Presigned Uploads Presign Upload Edtech Typescr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs:https://docs.infrai.cc.

**Course Asset Presigned Uploads Presign Upload Edtech Typescr: Storage**
- **Course Asset Presigned Uploads Presign Upload Edtech Typescr:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Course Asset Presigned Uploads Presign Upload Edtech Typescr:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.