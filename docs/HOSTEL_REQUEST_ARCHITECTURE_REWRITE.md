# Hostel Management Architecture Rewrite

**Status:** Phase 6 complete — ready for Phase 7 migration (last)  
**Last updated:** 2026-07-21  
**Rule:** Data migration / backfill runs **LAST**, after all phases are complete and verified.

---

## 1. Goal

Redesign so that:

1. **Academic-year hostel data** lives on a yearly **`HostelRequest`** (source of truth).
2. **Admission number** is the main student identifier via a minimal **`StudentMaster`**.
3. **No renewal process** — each academic year is an independent hostel request.
4. **Sequence** = College Code → Course Code → Hostel Code → Sequence (per academic year).
5. **Room occupancy history** is secondary (audit only), not used to filter current hostel/room state.
6. **One status field** on requests: `active` | `expired` | `cancelled`.
7. **SDMS** is the source for academic information (no unnecessary academic duplication).

---

## 2. Confirmed Design Decisions

| Decision | Choice |
|----------|--------|
| Student identity | Minimal `StudentMaster` keyed by `admissionNumber` |
| Yearly lifecycle | Full lifecycle on `HostelRequest` (allocation → occupancy → exit) |
| Status values | `active`, `expired`, `cancelled` only |
| Hostel sequence | Requires `Hostel.code`; counter key `hostelseq:{AY}:{college}:{course}:{hostel}` |
| ID format | `{collegeCode}{courseCode}{hostelCode}{paddedSequence}` |
| Pre-registration | Remove / replace with HostelRequest flow |
| Renewal | Not supported — new year = new HostelRequest |
| Migration | **Last step only** |

---

## 3. Target Domain Model

```
SDMS (academics)
    │
    ▼
StudentMaster (identity: admissionNumber, login link, contacts)
    │
    ▼
HostelRequest (one per admissionNumber + academicYear)
    │ owns: hostel, category, room, bed/locker, sequence, status
    │
    └──► RoomOccupancyHistory (audit events only, hostelRequestId link)
```

### StudentMaster (minimal)

- `admissionNumber` (unique business key)
- Optional `userId` (legacy login `User`)
- Stable contact/photo fields owned by hostel system
- `lastSdmsSyncAt`

**Does not store:** academicYear, hostel/room allocation, yearly status (use HostelRequest.status), year fees.

User login lifecycle uses `applicationStatus` only (`Active` | `Expired` | `Extended` | `Withdrawn`). `User.hostelStatus` is deprecated and no longer written by registration.

### HostelRequest (yearly SOT)

- `admissionNumber`, `studentMasterId`, `academicYear`
- `status`: active | expired | cancelled
- `hostelId`, `hostelCategoryId`, `roomId`, `roomNumber`, bed/locker
- `collegeCode`, `courseCode`, `hostelCode`, `yearlySequenceNumber`, `hostelSequenceId`
- SDMS snapshot fields + `sdmsSyncedAt` (cache, not academic SOT)
- Allocation / expiry / cancel timestamps

### Hostel

- New field: `code` (required on create; used in sequence generation)

---

## 4. Requirements Checklist (R1–R11)

| ID | Requirement | Status |
|----|-------------|--------|
| R1 | Academic-year-wise student/hostel data | Phase 2 dual-read prefers HostelRequest when present |
| R2 | Students page shows hostel request data | Phase 5 UI cutover (filters + detail) |
| R3 | Admission number is main identifier | Phase 1 (`StudentMaster`) |
| R4 | No renewal process | Phase 2+ (disable `isRenewal` path) |
| R5 | Sequence College→Course→Hostel→Number | Phase 1 (`hostelSequenceGenerator`) |
| R6 | HostelRequest is allocation SOT | Phase 3 occupancy reads prefer HostelRequest |
| R7 | Occupancy history secondary only | Phase 3 reads + registration audit-only history |
| R8 | Single status: active/expired/cancelled | Phase 1 model |
| R9 | SDMS for academics | Phase 1 create flow; expand in Phase 2 |
| R10 | Remove StudentPreRegistration | Phase 6 removed model/routes/UI |
| R11 | Canonical API mounts only (no dual mount for new APIs) | Phase 1 + Phase 6 documented |

---

## 5. Implementation Phases & TODO Checklist

