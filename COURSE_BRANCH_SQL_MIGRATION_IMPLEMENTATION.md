# Course & Branch Migration to SQL - Implementation Summary

## Overview
Migrated courses and branches from MongoDB to SQL database using a **Hybrid Approach (Option C)**. The system now fetches courses and branches live from SQL while maintaining MongoDB compatibility for existing data.

## Implementation Details

### 1. SQL Service Extensions (`server/src/utils/sqlService.js`)
**Added Functions:**
- `fetchCoursesFromSQL()` - Fetches all active courses
- `fetchBranchesFromSQL()` - Fetches all active branches
- `fetchBranchesByCourseFromSQL(courseId)` - Fetches branches for a specific course
- `fetchCourseByIdFromSQL(courseId)` - Fetches a single course by ID
- `fetchBranchByIdFromSQL(branchId)` - Fetches a single branch by ID

### 2. Course/Branch Mapper (`server/src/utils/courseBranchMapper.js`)
**Purpose:** Maps SQL data to MongoDB-compatible format for seamless integration

**Features:**
- Caching (5-minute cache) to reduce SQL queries
- Automatic fallback to MongoDB if SQL fails
- Maps SQL IDs to `sql_XXX` format for identification
- Maintains same data structure as MongoDB models

**Key Functions:**
- `getCoursesFromSQL()` - Get all courses (mapped format)
- `getBranchesFromSQL()` - Get all branches (mapped format)
- `getBranchesByCourseFromSQL(courseId)` - Get branches by course
- `findCourseByNameOrCode()` - Find course by name/code
- `findBranchByNameOrCode()` - Find branch by name/code

### 3. Course/Branch Helper (`server/src/utils/courseBranchHelper.js`)
**Purpose:** Unified interface to get courses/branches from either SQL or MongoDB

**Functions:**
- `getCourseById(courseId)` - Handles both SQL and MongoDB IDs
- `getBranchById(branchId)` - Handles both SQL and MongoDB IDs

### 4. Updated Routes (`server/src/routes/courseManagementRoutes.js`)
**Changes:**
- ✅ `GET /api/course-management/courses` - Now fetches from SQL
- ✅ `GET /api/course-management/courses/all` - Now fetches from SQL
- ✅ `GET /api/course-management/branches` - Now fetches from SQL
- ✅ `GET /api/course-management/branches/:courseId` - Now fetches from SQL
- ✅ `GET /api/course-management/branches/all` - Now fetches from SQL
- ✅ `GET /api/course-management/courses-with-branches` - Now fetches from SQL
- ❌ `POST /api/course-management/courses` - **DISABLED** (returns 403)
- ❌ `PUT /api/course-management/courses/:id` - **DISABLED** (returns 403)
- ❌ `DELETE /api/course-management/courses/:id` - **DISABLED** (returns 403)
- ❌ `POST /api/course-management/branches` - **DISABLED** (returns 403)
- ❌ `PUT /api/course-management/branches/:id` - **DISABLED** (returns 403)
- ❌ `DELETE /api/course-management/branches/:id` - **DISABLED** (returns 403)

### 5. Updated Course/Branch Matcher (`server/src/utils/courseBranchMatcher.js`)
**Changes:**
- `matchCourse()` - Now matches against SQL courses
- `matchBranch()` - Now matches against SQL branches
- Returns SQL IDs with `sql_XXX` prefix format

### 6. User Model Updates (`server/src/models/User.js`)
**Added Fields:**
- `sqlCourseId` (Number) - Stores SQL course ID
- `sqlBranchId` (Number) - Stores SQL branch ID
- `courseMatchType` (String) - 'exact' or 'fuzzy'
- `branchMatchType` (String) - 'exact' or 'fuzzy'
- `courseMatchScore` (Number) - Match confidence score
- `branchMatchScore` (Number) - Match confidence score
- `migratedAt` (Date) - Migration timestamp

**Note:** Original `course` and `branch` ObjectId fields remain for backward compatibility

### 7. Migration Script (`server/src/scripts/migrateCoursesBranchesToSQL.js`)
**Purpose:** Maps existing MongoDB course/branch references to SQL IDs

**Features:**
- Fetches all students with course/branch references
- Matches MongoDB course names to SQL courses (exact/fuzzy)
- Matches MongoDB branch names to SQL branches (exact/fuzzy)
- Updates students with SQL IDs while preserving MongoDB references
- Generates detailed migration report

**Usage:**
```bash
cd server
npm run migrate-courses-branches
```

**Output:**
- Statistics on matched/unmatched students
- List of unmatched students with reasons
- Match type breakdown (exact/fuzzy/none)

## Data Flow

### Before (MongoDB Only):
```
Frontend → API → MongoDB Course/Branch Models → Response
```

### After (Hybrid SQL):
```
Frontend → API → SQL Database → Mapper → MongoDB-compatible format → Response
                ↓ (if SQL fails)
                MongoDB (fallback)
```

## ID Format

### SQL Courses/Branches:
- **Format:** `sql_123` (where 123 is SQL ID)
- **Example:** `sql_5` for SQL course with ID 5
- **Purpose:** Identifies SQL-sourced data while maintaining compatibility

### MongoDB Courses/Branches:
- **Format:** MongoDB ObjectId (e.g., `507f1f77bcf86cd799439011`)
- **Purpose:** Backward compatibility for existing references

## Backward Compatibility

### ✅ Maintained:
- Existing MongoDB ObjectId references in User model
- All API response formats remain the same
- Frontend code works without changes
- MongoDB models still exist (for fallback)

### 🔄 Changed:
- Data source is now SQL (with MongoDB fallback)
- Create/Update/Delete operations disabled
- Course/branch matching uses SQL data

## Migration Process

1. **Run Migration Script:**
   ```bash
   npm run migrate-courses-branches
   ```

2. **Script Actions:**
   - Fetches courses/branches from SQL
   - Matches existing MongoDB references
   - Updates students with SQL IDs
   - Preserves MongoDB ObjectIds

3. **Result:**
   - Students have both MongoDB ObjectIds and SQL IDs
   - System can work with both formats
   - Gradual migration possible

## Frontend Impact

### ✅ No Changes Required:
- All dropdowns continue to work
- Course/branch selection unchanged
- Student registration flow unchanged

### ⚠️ CourseManagement Page:
- Create/Edit/Delete buttons will show errors (403)
- Page should be updated to show read-only message
- Or remove create/edit/delete functionality

## Testing Checklist

- [ ] Test fetching courses from SQL
- [ ] Test fetching branches from SQL
- [ ] Test course/branch matching in student registration
- [ ] Test SQL fallback to MongoDB
- [ ] Run migration script
- [ ] Verify existing students still work
- [ ] Test student registration with SQL courses/branches
- [ ] Verify fee management works with SQL courses

## Next Steps

1. **Update Frontend CourseManagement Page:**
   - Make it read-only or remove create/edit/delete
   - Show message that courses/branches are managed in SQL

2. **Run Migration Script:**
   - Execute: `npm run migrate-courses-branches`
   - Review unmatched students
   - Manually fix any unmatched cases

3. **Monitor:**
   - Check SQL connection stability
   - Monitor cache performance
   - Verify all dropdowns populate correctly

## Notes

- SQL data is cached for 5 minutes to reduce database load
- MongoDB models remain for backward compatibility
- Existing student references are preserved
- New students will use SQL course/branch IDs
- System gracefully falls back to MongoDB if SQL fails








