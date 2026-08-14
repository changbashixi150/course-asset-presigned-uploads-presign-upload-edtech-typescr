const dueAt = new Date(Date.now() + 60 * 60 * 1_000).toISOString();
const response = await fetch("http://localhost:3000/course-assets/upload-url", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    courseId: "geometry-101",
    lessonId: "triangles",
    learnerId: "learner-42",
    fileName: "proof.pdf",
    contentType: "application/pdf",
    byteLength: 2048,
    dueAt,
    requestId: crypto.randomUUID(),
  }),
});

const result = await response.json();
console.log(JSON.stringify(result, null, 2));
