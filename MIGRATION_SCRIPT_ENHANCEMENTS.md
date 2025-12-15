# Migration Script Enhancements - Course/Branch Migration

## Overview

The migration script `migrateCoursesBranchesToSQL.js` has been enhanced to ensure **SQL database is the single source of truth** for student course/branch data. The script now **completely overrides** MongoDB course/branch values with SQL data.

## Key Changes

### 1. **Force Update by Default**
- **Before**: Script skipped students that were already synced
- **After**: Script **always updates** all students by default (can be disabled with `--no-force`)
- **Rationale**: SQL is authoritative - MongoDB must match SQL exactly

### 2. **Complete Override Logic**
- **Before**: Only updated if there was a mismatch
- **After**: **Always replaces** MongoDB course/branch with SQL values
- **Result**: Old/incorrect ObjectIDs are completely overwritten

### 3. **Enhanced Logging**
- Added detailed replacement tracking
- Shows what was replaced: `Old Course → New Course`, `Old Branch → New Branch`
- Better statistics: `replaced`, `unchanged`, `updated` counts
- Clear indication when SQL overrides MongoDB

### 4. **Dry Run Mode**
- Added `--dry-run` flag to preview changes without modifying database
- Useful for testing and validation before actual migration

### 5. **Better Error Reporting**
- Enhanced error messages
- Detailed unmatched student reasons
- Replacement log showing exact changes

## Migration Logic Flow

```
For each student in MongoDB:
  1. Normalize identifiers (rollNumber/PIN/admissionNumber)
  2. Find student in SQL database
  3. Extract course and branch from SQL
  4. Match SQL course → MongoDB Course document
  5. Match SQL branch → MongoDB Branch document (ensuring it belongs to course)
  6. REPLACE MongoDB course/branch ObjectIDs with SQL-mapped values
  7. Update student record with SQL IDs and sync timestamp
```

## Usage

### Normal Migration (Force Update All)
```bash
cd server
npm run migrate-courses-branches
# or
node src/scripts/migrateCoursesBranchesToSQL.js
```

### Dry Run (Preview Changes)
```bash
node src/scripts/migrateCoursesBranchesToSQL.js --dry-run
```

### Skip Already-Synced Students
```bash
node src/scripts/migrateCoursesBranchesToSQL.js --no-force
```

## Example Output

```
🚀 Starting Student Course/Branch Migration from SQL...

📌 SQL Database is the SINGLE SOURCE OF TRUTH
📌 MongoDB course/branch will be COMPLETELY REPLACED with SQL values

📊 Found 1500 students in MongoDB

🔄 Processing students and syncing from SQL...

📝 Applying updates to database...
  ✅ Updated 1500/1500 students

======================================================================
📊 MIGRATION SUMMARY
======================================================================
Total Students Processed: 1500
✅ Successfully Updated: 1450
🔄 Course/Branch Replaced: 320
✓  Unchanged (SQL matches MongoDB): 130
⏭️  Skipped: 0
❌ Not Found in SQL: 30
⚠️  Invalid Identifier: 5
⚠️  Course/Branch Not Found: 15
❌ Errors: 0

🔄 COURSE/BRANCH REPLACEMENTS:
======================================================================

1. 24320CM007 - John Doe
   Course: DIPLOMA (501aaa) → DIPLOMA (507f1f77bcf86cd799439011)
   Branch: DECE (501bbb) → DCSE (507f1f77bcf86cd799439012)

2. 1234 - Jane Smith
   Course: OLD_COURSE (649abc123) → BTECH (507f1f77bcf86cd799439013)
   Branch: OLD_BRANCH (834xyz789) → CSE (507f1f77bcf86cd799439014)

✅ Migration completed!

📌 SQL Database is now the SINGLE SOURCE OF TRUTH for course/branch data
📌 All MongoDB course/branch references have been updated to match SQL
```

## Key Features

### ✅ Complete Override
- SQL values **always** override MongoDB
- No exceptions or conditions
- Old data is completely replaced

### ✅ Identifier Normalization
- Handles format variations: `24320CM007` = `24320-CM-007`
- Tries multiple identifiers: rollNumber, PIN, admissionNumber
- Normalizes hyphens, spaces, case

### ✅ Course/Branch Matching
- Exact match first, then fuzzy match (≥70% similarity)
- Ensures branch belongs to course (data integrity)
- Creates MongoDB documents if needed (backward compatibility)

### ✅ Data Integrity
- Validates branch belongs to course
- Double-checks relationships
- Prevents orphaned references

### ✅ Backward Compatibility
- Maintains MongoDB ObjectId references
- Stores SQL IDs for reference
- System can work with both formats

## Statistics Explained

- **Updated**: Total students successfully updated
- **Replaced**: Students whose course/branch was changed
- **Unchanged**: Students where SQL matches MongoDB (no change needed)
- **Not Found**: Students not found in SQL database
- **Invalid Identifier**: Students without valid rollNumber/PIN/admissionNumber
- **Course/Branch Not Found**: SQL course/branch couldn't be matched to MongoDB

## Important Notes

1. **SQL is Authoritative**: Whatever is in SQL becomes the MongoDB value
2. **No Partial Updates**: Course and branch are always updated together
3. **Year Sync**: Also updates student year from SQL if available
4. **Sync Timestamp**: Records when migration was performed
5. **Match Types**: Tracks whether match was 'exact' or 'fuzzy'

## Troubleshooting

### Students Not Found in SQL
- Check if rollNumber/PIN/admissionNumber matches SQL format
- Verify SQL database connection
- Check identifier normalization

### Course/Branch Not Matching
- Verify course/branch names match between SQL and MongoDB
- Check fuzzy matching threshold (≥70% similarity)
- Review unmatched students list for suggestions

### Migration Errors
- Check MongoDB connection
- Verify SQL database accessibility
- Review error messages for specific issues

## Next Steps

After running the migration:

1. **Verify Results**: Check replacement log for expected changes
2. **Review Unmatched**: Investigate students not found in SQL
3. **Validate Data**: Spot-check a few students to ensure correctness
4. **Monitor**: Watch for any issues in student registration/management

---

**Last Updated**: 2024  
**Script**: `server/src/scripts/migrateCoursesBranchesToSQL.js`

