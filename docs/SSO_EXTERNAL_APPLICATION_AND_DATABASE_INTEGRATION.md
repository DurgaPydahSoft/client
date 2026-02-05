# SSO External Application and Database Integration

This document describes the **external application** that will integrate with the Hostel Management System (HMS) via SSO: what it does, how it interacts with our system, and **which database collections HMS uses** to resolve users for **unified login** (student vs admin/staff).

---

## 1. What the Other Application Does

### Role of the External Application (CRM / Central Auth)

The external application acts as a **central authentication gateway** (referred to as “CRM” in the SSO Integration Guide). It:

1. **Authenticates the user** (e.g. student or staff) in its own system.
2. **Generates an encrypted SSO token** containing at least:
   - A stable user identifier (e.g. `userId`, or our internal `_id` if they use our DB).
   - **Role** (e.g. `student`, `admin`, `warden`, `principal`, etc.).
   - Optional: `portalId`, `expiresAt`.
3. **Redirects the user to our application** with the token as a query parameter:
   ```text
   https://hms.pydahsoft.in/login?token=<encrypted_token>
   ```
4. Does **not** perform the actual login into HMS; that is done by **our backend** after we verify the token and optionally look up the user in our database.

So from HMS’s perspective:

- **Input:** Encrypted token in the URL (and optionally a server-side verification call to the external app).
- **Our responsibility:** Verify the token, determine **who** the user is and **which role** they have, then either trust the token payload or **resolve the user from our database** and issue our own JWT/session.

---

## 2. How the External Application Connects With Our Database

### Typical Case: No Direct DB Access From the External App

In the standard SSO flow described in the guide:

- The external application **does not need to connect to our database**.
- It only needs to **generate a token** (signed or encrypted with a **shared secret** or key we both know).
- **We** verify the token by calling their `verify-token` API (configured via `SSO_VERIFY_URL`); we do not verify the token locally.
- After verification, we get a **user identifier** and **role** (and optionally `portalId`, `expiresAt`). We then use **our own database** to:
  - Resolve that identifier to a **User** (student) or **Admin** (staff) document.
  - Issue our own JWT and create a session so the user is “logged in” to HMS.

So the “connection” to our database is **only on our side**: our backend reads from our MongoDB (and optionally SQL) after the token is verified.

### If the External App Uses Our Database

If the external application **does** connect to our database (e.g. to pre-create users or to read identity data to build the token):

- It must use the **same MongoDB** (and optionally the same SQL credentials) as our backend.
- It should only **read** (or minimally write) the collections that define identity:
  - **Students:** `users` (User model), and optionally SQL `student_database` for credentials.
  - **Staff/Admins:** `admins` (Admin model).
- It must **not** depend on our application’s runtime; it only needs DB connectivity and the same understanding of `role` and identifiers (see below).

---

## 3. Which Collections HMS Uses (Source of Truth for Login)

HMS has **two separate identity stores** for the two types of actors. For **unified login** (one login entry point, then routing by role), we must know **which collection to use** for a given SSO payload.

### 3.1 Students → `users` Collection (MongoDB)

| Aspect | Detail |
|--------|--------|
| **Model** | `User` (`server/src/models/User.js`) |
| **MongoDB collection** | `users` (default Mongoose collection name for `User`) |
| **Role value** | `role: 'student'` |
| **How we identify the user** | `_id` (ObjectId) or `rollNumber` / `admissionNumber` (unique, case-normalized) |
| **Used for** | Student login, token validation, student-only routes |

**Relevant backend behaviour:**

- **Login:** `POST /api/auth/student/login` — looks up `User` by `rollNumber` or `admissionNumber`, checks password (MongoDB and optionally SQL), returns JWT and student payload.
- **Token validation:** `GET /api/auth/validate` — uses JWT `_id` and loads user with `User.findById(decoded._id)` via `protect` middleware; student routes expect `req.user.role === 'student'`.

So for SSO: if the token (or verification response) says **role is student**, we must resolve the user from the **`users`** collection (e.g. by `_id` or by `rollNumber`/`admissionNumber` if the token carries that).

### 3.2 Admins / Staff → `admins` Collection (MongoDB)