### Phase 1 — Foundation (DONE)

- [x] `StudentMaster` model
- [x] `HostelRequest` model
- [x] `Hostel.code` field + create/update API
- [x] `RoomOccupancyHistory.hostelRequestId`
- [x] `hostelSequenceGenerator.js`
- [x] `hostelRequestOccupancyUtils.js` (AY-scoped)
- [x] Canonical routes:
  - `/api/student-masters`
  - `/api/hostel-requests`
- [x] Backfill **script created** but **not to be run until last**

### Phase 2 — Registration + Students write path (DONE)

- [x] Shared `hostelRequestService.createYearlyHostelRequest`
- [x] On SQL registration / `addStudent`: dual-write `StudentMaster` + `HostelRequest`
- [x] Block duplicate HostelRequest for same admission + academic year
- [x] Require hostel `code` before allocation (create hostel UI + API)
- [x] Show `hostelSequenceId` on registration success toast
- [x] Students list: dual-read / DTO compat (`fetchStudentsForAcademicYear` prefers HostelRequest; UI maps `active`/`expired`/`cancelled`)
- [ ] Stop labeling flow as “renewal” in product copy (backend still dual-writes User for login compat) — optional polish

### Phase 3 — Occupancy & reports (DONE)

- [x] Room bed/locker availability from active `HostelRequest` (legacy fallback until backfill)
- [x] Align warden + admin room occupancy reads (`roomOccupancyUtils` AY-scoped; staff/guest uses same count)
- [x] Dashboard / attendance / count reports prefer HostelRequest when AY filter set (dashboard room occupied + student lists via Phase 2 fetch)
- [x] Drop synthetic “live snapshot” occupancy-history on registration — audit emitted from HostelRequest only

### Phase 4 — Fee / NOC / expiry (DONE)

- [x] Expiry job updates `HostelRequest.status` → `expired` (`expireStudentApplication` → `closeActiveHostelRequestForUser`)
- [x] NOC vacating updates request status → `cancelled` + reopen on NOC revert
- [x] Admin inactive / enrollment removal closes or deletes request for that AY
- [x] Fee reminders keyed by `hostelRequestId` + `admissionNumber` (+ legacy student id)

### Phase 5 — Frontend Students module cutover (DONE)

- [x] Students page framed as Hostel Requests for selected academic year
- [x] Filters: AY, hostel, category, room, status (`active` / `expired` / `cancelled`)
- [x] Detail modal: SDMS academics + hostel request allocation (sequence, status, admission)
- [x] Pre-registration admin route redirects to SQL registration; public prereg form retired

### Phase 6 — Cleanup (DONE)

- [x] Stop writing yearly hostel allocation onto `User` (login keeps `academicYear` + `hostelStatus`; room/bed/hostel on HostelRequest)
- [x] Remove `StudentPreRegistration` (model, routes, controller, admin UI)
- [x] Retire dual occupancy utils — `roomOccupancyUtils` is HostelRequest-only
- [x] Document canonical API map; new APIs mounted once via `routes/index.js`

### Phase 7 — Migration LAST

- [x] Inspect existing data: `node -r dotenv/config src/scripts/inspectMigrationData.js` (read-only)
- [x] Assign real `Hostel.code` values (`assignHostelCodes.js` → Boys=BH, Girls=GH)
- [x] Rewrite backfill script: real `generateHostelSequenceId` (no BACKFILL prefix), course-code
      overrides (BSC/PHARMD/DAPPTV/DAH/DFP + strip dots), per-student+AY history dedupe,
      preserve existing statuses regardless of AY, real expiry/cancel dates, `--fix-users` normalization
- [x] Missing Mongo admission numbers are looked up in SDMS by roll number and synced during the real run
- [ ] Re-run dry-run after status-preservation and SDMS-sync changes; verify totals in `server/backfill-dryrun.log`
- [ ] Resolve only SDMS lookup conflicts/not-found records reported by the dry-run (script is idempotent)
- [ ] Run real: `npm run backfill-hostel-requests` (add `-- --fix-users` after review)
- [ ] Verify counts: masters, requests, history links (re-run inspect script)
- [ ] Map legacy student statuses → new architecture (see §5a)
- [ ] Only then deprecate legacy yearly fields on `User` schema

