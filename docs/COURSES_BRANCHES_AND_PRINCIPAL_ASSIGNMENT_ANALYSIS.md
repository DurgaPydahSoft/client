# Courses, Branches (SQL) and Principal Assignment – Analysis

This document describes how **courses and branches** are fetched from the SQL database and how **principals** are assigned to courses. Use it as reference before making changes.

---

## 1. Source of truth: SQL database

- **Database:** MySQL (config: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `server/.env`).
- **Tables:**
  - **`courses`** – id, name, code, metadata, total_years, is_active, created_at, updated_at
  - **`course_branches`** – id, course_id, name, code, metadata, is_active, created_at, updated_at (JOINs to `courses` for course_name, course_code)

Courses and branches are **read-only from HMS**: create/update/delete in the API are disabled; the central SQL DB is the source of truth.

---

## 2. How courses and branches are fetched from SQL

### 2.1 SQL layer – `server/src/utils/sqlService.js`

- **`fetchCoursesFromSQL()`** – `SELECT * FROM courses ORDER BY name ASC`
- **`fetchBranchesFromSQL()`** – `SELECT` from `course_branches` with `LEFT JOIN courses` (includes course_name, course_code)
- **`fetchBranchesByCourseFromSQL(courseId)`** – same branch fields, `WHERE course_id = ?`
- **`fetchCourseByIdFromSQL(courseId)`** – single course by id
- **`fetchBranchByIdFromSQL(branchId)`** – single branch by id

All return raw SQL rows. No caching here.

### 2.2 Mapper and cache – `server/src/utils/courseBranchMapper.js`

- **Cache:** In-memory cache of courses and branches; refreshed every **5 minutes** (`CACHE_DURATION = 5 * 60 * 1000`).
- **`getCoursesFromSQL()`** – uses cache; on miss calls `fetchCoursesFromSQL()`, maps each row with `mapSQLCourseToMongoFormat()`.
- **`getBranchesFromSQL()`** – same for branches with `mapSQLBranchToMongoFormat()`.
- **`getBranchesByCourseFromSQL(courseId)`** – accepts course id as:
  - `sql_<id>` (e.g. `sql_1`) → uses numeric id
  - numeric string → uses as course_id
  - MongoDB ObjectId → not supported for SQL; would need legacy Mongo path. For principals we pass SQL-style course id from mapper.

**Mapped format (Mongo-like for backward compatibility):**

- Course: `_id: 'sql_<id>'`, `sqlId`, `name`, `code`, `description`, `duration`, `durationUnit`, `isActive`, etc.
- Branch: `_id: 'sql_<id>'`, `sqlId`, `sqlCourseId`, `name`, `code`, `course: 'sql_<course_id>'`, `courseName`, `courseCode`, `isActive`, etc.

If SQL fails, mapper falls back to MongoDB `Course` / `Branch` models (if still in use).

### 2.3 API routes – `server/src/routes/courseManagementRoutes.js`

| Route | Auth | Behaviour |
|-------|------|-----------|
| `GET /api/course-management/courses` | No | `getCoursesFromSQL()` → returns mapped courses |
| `GET /api/course-management/courses/all` | courseManagementAuth | Same; on SQL failure falls back to MongoDB Course.find() |
| `GET /api/course-management/branches` | No | `getBranchesFromSQL()` → returns mapped branches |
| `GET /api/course-management/branches/:courseId` | No | `getBranchesByCourseFromSQL(courseId)` |
| `GET /api/course-management/branches/all` | courseManagementAuth | `getBranchesFromSQL()` |
| `GET /api/course-management/courses-with-branches` | protect | Courses + branches grouped (from SQL) |

POST/PUT/DELETE for courses and branches return **403** with a message that courses/branches are managed in the central SQL database.

---

## 3. How principals are assigned to courses

### 3.1 Admin model – `server/src/models/Admin.js`

For **role === 'principal'**:

- **`assignedCourses`** – array of **strings** (course **names** from SQL, e.g. `["B.Tech", "Diploma"]`).
- **`course`** – string, legacy; must equal `assignedCourses[0]` when present (single “primary” course name).
- **`branch`** – optional string (branch **name**); only used when principal has **exactly one** assigned course; otherwise cleared.

So principals are stored by **course name** (and optionally branch name), not by SQL id or Mongo id.

### 3.2 Create principal – `server/src/controllers/adminManagementController.js` → `createPrincipal`

