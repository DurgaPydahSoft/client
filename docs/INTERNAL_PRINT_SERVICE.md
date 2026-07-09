# Internal Print Service API Documentation

The Internal Print Service is a centralized microservice/API hosted within the Hostel Complaint Management System. It allows the host application's frontend and authorized external applications (like Admissions) to request, render, and generate formatted PDF and HTML documents securely.

This architecture ensures print layout consistency across all institutional applications by maintaining a single source of truth for all template definitions.

---

## API Endpoint

* **URL**: `/api/print`
* **Method**: `POST`
* **Content-Type**: `application/json`

---

## Authentication

Authentication is required for all print API requests. The print service supports two authorization mechanisms:

### 1. Internal Application Key (Bearer Token)
For calls made by other backend services or external applications.
* **Header**: `Authorization: Bearer <PRINT_API_KEY>`
* **Validation**: Configured inside the code's authorized apps registry. 
* **Configured App Names**:
  - `admissions`: Configured with API key `PRINT_API_KEY_ADMISSIONS` (fallback: `adm_print_live_xxxxxxxxx`).

### 2. User Session Token (JWT)
For calls made by the Hostel Management application's own frontend client.
* **Header**: `Authorization: Bearer <JWT_TOKEN>`
* **Validation**: Validates the logged-in student or administrator session.

---

## Authorization & Permissions

The Print Service enforces strict template-level permissions. Applications are only allowed to print templates configured in their allowed templates list:

| Application / Role | Allowed Templates |
| :--- | :--- |
| **Admissions App** | `hostel-admit`, `transport-admit` |
| **HMS Frontend (Admin)** | All templates (`fee-receipt`, `hostel-admit`, `staff-guest-admit`, `transport-admit`, `live-occupancy-report`) |
| **HMS Frontend (Student)**| `fee-receipt`, `hostel-admit` (Only for their own records) |

---

## Request Formats

The request body must be a JSON object containing `template` (string) and `data` (object).

### 1. Hostel Admit Card
Generates a double-copy A4 PDF admit card for a student.
* **Template**: `"hostel-admit"`
* **Request Body**:
```json
{
  "template": "hostel-admit",
  "data": {
    "studentId": "64f25b1f5e8b4e3c983d9d11"
  }
}
```

### 2. Fee Receipt
Generates a payment receipt PDF.
* **Template**: `"fee-receipt"`
* **Request Body**:
```json
{
  "template": "fee-receipt",
  "data": {
    "receiptId": "64f25c7a5e8b4e3c983d9d33"
  }
}
```

### 3. Transport Admit Card (Bus Pass)
Generates a mock/placeholder Bus Pass PDF for the Admissions system.
* **Template**: `"transport-admit"`
* **Request Body**:
```json
{
  "template": "transport-admit",
  "data": {
    "studentId": "64f25b1f5e8b4e3c983d9d11"
  }
}
```

### 4. Staff/Guest Admit Card
Generates a double-copy A4 PDF admit card for guests and staff.
* **Template**: `"staff-guest-admit"`
* **Request Body**:
```json
{
  "template": "staff-guest-admit",
  "data": {
    "staffGuestId": "64f25d9b5e8b4e3c983d9d55"
  }
}
```

### 5. Live Occupancy Report (HTML)
Returns a formatted occupancy report HTML page with CSS styling.
* **Template**: `"live-occupancy-report"`
* **Request Body**:
```json
{
  "template": "live-occupancy-report",
  "data": {
    "students": [],
    "filters": {
      "academicYear": "2024-2025"
    },
    "isLiveMode": true
  }
}
```

---

## Responses

### Success Response
* **PDF Templates**: Returns a binary stream of the generated PDF document.
  * **Headers**:
    - `Content-Type: application/pdf`
    - `Content-Disposition: attachment; filename="<template>_<timestamp>.pdf"`
* **HTML Templates**: Returns the styled HTML string.
  * **Headers**:
    - `Content-Type: text/html`

### Error Responses

#### 400 Bad Request (Missing/Invalid Input)
```json
{
  "success": false,
  "message": "studentId is required in data"
}
```

#### 401 Unauthorized (Invalid API Key / Session Token)
```json
{
  "success": false,
  "message": "Unauthorized: Invalid token or API key"
}
```

#### 403 Forbidden (Insufficient Permissions)
```json
{
  "success": false,
  "message": "Forbidden: Application not authorized to print template 'fee-receipt'"
}
```

#### 404 Not Found (Record does not exist)
```json
{
  "success": false,
  "message": "Student record not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error while generating print document"
}
```

---

## Logging & Auditing

Every print request is tracked and logged in `/server/src/logs/print.log`.
Each log line records:
* `timestamp`: Date and time of the request (ISO 8601)
* `callingApp`: The name of the calling application (`admissions`, `hms-frontend`, etc.)
* `templateName`: Name of the template requested
* `requestedRecord`: ID of the document record requested
* `user`: Identifier of the logged-in user (if requested via user session)
* `status`: Outcome of the request (`success` or `failed`)
* `reason`: Reason for failure (if `status` is `failed`)

Example success log entry:
```json
{"timestamp":"2026-07-09T08:00:00.123Z","callingApp":"admissions","templateName":"hostel-admit","requestedRecord":"64f25b1f5e8b4e3c983d9d11","user":null,"status":"success"}
```