---

## 5a. Status Migration Map (existing students → current architecture)

The old model used a single `User.hostelStatus` (`Active` / `Inactive`) plus a loosely-used
`applicationStatus`. The new model splits lifecycle into **two** independent fields:

- **`User.applicationStatus`** — login/identity lifecycle: `Active | Extended | Expired | Withdrawn`
- **`HostelRequest.status`** — per-academic-year allocation: `active | expired | cancelled`

For every existing `User` with a student role, the backfill must (a) create a `StudentMaster`
(keyed by `admissionNumber`), (b) create one `HostelRequest` for the student's current
`academicYear` using the allocation currently stored on `User`
(`hostel`, `hostelCategory`, `roomNumber`, `bedNumber`, `lockerNumber`), and (c) set both
status fields per the table below.

### Mapping rules

| Legacy signal on `User` | Reason / how to detect | → `HostelRequest.status` | → `User.applicationStatus` |
|--------------------------|------------------------|--------------------------|-----------------------------|
| `hostelStatus = 'Active'` | Preserve existing active state, regardless of academic year | `active` | `Active` |
| `hostelStatus = 'Active'` **and** `applicationStatus = 'Extended'` | Extension granted | `active` | `Extended` |
| `hostelStatus = 'Inactive'` due to application expiry | `applicationExpiryDate` in the past, or `applicationStatus = 'Expired'` | `expired` | `Expired` |
| `hostelStatus = 'Inactive'` due to NOC / vacate | Has approved/served `NOC` or `nocDate` set | `cancelled` | `Withdrawn` |
| `hostelStatus = 'Inactive'`, no NOC and no expiry date | Manually deactivated | `expired` | `Expired` |
| `applicationStatus = 'Withdrawn'` (already) | Preserve | `cancelled` | `Withdrawn` |
| No `hostelStatus` and no allocation | Never allocated / login-only | **no HostelRequest** | keep existing (`Active` default) |

### Allocation & sequence

- Copy `hostel`, `hostelCategory`, `roomId`/`roomNumber`, `bedNumber`, `lockerNumber` onto the request.
- Generate `hostelSequenceId` via `hostelSequenceGenerator` for the request's academic year
  (requires `Hostel.code`; assign codes first). Existing legacy `User.hostelId` (e.g. `BH26003`)
  is retained only as a fallback display value — the UI now shows `hostelSequenceId`
  (e.g. `PCEBTECHBH001`) as the Hostel ID.
- Timestamps: set `allocatedAt` from `allocatedFrom`/`createdAt`; for `expired`/`cancelled`
  set `expiredAt`/`cancelledAt` from `actualExpiredAt` / `allocatedTo` / `applicationExpiryDate`.

### Idempotency & verification

- Skip users already having a `HostelRequest` for that `admissionNumber + academicYear`.
- Report and skip users missing `admissionNumber` (fix in SDMS, then re-run).
- After backfill, verify that every request status matches its source history/User status.
  Academic year alone must not convert an existing `active` status to `expired`.
- Only after verification: stop writing `User.hostelStatus` entirely and drop the field.

> Note: until Phase 7 runs, `overlayStudentWithHostelRequest` keeps a temporary
> `hostelStatus` alias (`Active`/`Inactive`) derived from `applicationStatus` so legacy UI
> filters keep working. Remove the alias once the field is dropped.

---

## 6. Canonical API Map

Mount rule: **new architecture routes are registered once** in `server/src/routes/index.js` and exposed under `/api/*` via `app.use('/api', apiRouter)`. Do **not** dual-mount them again in `index.js`.

### Hostel request architecture (canonical)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/student-masters` | List masters |
| POST | `/api/student-masters` | Upsert master (optional SDMS sync) |
| GET | `/api/student-masters/:admissionNumber` | Get by admission |
| GET | `/api/hostel-requests` | List/filter yearly requests |
| POST | `/api/hostel-requests` | Create yearly allocation |
| GET | `/api/hostel-requests/:id` | Detail |
| PATCH | `/api/hostel-requests/:id/status` | Set active/expired/cancelled |
| PATCH | `/api/hostel-requests/:id/allocation` | Change room/bed within year |
| PUT | `/api/hostels/:id` | Update hostel including `code` |

