# Course & Branch Migration from MongoDB to SQL - Analysis

## Current Implementation

### MongoDB Models
1. **Course Model** (`server/src/models/Course.js`)
   - Fields: `name`, `code`, `description`, `duration`, `durationUnit`, `isActive`, `createdBy`
   - Stored in MongoDB with ObjectId references
   - Has virtual relationship with branches

2. **Branch Model** (`server/src/models/Branch.js`)
   - Fields: `name`, `code`, `course` (ObjectId ref), `description`, `isActive`, `createdBy`
   - Stored in MongoDB with ObjectId reference to Course

### Current Usage Points

#### Backend Routes (`server/src/routes/courseManagementRoutes.js`)
- `GET /api/course-management/courses` - Get all active courses
- `GET /api/course-management/courses/all` - Get all courses (admin)
- `POST /api/course-management/courses` - Create course
- `PUT /api/course-management/courses/:id` - Update course
- `DELETE /api/course-management/courses/:id` - Delete course
- `GET /api/course-management/branches/:courseId` - Get branches by course
- `GET /api/course-management/branches` - Get all branches
- `GET /api/course-management/branches/all` - Get all branches (admin)
- `POST /api/course-management/branches` - Create branch
- `PUT /api/course-management/branches/:id` - Update branch
- `DELETE /api/course-management/branches/:id` - Delete branch

#### Frontend Usage
1. **CourseManagement.jsx** - Full CRUD interface for courses/branches
2. **Students.jsx** - Dropdowns for course/branch selection
3. **StudentRegistrationSQL.jsx** - Course/branch dropdowns
4. **StudentPreRegistration.jsx** - Course/branch selection
5. **FeeManagement.jsx** - Course-based fee structure management

#### Database References
- **User Model**: `course` and `branch` fields are ObjectId references
- **FeeStructure Model**: Likely references courses
- **AcademicCalendar Model**: References courses
- **Other models**: May reference courses/branches

## Migration Requirements

### Questions to Answer:
1. **SQL Database Structure**: 
   - What tables exist for courses and branches in SQL?
   - What are the column names and relationships?
   - Do they have unique identifiers (IDs)?

2. **Data Mapping**:
   - How to map SQL course/branch IDs to MongoDB ObjectIds?
   - Should we use SQL IDs directly or create a mapping table?
   - How to handle existing MongoDB references in User model?

3. **Backward Compatibility**:
   - Existing students have MongoDB ObjectId references
   - Need to maintain compatibility or migrate existing data

4. **API Changes**:
   - Remove create/update/delete endpoints?
   - Make all endpoints read-only from SQL?
   - How to handle course/branch matching in student registration?

## Proposed Migration Strategy

### Option 1: Hybrid Approach (Recommended)
- Fetch courses/branches from SQL
- Create a mapping/cache layer
- Keep MongoDB models for backward compatibility
- Gradually migrate existing references

### Option 2: Full Migration
- Remove MongoDB Course/Branch models
- Fetch directly from SQL
- Update all references to use SQL IDs
- Migrate existing student data

### Option 3: Read-Only from SQL
- Keep MongoDB models but make them read-only
- Sync from SQL periodically
- Disable create/update/delete operations

## Implementation Plan (Pending SQL Schema Review)

1. **SQL Service Extension**
   - Add functions to fetch courses from SQL
   - Add functions to fetch branches from SQL
   - Handle SQL connection and caching

2. **API Route Updates**
   - Modify GET endpoints to fetch from SQL
   - Disable/remove POST/PUT/DELETE endpoints
   - Maintain same response format for compatibility

3. **Frontend Updates**
   - Update CourseManagement page (read-only or remove)
   - Ensure all dropdowns work with SQL data
   - Update course/branch matching logic

4. **Data Migration**
   - Map existing MongoDB ObjectIds to SQL IDs
   - Update User model references
   - Handle edge cases

## Next Steps

**Please provide:**
1. SQL database schema for courses and branches tables
2. Sample data from SQL tables
3. Preferred migration approach (Option 1, 2, or 3)
4. Whether to maintain backward compatibility with existing MongoDB references










