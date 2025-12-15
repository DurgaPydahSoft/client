# SQL Database Integration - Student Registration Work Plan

## Overview
Integrate centralized SQL database with student registration system to auto-populate student details from SQL database using PIN Number or Admission Number.

## Requirements Summary
- **SQL Table**: `students`
- **Lookup Fields**: `pin_number` OR `admission_number`
- **Auto-population**: All fields required by MongoDB User model
- **UI**: "Fetch Details" button next to identifier field
- **Validation**: Block registration if student not found in SQL or SQL connection fails
- **Duplicate Check**: Validate student doesn't exist in MongoDB
- **Course/Branch Mapping**: Match SQL names to MongoDB ObjectIds

---

## Implementation Plan

### Phase 1: Backend Infrastructure

#### 1.1 SQL Database Connection Service
**File**: `server/src/utils/sqlService.js`
- Create MySQL connection pool using mysql2
- Use environment variables for connection
- Handle SSL connection
- Implement connection health check
- Error handling and connection retry logic

**Dependencies**: 
- Install `mysql2` package
- Add SQL credentials to `.env`

#### 1.2 SQL Student Lookup Controller
**File**: `server/src/controllers/sqlStudentController.js`
- `fetchStudentFromSQL(identifier)` - Lookup by pin_number or admission_number
- Return student data with proper field mapping
- Handle not found cases
- Handle SQL connection errors

#### 1.3 Course/Branch Matching Service
**File**: `server/src/utils/courseBranchMatcher.js`
- `matchCourse(sqlCourseName)` - Match SQL course name to MongoDB Course ObjectId
- `matchBranch(sqlBranchName, courseId)` - Match SQL branch name to MongoDB Branch ObjectId
- Implement fuzzy matching for variations
- Return best match or null if no match found

#### 1.4 API Endpoints
**File**: `server/src/routes/adminRoutes.js`
- `GET /api/admin/students/fetch-from-sql/:identifier` - Fetch student from SQL
- Add authentication middleware
- Return mapped student data

#### 1.5 Validation in addStudent
**File**: `server/src/controllers/adminController.js`
- Add SQL validation before student creation
- Check if student exists in SQL database
- Block registration if not found
- Block registration if SQL connection fails

---

### Phase 2: Frontend Integration

#### 2.1 Form Updates
**File**: `client/src/pages/admin/Students.jsx`
- Add "Admission Number" field (optional, alternative to PIN)
- Add "Fetch Details" button next to PIN/Admission Number fields
- Add loading state for SQL fetch
- Add error handling for SQL fetch failures

#### 2.2 SQL Fetch Handler
**File**: `client/src/pages/admin/Students.jsx`
- `fetchStudentFromSQL(identifier, type)` - Call backend API
- Auto-populate form fields with fetched data
- Handle course/branch ObjectId mapping
- Show success/error messages
- Disable form submission until SQL validation passes

#### 2.3 Field Mapping Logic
- Map SQL fields to form fields:
  - `student_name` → `name`
  - `pin_no` → `rollNumber`
  - `admission_number` → (store for reference)
  - `course` → `course` (with ObjectId lookup)
  - `branch` → `branch` (with ObjectId lookup)
  - `current_year` → `year`
  - `batch` → `batch`
  - `gender` (M/F) → `gender` (Male/Female)
  - `student_mobile` → `studentPhone`
  - `parent_mobile1` → `parentPhone`
  - `parent_mobile2` → `motherPhone`
  - `email` → `email` (if available in SQL)

#### 2.4 Validation Updates
- Disable "Add Student" button until SQL fetch succeeds
- Show validation errors if SQL fetch fails
- Prevent manual entry if SQL validation is required

---

### Phase 3: Field Mapping & Data Transformation

#### 3.1 Gender Mapping
- SQL: `M` → MongoDB: `Male`
- SQL: `F` → MongoDB: `Female`
- SQL: `Other` → Handle appropriately

#### 3.2 Course Name Matching
- Fetch all courses from MongoDB
- Match SQL course name to MongoDB course name
- Handle variations (e.g., "B.Tech" vs "BTECH" vs "B TECH")
- Use fuzzy matching algorithm

#### 3.3 Branch Name Matching
- Fetch branches for matched course
- Match SQL branch name to MongoDB branch name
- Handle variations and abbreviations

#### 3.4 Year Mapping
- Direct mapping: `current_year` → `year`
- Validate year is within course duration

---

### Phase 4: Error Handling & Edge Cases

#### 4.1 SQL Connection Errors
- Show clear error message
- Block registration
- Log error for debugging

#### 4.2 Student Not Found
- Show error: "Student not found in central database"
- Block registration
- Suggest checking PIN/Admission Number

#### 4.3 Course/Branch Not Matched
- Show warning: "Course/Branch not found in system"
- Allow admin to manually select course/branch
- Log unmatched courses/branches for review

#### 4.4 Duplicate Student
- Check MongoDB before SQL lookup (optional optimization)
- Show error if already registered
- Prevent duplicate registration

---

### Phase 5: Testing & Validation

#### 5.1 Unit Tests
- SQL connection service
- Course/branch matching logic
- Field mapping functions

#### 5.2 Integration Tests
- End-to-end SQL fetch flow
- Form auto-population
- Validation flow

#### 5.3 Edge Cases
- Multiple students with same PIN (shouldn't happen, but handle)
- SQL timeout scenarios
- Invalid data in SQL database
- Missing required fields in SQL

---

## File Structure

```
server/
├── src/
│   ├── utils/
│   │   ├── sqlService.js          [NEW]
│   │   └── courseBranchMatcher.js [NEW]
│   ├── controllers/
│   │   ├── sqlStudentController.js [NEW]
│   │   └── adminController.js      [MODIFY]
│   └── routes/
│       └── adminRoutes.js          [MODIFY]

client/
└── src/
    └── pages/
        └── admin/
            └── Students.jsx        [MODIFY]
```

---

## Implementation Steps

1. ✅ Install mysql2 package
2. ✅ Create SQL service utility
3. ✅ Create course/branch matcher utility
4. ✅ Create SQL student controller
5. ✅ Add API endpoint for SQL fetch
6. ✅ Update addStudent to validate against SQL
7. ✅ Update frontend form with fetch button
8. ✅ Implement field mapping and auto-population
9. ✅ Add error handling and validation
10. ✅ Test complete flow

---

## Environment Variables

Add to `.env`:
```
DB_HOST=student-database.cfu0qmo26gh3.ap-south-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=Student!0000
DB_NAME=student_database
DB_SSL=true
```

---

## Notes
- No manual entry fallback (as per requirements)
- No bulk upload changes (as per requirements)
- SQL validation is mandatory
- All fields must be mapped correctly
- Course/branch matching must be robust