- **Body:** `username`, `password`, `course` (single, legacy), **`courses`** (array), optional `branch`, `email`.
- **Validation:**
  1. Load courses from SQL: `getCoursesFromSQL()`.
  2. For each item in `courses` (or single `course`): must match a course from SQL by **name** or **_id** (`c.name === courseItem || c._id === courseItem`). So frontend can send either course name or mapped `_id` (e.g. `sql_1`).
  3. **Stored:** `finalAssignedCourses` = array of **course names**; `course` = first course name; `assignedCourses` = same array of names.
  4. If **exactly one** course and `branch` provided: branches loaded with `getBranchesByCourseFromSQL(singleCourseObj._id)`; branch must match by name or _id; **stored as branch name** in `principal.branch`.

So: **assignment is by course/branch names from SQL; storage is names only.**

### 3.3 Update principal – `updatePrincipal`

- Same idea: `courses` / `course` in body validated against `getCoursesFromSQL()`, stored as **course names** in `assignedCourses` and `course`.
- Branch updated only when principal has a single course; again validated via `getBranchesByCourseFromSQL(singleCourseObj._id)` and stored as branch **name**.

### 3.4 Where principal courses are used

Principals see only data for their assigned courses (and optionally one branch). Comparisons use **course/branch names** (often normalized):

- **`server/src/controllers/attendanceController.js`** – `allowedCourses = principal.assignedCourses || [principal.course]`; filter students by course (e.g. student.course vs allowed course names).
- **`server/src/controllers/leaveController.js`** – leave requests filtered by principal’s course(s); uses `principal.course` / `assignedCourses` and normalized course name.
- **`server/src/controllers/complaintController.js`** – principal complaints filtered by `principal.course` (normalized).
- **`server/src/controllers/adminController.js`** – principal-scoped lists; `allowedCourses` from `assignedCourses` or `course`.

**Student (User) model:** `course` and `branch` are **strings** (names from SQL). So principal’s `assignedCourses` (names) are compared with `student.course` (name) – same convention.

---

## 4. Frontend flow

### 4.1 Loading courses and branches

- **`client/src/context/CoursesBranchesContext.jsx`** – fetches once (and caches 5 min in localStorage):
  - `GET /api/course-management/courses`
  - `GET /api/course-management/branches`
- **`client/src/pages/admin/AdminManagement.jsx`** – when principals (or sub-admins / custom roles) tab and add/edit modal are open:
  - Fetches courses: `GET /api/course-management/courses`.
  - For **principal** with **exactly one** course selected: fetches branches with `GET /api/course-management/branches/${selectedCourse._id}` (so courseId is the mapped `_id`, e.g. `sql_1`).

### 4.2 Principal create/edit

- **Create:** `formData.principalCourses` (array of **course names**) and optional branch; sent as `courses: formData.principalCourses`, `course: formData.principalCourses[0]`, `branch`, `email`.
- **Edit:** Same; `principalCourses` is filled from `admin.assignedCourses || (admin.course ? [admin.course] : [])`.
- UI: checkboxes by `course.name`; principal form stores **course names** in `principalCourses`; branch dropdown when `principalCourses.length === 1`.

So the frontend uses **course names** for principal assignment and, when needed, **mapped course _id** only to load branches for one course.

---

## 5. Helper utilities

- **`server/src/utils/courseBranchHelper.js`** – `getCourseById(courseId)`, `getBranchById(branchId)`; resolve `sql_<id>` or numeric id from SQL; otherwise Mongo. Used when code needs a single course/branch by id.
- **`server/src/utils/courseBranchResolver.js`** – `resolveCourseId`, `resolveBranchId` for hybrid SQL/Mongo id handling (e.g. fee structures, student sync).
- **`server/src/utils/courseBranchMatcher.js`** – `matchCourse`, `matchBranch` by name/code (normalized, fuzzy) used when syncing students from SQL so that student course/branch names map to the same SQL source.

---

## 6. Summary

| Topic | Detail |
|-------|--------|
| **Courses/branches source** | SQL tables `courses` and `course_branches`. Read-only from HMS. |
| **Fetch path** | sqlService → courseBranchMapper (cache 5 min) → courseManagementRoutes. |
| **Principal assignment** | By **course name** (and optional **branch name**). Validated against SQL via mapper; stored in Admin as `assignedCourses` (names) and `course` (first name), `branch` (name or empty). |
| **Principal usage** | Attendance, leave, complaints, admin lists filter by `principal.assignedCourses` / `principal.course` (and optional `principal.branch`), compared with student course/branch **names**. |
| **Frontend** | Courses/branches from `/api/course-management/courses` and `/api/course-management/branches` (and branches by course id). Principal form uses course names; branch by course when single course. |

Once you decide what you want to change (e.g. store SQL ids, change validation, or add new roles), we can plan the exact code edits.