| Aspect | Detail |
|--------|--------|
| **Model** | `Admin` (`server/src/models/Admin.js`) |
| **MongoDB collection** | `admins` (default for `Admin`) |
| **Role values** | `super_admin`, `sub_admin`, `warden`, `principal`, `custom` (and effectively “admin” in the UI for sub_admin/admin-like roles) |
| **How we identify the user** | `_id` (ObjectId) or `username` (unique) |
| **Used for** | Admin/staff login, admin token validation, admin/warden/principal routes |

**Relevant backend behaviour:**

- **Login:** `POST /api/admin-management/login` — looks up `Admin` by `username`, checks password, returns JWT and admin payload.
- **Token validation:** `GET /api/admin-management/validate` — uses JWT `_id` and loads admin with `Admin.findById(userId)` via `adminAuth` middleware; role-specific routes use `req.admin` and `req.admin.role`.

So for SSO: if the token says the user is **not** a student (e.g. `admin`, `warden`, `principal`, `super_admin`, `sub_admin`, `custom`), we must resolve the user from the **`admins`** collection (e.g. by `_id` or by `username`).

### 3.3 Summary: Where to Look Up the User for Unified Login

| Token / response `role` | Collection to use | Model | Lookup field(s) |
|-------------------------|-------------------|--------|------------------|
| `student`               | **users**         | User   | `_id`, or `rollNumber` / `admissionNumber` |
| `super_admin`, `sub_admin`, `warden`, `principal`, `custom`, or generic `admin` | **admins** | Admin | `_id`, or `username` |

So:

- **Student** → always **User** in **`users`**.
- **Any staff/admin role** → always **Admin** in **`admins`**.

There is **no single “unified” collection** that holds both students and admins; the **role** in the SSO token (or verification response) decides which collection we query.

### 3.4 Optional: SQL Database (Students)

- **Database:** MySQL (e.g. `student_database` on RDS); connection via `server/.env` (`DB_*`).
- **Usage:** Used for **student credentials** (e.g. password hash) when the student is not yet fully synced to MongoDB or for legacy auth. Used only by **student** login path.
- **SSO:** If SSO gives us a student identity (e.g. roll number or our User `_id`), we typically only need MongoDB `users` to create the session; SQL is not required for the SSO flow unless we want to sync or validate something extra.

---

## 4. Backend Auth Endpoints (Reference)

| Purpose | Method | Path | Auth | Notes |
|---------|--------|------|------|--------|
| Student login | POST | `/api/auth/student/login` | No | Body: `rollNumber`, `password` |
| Student token validate | GET | `/api/auth/validate` | Bearer (student JWT) | Uses **User** |
| Admin login | POST | `/api/admin-management/login` | No | Body: `username`, `password` |
| Admin token validate | GET | `/api/admin-management/validate` | Bearer (admin JWT) | Uses **Admin** |
| SSO verify | POST | `/api/auth/verify-token` | No | Body: `encryptedToken`; we call `SSO_VERIFY_URL`/auth/verify-token, then resolve user from **users** or **admins** by role and return our JWT |

---

## 5. Implementing SSO on Our Side (High Level)

1. **Add** `POST /api/auth/verify-token` that:
   - Accepts `{ encryptedToken }`.
   - Verifies the token (via external app’s API or locally with shared secret).
   - Reads `userId` (or equivalent) and **role** from the payload (or API response).
   - If **role === 'student'**: load from **User** (users), e.g. `User.findById(userId)` or `User.findOne({ rollNumber })`.
   - Otherwise: load from **Admin** (admins), e.g. `Admin.findById(userId)` or `Admin.findOne({ username })`.
   - If user not found or inactive, return 401.
   - Issue our own JWT (same way as current student/admin login) and return token + user payload so the frontend can store session and redirect (e.g. to `/student` or `/admin/dashboard`).

2. **Frontend (Login page):**
   - On `/login`, read `token` from query (e.g. `?token=...`).
   - If present, call `POST /api/auth/verify-token` with that token, then on success store token and user, set `userRole`, and redirect by role (student vs admin/warden/principal) as today.

3. **External application** (their responsibilities):
   - Generate the encrypted/signed token with at least `userId`, `role`, and expiry.
   - Use an identifier that **our** backend can resolve to **users** or **admins** (e.g. our MongoDB `_id`, or `rollNumber`/`username` if we agree on that).
   - Redirect users to our login URL with `?token=<encrypted_token>`.

This document and the existing **SSO_INTEGRATION_GUIDE.md** together define what the other application does, how it can connect with our database (if at all), and in which collections (**users** vs **admins**) we determine the user for unified login.
