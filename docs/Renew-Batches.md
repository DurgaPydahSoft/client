Admin selects students → Click "Renew Batches"
                              ↓
Backend stores previous fees in renewalHistory
                              ↓
Fetches new FeeStructure for new year
                              ↓
Calculates new fees (with concession)
                              ↓
Resets late fees for new year
                              ↓
Returns renewalDetails with fee changes
                              ↓
Frontend displays results in modal




Academic Year 2023-2024 has 100 Active Students
                    ↓
Admin opens Renewal Modal
                    ↓
All 100 students shown with checkboxes (all selected by default)
                    ↓
Admin UNCHECKS 5 students (those leaving hostel)
                    ↓
Clicks "Renew Batches"
                    ↓
Result:
  ✅ 95 students → RENEWED (to 2024-2025)
  ❌ 5 students → DEACTIVATED (hostelStatus = 'Inactive')





Before Renewal (2023-2024):
┌─────────────────────────────────────┐
│ concession: ₹5,000                  │
│ concessionApproved: true ✅          │
└─────────────────────────────────────┘

After Renewal to 2024-2025:
┌─────────────────────────────────────┐
│ 1. Previous ₹5,000 → ARCHIVED       │
│ 2. concession: ₹5,000               │
│ 3. concessionApproved: false ⏳     │
│ 4. concessionRequestedBy: Admin     │
│ 5. → Goes to APPROVAL QUEUE         │
└─────────────────────────────────────┘
         ↓
Super Admin sees in "Pending Approvals"
         ↓
Super Admin Approves → Fees recalculated with concession