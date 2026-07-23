# Hostel Management — Data Model Change Notice

**For:** Integrating applications that read/write student hostel data
**Change:** Hostel allocation moved off the `User` record → academic-year `HostelRequest`
**Last updated:** 2026-07-21

---

## 1. What changed and why

Previously, a student's **current hostel allocation and status lived directly on the `User` document** (fields like `hostelStatus`, `hostel`, `hostelCategory`, `room`, `roomNumber`, `bedNumber`, `lockerNumber`, plus a legacy `hostelId` like `BH26003`).

We have re-architected the system so hostel data is now **academic-year based**. Each year a student stays in the hostel is now an independent record called a **`HostelRequest`** — this is the new **source of truth** for hostel/room allocation and status. There is **no renewal**: every academic year is its own `HostelRequest`.

The `User` document now only owns **login/identity** and a lifecycle field (`applicationStatus`). It should **no longer** be read for room/hostel/bed allocation. The old `User.hostelStatus` and room fields are **deprecated** and will stop being written / be removed.

---

## 2. Old vs new model

**Old:**

```
User {
  hostelStatus: 'Active' | 'Inactive',
  hostel, hostelCategory, room, roomNumber, bedNumber, lockerNumber,
  hostelId: 'BH26003'   // legacy display id
}
```

**New:**

```
StudentMaster { admissionNumber (unique key), userId, name, rollNumber, contacts, photo }
      │
      └── HostelRequest (one per admissionNumber + academicYear)  ← SOURCE OF TRUTH
            status: 'active' | 'expired' | 'cancelled'
            hostelId, hostelCategoryId, roomId, roomNumber, bedNumber, lockerNumber,
            hostelSequenceId: 'PCEBTECHBH001'   // new canonical hostel ID
            academicYear: 'YYYY-YYYY'
```

Key points:

- Student identity is keyed by **`admissionNumber`** (via `StudentMaster`), not by the Mongo user id.
- Hostel/room/bed/locker and status are read **per academic year** from `HostelRequest`.
- The hostel ID to display is now **`hostelSequenceId`** (e.g. `PCEBTECHBH001`), not the legacy `hostelId` (e.g. `BH26003`).

---

## 3. Status field mapping (important)

The single old `User.hostelStatus` is now split into two independent concepts:

| Old (`User.hostelStatus`) | New — `HostelRequest.status` (per year) | New — `User.applicationStatus` (login only) |
|---|---|---|
| `Active` | `active` | `Active` (or `Extended`) |
| `Inactive` (expired) | `expired` | `Expired` |
| `Inactive` (NOC / vacated) | `cancelled` | `Withdrawn` |

So "is this student currently an active hostel resident for year X?" → check `HostelRequest.status === 'active'` for that `admissionNumber` + `academicYear`. Do **not** infer it from `User` anymore.

---

## 4. How to read the data going forward

**Preferred: use the API (per academic year).**

- List / filter requests:
  `GET /api/hostel-requests?academicYear=2026-2027&status=active&admissionNumber=...`
- Single request detail:
  `GET /api/hostel-requests/:id`
- Look up a student's identity:
  `GET /api/student-masters/:admissionNumber`

`GET /api/hostel-requests` supports filters: `academicYear`, `status` (`active`/`expired`/`cancelled`), `hostelId`, `hostelCategoryId`, `roomId`, `roomNumber`, `admissionNumber`, `search`, `page`, `limit`. Responses populate hostel name/code, category name, and room number.

**If you integrate directly at the DB level**, read the `hostelrequests` collection filtered by `admissionNumber` + `academicYear` instead of reading hostel fields off `users`.

---

## 5. Field mapping cheat-sheet

| You used to read (on `User`) | Now read (on `HostelRequest` for the academic year) |
|---|---|
| `hostelStatus` | `status` (`active`/`expired`/`cancelled`) |
| `hostel` | `hostelId` (populated `name`, `code`) |
| `hostelCategory` | `hostelCategoryId` |
| `room` / `roomNumber` | `roomId` / `roomNumber` |
| `bedNumber` / `lockerNumber` | `bedNumber` / `lockerNumber` |
| `hostelId` (`BH26003`) | `hostelSequenceId` (`PCEBTECHBH001`) |
| student key = Mongo `_id` | `admissionNumber` (via `StudentMaster`) |

---

## 6. Timing / compatibility

- Always scope hostel queries by **`academicYear`** (format `YYYY-YYYY`, e.g. `2026-2027`). A student can have multiple `HostelRequest` records across years.
- `(admissionNumber, academicYear)` is unique — exactly one request per student per year.
- The legacy `User.hostelStatus` / room fields may still be present on older records during transition, but they are **no longer authoritative** and will be removed. Please migrate reads to `HostelRequest` now.

---

## 7. Contact

For integration questions or to coordinate the cutover timeline, reach out to the Hostel Management team.