### Compatibility (still used; prefer HostelRequest for allocation)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/students` | Dual-read DTO; overlays HostelRequest when present |
| POST | `/api/admin/students` | Creates User login + HostelRequest (no User room writes) |
| GET | `/api/admin/rooms` / `/api/rooms` | Occupancy counts from active HostelRequest |

### Removed (Phase 6)

| Path | Status |
|------|--------|
| `/api/student/preregister` | Removed |
| `/api/student/preregistrations/*` | Removed |
| Admin Pre-Registration Requests UI | Removed (redirects to SQL registration) |

---

## 7. Current vs Target Data Flow

### Current (post Phase 6)

```
Students page → User list + HostelRequest overlay (AY + status)
Registration → User (login/identity) + StudentMaster + HostelRequest
Room occupancy → active HostelRequest only
History → audit rows linked by hostelRequestId
```

### After Phase 7 migration

```
Students page → HostelRequest (+ StudentMaster + SDMS)
User → login credentials + hostelStatus gate only
Legacy User room/hostel fields → unused / deprecated
```

---

## 8. Files Touched / Key Paths

### Phase 1 (created/updated)

- `server/src/models/StudentMaster.js`
- `server/src/models/HostelRequest.js`
- `server/src/models/Hostel.js`
- `server/src/models/RoomOccupancyHistory.js`
- `server/src/utils/hostelSequenceGenerator.js`
- `server/src/utils/hostelRequestOccupancyUtils.js`
- `server/src/controllers/studentMasterController.js`
- `server/src/controllers/hostelRequestController.js`
- `server/src/controllers/hostelController.js`
- `server/src/routes/studentMasterRoutes.js`
- `server/src/routes/hostelRequestRoutes.js`
- `server/src/routes/hostelRoutes.js`
- `server/src/routes/index.js`
- `server/src/scripts/backfillHostelRequests.js` (**run last**)

### Phase 2–6 (done)

- `server/src/services/hostelRequestService.js` — create, close/reopen, allocation update, profile overlay
- `server/src/utils/roomOccupancyUtils.js` — HostelRequest-only occupancy
- `server/src/controllers/adminController.js` — no User room writes; no StudentPreRegistration
- `server/src/controllers/authController.js` / `studentController.js` — overlay allocation from HostelRequest
- Removed: `StudentPreRegistration` model/controller/routes + admin PreRegistrationRequests UI
- Next: **Phase 7 migration/backfill (last)**

---

## 9. Risks & Notes

- Existing hostels may lack `code` — set codes before creating new HostelRequests.
- Older students may lack `admissionNumber` — migration must report and skip/fix these.
- Phase 6 stops writing User room/hostel fields; legacy rows still have them until Phase 7 backfill.
- Do **not** run backfill until you are ready for Phase 7 cutover verification.
- Room occupancy no longer falls back to User/history — students without a HostelRequest will not occupy beds until backfilled.

---

## 10. Quick Commands (when ready — migration last)

```bash
cd server

# 0. Read-only inspection of existing data (safe anytime)
node -r dotenv/config src/scripts/inspectMigrationData.js
node -r dotenv/config src/scripts/inspectMigrationEdgeCases.js

# 1. Assign hostel codes (Boys=BH, Girls=GH) — already done
node -r dotenv/config src/scripts/assignHostelCodes.js

# 2. Export stale-active students for review (49 in 2025-2026)
node -r dotenv/config src/scripts/exportStaleActiveStudents.js

# 3. Dry-run backfill (no writes, simulated sequences)
npm run backfill-hostel-requests:dry

# 4. Real backfill (creates masters + requests, links history, seeds counters)
npm run backfill-hostel-requests

# 5. After reviewing stale-active list: also normalize User.applicationStatus
npm run backfill-hostel-requests -- --fix-users
```



```
cd server

# 1. Review the dry run again
npm run backfill-hostel-requests:dry

# 2. Create StudentMaster and HostelRequest records
npm run backfill-hostel-requests

# 3. Verify the migrated data
node -r dotenv/config src/scripts/inspectMigrationData.js

# 4. Only after reviewing stale-active-students.csv,
# normalize User.applicationStatus values
npm run backfill-hostel-requests -- --fix-users

# 5. Final verification
node -r dotenv/config src/scripts/inspectMigrationData.js

```