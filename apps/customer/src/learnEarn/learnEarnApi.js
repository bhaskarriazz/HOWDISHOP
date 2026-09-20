const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

function sessionHeaders(extra = {}) {
  const token = localStorage.getItem("howdiSessionToken") || "";
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: sessionHeaders(options.headers || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function loadLearningCatalog() {
  const data = await request("/api/learning/catalog");
  return Array.isArray(data.courses) ? data.courses : [];
}

export async function loadCourseDetails(courseId) {
  return request(`/api/learning/course/${encodeURIComponent(courseId)}/details`);
}

export async function enrolInCourse(courseId) {
  return request("/api/learning/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course_id: courseId }),
  });
}

export async function loadMyLearning() {
  const data = await request("/api/learning/my-learning");
  return Array.isArray(data.courses) ? data.courses : [];
}

export async function loadLiveAvailability() {
  const data = await request("/api/learning/live/availability");
  return Array.isArray(data.availability) ? data.availability : [];
}

export async function loadSkillPassport() {
  return request("/api/learning/skill-passport");
}

export async function loadLearningOpportunities() {
  const data = await request("/api/learning/opportunities");
  return {
    ...data,
    opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
  };
}

export async function loadPracticeProof(courseId) {
  return request(`/api/learning/practice-proof?course_id=${encodeURIComponent(courseId)}`);
}

export function normalizeCourse(course) {
  const price = Number(course?.sale_price ?? course?.price ?? 0);
  const durationMinutes = Number(course?.duration_minutes || 0);
  return {
    id: course?.id,
    slug: course?.id,
    title: course?.title || "HOWDI course",
    description: course?.description || course?.tagline || "",
    teacher: course?.teacher_name || "HOWDI Learning",
    teacherCode: course?.teacher_code || "",
    level: course?.level || "All levels",
    duration: durationMinutes
      ? durationMinutes >= 60
        ? `${Math.round(durationMinutes / 60)} hr`
        : `${durationMinutes} min`
      : "Self paced",
    format: course?.live_class_included ? "Recorded + Live" : "Recorded + Practice",
    price,
    currency: course?.currency || "INR",
    category: course?.category || "Skills",
    thumbnailUrl: course?.thumbnail_url || "",
    outcomes: Array.isArray(course?.outcomes) ? course.outcomes : [],
    materials: Array.isArray(course?.materials) ? course.materials : [],
    moduleCount: Number(course?.module_count || 0),
    lessonCount: Number(course?.lesson_count || 0),
    projectRequired: course?.project_required !== false,
    certificateEnabled: course?.certificate_enabled !== false,
    purchaseMode: course?.purchase_mode || (price > 0 ? "PAID" : "FREE"),
  };
}
