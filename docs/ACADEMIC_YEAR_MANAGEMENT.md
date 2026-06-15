# Academic Year Management — Specification

**Version:** 1.0  
**Status:** Approved for implementation  
**Format:** Academic year is always `YYYY-YYYY` (e.g. `2025-2026`).

---

npm run migrate-active-students-ay
npm run migrate-active-students-ay

## 1. Purpose

Each student hostel application is tied to one **academic year**. When that year ends (or the configured expiry date is reached), the application **expires**: the student becomes inactive for that year, bed/locker are freed, and room occupancy history is closed. A **new application** for the next academic year requires a fresh registration (SQL registration flow)—there is **no batch renewal** workflow.

---

## 2. Decisions (Signed Off)

| Topic | Decision |
|-------|----------|
| Academic year format | `YYYY-YYYY` everywhere |
| On expiry | `hostelStatus = Inactive`, `applicationStatus = Expired`; student record kept; login blocked |
| Graduation-based expiry | **Not used**; expiry is per academic year only |
| Room on expiry | Clear `bedNumber` + `lockerNumber`; keep `room`, `roomNumber` for history |
| Expiry date | Derived from **course + year of study + academic year** (Academic Calendar first, then per-course/year config, then safe default) |
| Batch renewal | **Removed** — students re-register for each new academic year via SQL registration |
| Occupancy history backfill | Deferred (later phase) |
| Pre-registration approve | Same validation as SQL registration (student must exist in SQL; use register-from-sql flow) |
| Manual extension | Super admin can extend `applicationExpiryDate` per student |

---

## 3. Data Model

### 3.1 User (student) — new fields

| Field | Type | Description |
|-------|------|-------------|
| `applicationExpiryDate` | Date | End of validity for current academic-year application |
| `applicationStatus` | enum | `Active`, `Expired`, `Extended` |
| `applicationExpiryExtendedBy` | ObjectId → Admin | Who extended (optional) |
| `applicationExpiryExtendedAt` | Date | When extended (optional) |

Existing fields unchanged: `academicYear`, `hostelStatus`, `room`, `roomNumber`, etc.

**Occupancy rule:** Only `hostelStatus === 'Active'` counts toward room capacity.

### 3.2 RoomOccupancyHistory (new collection)

One row per student per academic-year stay (or per allocation period).

| Field | Description |
|-------|-------------|
| `student` | User ref |
| `studentName`, `rollNumber` | Denormalized |
| `course`, `branch`, `yearOfStudy` | Snapshot at allocation |
| `academicYear` | `YYYY-YYYY` |
| `hostel`, `hostelCategory`, `room` | Refs |
| `roomNumber`, `bedNumber`, `lockerNumber` | Snapshot at allocation |
| `allocatedFrom` | Start (registration date) |
| `allocatedTo` | End (null while active) |
| `status` | `Active`, `Expired`, `Withdrawn`, `Extended`, `Transferred` |
| `expiryReason` | `academic_year_end`, `manual`, `noc`, `admin_inactive` |

### 3.3 ApplicationExpiryConfig (new collection)

Fixed expiry **day/month** per course + year of study (applied to the **end year** of the academic year).

| Field | Example |
|-------|---------|
| `courseName` | `B.Tech` |
| `yearOfStudy` | `2` |
| `expiryMonth` | `4` (April) |
| `expiryDay` | `30` |
| `isActive` | `true` |

---

## 4. Expiry Date Calculation

Priority:

1. **Academic Calendar** — max `endDate` for matching `(course, academicYear, yearOfStudy)` across semesters.
2. **ApplicationExpiryConfig** — `{ courseName, yearOfStudy }` → build date on **end year** of AY (e.g. AY `2025-2026` → 30 Apr **2026**).
3. **System default** — 30 April of AY end year.

Course name resolved from SQL enrichment at registration time.

---

## 5. Lifecycle Flows

### 5.1 New registration (SQL)

1. Admin selects **academic year** (required).
2. System computes **application expiry date** (read-only in UI).
3. On save: `hostelStatus = Active`, `applicationStatus = Active`.
4. Create `RoomOccupancyHistory` with `status: Active`, `allocatedFrom = now`.

### 5.2 Application expiry (automatic)

**Daily job** (02:00 IST):

For each student where `hostelStatus === 'Active'` AND `applicationExpiryDate <= today`:

1. `hostelStatus = Inactive`
2. `applicationStatus = Expired`
3. Clear `bedNumber`, `lockerNumber`
4. Close occupancy history (`allocatedTo = now`, `status = Expired`)
5. Deactivate fee reminders for that `academicYear`

### 5.3 Super admin extension

- `POST /api/admin/students/:id/extend-application`
- Body: `{ newExpiryDate, reason? }`
- Sets `applicationExpiryDate`, `applicationStatus = Extended`
- If student was expired/inactive, optionally re-activate for current AY (admin choice in UI)

### 5.4 Pre-registration

- Approve action **redirects to Register from SQL** with prefilled data (no direct User create without SQL validation).
- Legacy approve API returns guidance or delegates to same path as `addStudent`.

### 5.5 NOC / manual inactive

- Close occupancy history with appropriate `status` / `expiryReason`.
- Clear bed/locker per existing NOC rules.

### 5.6 Next academic year

- Student must go through **SQL registration** again with new `academicYear`.
- New occupancy history row; previous row already closed on expiry.

---

## 6. Removed: Batch Renewal

- UI: Remove “Renew Batches” from Students page.
- API: `POST /api/admin/students/renew-batch` disabled (410 + message).
- `renewalHistory` on User retained for legacy data only.

---

## 7. APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/students/:id/application-expiry` | Preview expiry for student |
| POST | `/api/admin/students/:id/extend-application` | Super admin extend expiry |
| GET | `/api/admin/rooms/:roomId/occupancy-history` | AY-wise room history |
| GET | `/api/admin/application-expiry-config` | List course/year expiry rules |
| POST | `/api/admin/application-expiry-config` | Create/update rule |
| POST | `/api/admin/students/calculate-expiry` | Preview expiry (course, year, AY) |

---

## 8. UI

| Screen | Change |
|--------|--------|
| StudentRegistrationSQL | Show computed expiry date; academic year required |
| Students list | Optional: expiry date, application status |
| RoomManagement | Room modal → **Occupancy History** tab |
| PreRegistrationRequests | Approve → navigate to SQL registration |
| Students | Remove Renew Batches |

---

## 9. Migration (Later)

- Backfill `applicationExpiryDate` + `applicationStatus` for active students.
- Synthetic occupancy history — **deferred**.

---

## 10. Integration Checklist

- [x] Spec approved
- [x] User schema + RoomOccupancyHistory + ApplicationExpiryConfig
- [x] Expiry calculation service
- [x] Registration hooks
- [x] Daily expiry job
- [x] Extend expiry API
- [x] Room occupancy history API + UI
- [x] Remove renewal UI/API
- [x] Pre-reg → SQL registration path
- [ ] Migration backfill (deferred)
