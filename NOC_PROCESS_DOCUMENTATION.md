# NOC (No Objection Certificate) Process Documentation

## Table of Contents
1. [Overview](#overview)
2. [NOC Process Flow](#noc-process-flow)
3. [Status Stages](#status-stages)
4. [Electricity Bill Calculation](#electricity-bill-calculation)
5. [Example Scenarios](#example-scenarios)
6. [Key Features](#key-features)

---

## Overview

The NOC (No Objection Certificate) system allows students to formally request permission to vacate the hostel. The process involves multiple verification stages and includes automatic calculation and adjustment of electricity bills based on the student's vacating date.

### Key Participants
- **Student**: Initiates the NOC request
- **Warden**: Performs initial verification and enters meter readings
- **Admin**: Reviews and approves/rejects the request

---

## NOC Process Flow

### Stage 1: Student Request Submission
**Status**: `Pending Warden Verification`

1. Student submits NOC request with:
   - Reason for leaving
   - Intended vacating date
   - Required documents (if any)

2. System creates NOC record with initial status

---

### Stage 2: Warden Verification (First Level)
**Status**: `Pending Warden Verification` → `Pending Admin Approval` or `Sent for Correction`

1. Warden reviews the request
2. Warden verifies hostel clearance items:
   - Keys returned
   - Room condition checked
   - Dues cleared
   - Other checklist items

3. Warden actions:
   - **Forward to Admin**: If all checks pass
   - **Send for Correction**: If issues found (with remarks)

---

### Stage 3: Admin Review
**Status**: `Pending Admin Approval` → `Admin Approved - Pending Meter Reading` or `Sent for Correction`

1. Admin reviews the forwarded request
2. Admin actions:
   - **Approve**: Request moves to meter reading stage
   - **Send for Correction**: Returns to warden with remarks

---

### Stage 4: Meter Reading Entry
**Status**: `Admin Approved - Pending Meter Reading` → `Ready for Deactivation`

1. Request returns to warden dashboard
2. Warden enters electricity meter readings:
   - **Single Meter**: Start units and end units
   - **Dual Meter**: Meter 1 (start/end) and Meter 2 (start/end)
   - Electricity rate (or uses default)

3. System automatically calculates:
   - Consumption (units used)
   - Bill period (from last bill to vacating date)
   - Total room bill
   - Student's share (divided by number of students)

4. Status changes to `Ready for Deactivation`

---

### Stage 5: Final Approval & Student Deactivation
**Status**: `Ready for Deactivation` → `Approved`

1. Admin reviews the calculated electricity bill
2. Admin performs final approval
3. System automatically:
   - Deactivates the student account
   - Vacates the room/bed/locker
   - Updates student status to inactive

---

## Status Stages

| Status | Description | Next Action By |
|--------|-------------|----------------|
| `Pending Warden Verification` | Initial request submitted by student | Warden |
| `Pending Admin Approval` | Forwarded by warden, awaiting admin review | Admin |
| `Admin Approved - Pending Meter Reading` | Approved by admin, waiting for meter readings | Warden |
| `Ready for Deactivation` | Meter readings entered, bill calculated | Admin |
| `Approved` | Final approval, student deactivated | - |
| `Sent for Correction` | Issues found, needs correction | Student/Warden |
| `Rejected` | Request rejected | - |

---

## Electricity Bill Calculation

### Overview
The electricity bill calculation ensures that students are charged only for the period they occupied the room, and the amount is automatically adjusted when the final monthly bill is uploaded.

### Calculation Process

#### Step 1: Determine Bill Period
- **Start Date**: 
  - If previous bill exists: 1st day of month after last bill
  - If no previous bill: 1st day of current month
- **End Date**: Student's vacating date

#### Step 2: Calculate Consumption
- **Single Meter**: `Consumption = End Units - Start Units`
- **Dual Meter**: `Consumption = (Meter1 End - Meter1 Start) + (Meter2 End - Meter2 Start)`

#### Step 3: Calculate Total Room Bill
```
Total Room Bill = Consumption × Electricity Rate
```

#### Step 4: Count Students in Room
- Counts all active students in the room (including the vacating student, as they were there during the billing period)

#### Step 5: Calculate Student's Share
```
Student's Share = Total Room Bill ÷ Number of Students
```

### Adjustment in Final Monthly Bill

When the monthly electricity bill is uploaded:

1. **System checks** for approved NOCs that overlap with the billing period
2. **Subtracts** NOC student shares from total room bill
3. **Calculates** remaining amount
4. **Divides** remaining amount equally among students without NOC

**Formula**:
```
Remaining Amount = Total Room Bill - Sum of All NOC Adjustments
Amount per Remaining Student = Remaining Amount ÷ Number of Students Without NOC
```

---

## Example Scenarios

### Scenario 1: Single Student NOC (Simple Case)

**Room Details:**
- Room Number: 321
- Students: 3 (A, B, C)
- Electricity Rate: ₹5 per unit

**Last Bill:**
- Month: 2024-01
- End Units: 1000 units

**NOC Request:**
- Student: A
- Vacating Date: 2024-02-15
- Meter Reading on 2024-02-15: 1050 units

**Calculation:**

1. **Bill Period:**
   - Start: 2024-02-01
   - End: 2024-02-15
   - Days: 15 days

2. **Consumption:**
   - Start Units: 1000
   - End Units: 1050
   - Consumption: 1050 - 1000 = **50 units**

3. **Total Room Bill:**
   - Total = 50 × ₹5 = **₹250**

4. **Student's Share:**
   - Number of Students: 3
   - Student A's Share = ₹250 ÷ 3 = **₹83.33 ≈ ₹83**

5. **NOC Record Stores:**
   ```json
   {
     "consumption": 50,
     "rate": 5,
     "totalRoomBill": 250,
     "numberOfStudents": 3,
     "studentShare": 83,
     "billPeriodStart": "2024-02-01",
     "billPeriodEnd": "2024-02-15",
     "daysInPeriod": 15
   }
   ```

**When Monthly Bill is Uploaded (2024-02):**

**Monthly Bill Details:**
- Total Room Bill: ₹300
- Students: A (NOC), B, C

**Adjustment Calculation:**

1. **NOC Adjustment:**
   - Student A's NOC Share: ₹83
   - Total NOC Adjustment: ₹83

2. **Remaining Amount:**
   - Remaining = ₹300 - ₹83 = **₹217**

3. **Distribution:**
   - Students without NOC: B, C (2 students)
   - Amount per student = ₹217 ÷ 2 = **₹108.5 ≈ ₹109**

4. **Final Bill Distribution:**
   - Student A: ₹0 (already paid ₹83 via NOC, `nocAdjustment: ₹83`)
   - Student B: ₹109
   - Student C: ₹109
   - **Total: ₹0 + ₹109 + ₹109 = ₹218**
   - **Verification: ₹83 (NOC) + ₹218 (Monthly) = ₹301 ≈ ₹300 ✓**

---

### Scenario 2: Multiple Students with NOC

**Room Details:**
- Room Number: 320
- Students: 4 (A, B, C, D)
- Electricity Rate: ₹5 per unit

**Last Bill:**
- Month: 2024-01
- End Units: 2000 units

**NOC Requests:**
- Student A: Vacating 2024-02-10, Meter Reading: 2050 units
- Student B: Vacating 2024-02-20, Meter Reading: 2100 units

**Calculation for Student A:**

1. **Bill Period:** 2024-02-01 to 2024-02-10 (10 days)
2. **Consumption:** 2050 - 2000 = 50 units
3. **Total Room Bill:** 50 × ₹5 = ₹250
4. **Student's Share:** ₹250 ÷ 4 = ₹62.5 ≈ ₹63

**Calculation for Student B:**

1. **Bill Period:** 2024-02-01 to 2024-02-20 (20 days)
2. **Consumption:** 2100 - 2050 = 50 units (from Student A's end reading)
3. **Total Room Bill:** 50 × ₹5 = ₹250
4. **Student's Share:** ₹250 ÷ 4 = ₹62.5 ≈ ₹63

**When Monthly Bill is Uploaded (2024-02):**

**Monthly Bill Details:**
- Total Room Bill: ₹400
- Students: A (NOC), B (NOC), C, D

**Adjustment Calculation:**

1. **NOC Adjustments:**
   - Student A's NOC Share: ₹63
   - Student B's NOC Share: ₹63
   - Total NOC Adjustment: ₹126

2. **Remaining Amount:**
   - Remaining = ₹400 - ₹126 = **₹274**

3. **Distribution:**
   - Students without NOC: C, D (2 students)
   - Amount per student = ₹274 ÷ 2 = **₹137**

4. **Final Bill Distribution:**
   - Student A: ₹0 (`nocAdjustment: ₹63`)
   - Student B: ₹0 (`nocAdjustment: ₹63`)
   - Student C: ₹137
   - Student D: ₹137
   - **Total: ₹0 + ₹0 + ₹137 + ₹137 = ₹274**
   - **Verification: ₹126 (NOC) + ₹274 (Monthly) = ₹400 ✓**

---

### Scenario 3: Dual Meter Room

**Room Details:**
- Room Number: 209
- Meter Type: Dual Meter
- Students: 2 (A, B)
- Electricity Rate: ₹5 per unit

**Last Bill:**
- Month: 2024-01
- Meter 1 End Units: 500
- Meter 2 End Units: 300

**NOC Request:**
- Student: A
- Vacating Date: 2024-02-15
- Meter 1 Reading: 550 units
- Meter 2 Reading: 350 units

**Calculation:**

1. **Bill Period:** 2024-02-01 to 2024-02-15 (15 days)

2. **Consumption:**
   - Meter 1: 550 - 500 = 50 units
   - Meter 2: 350 - 300 = 50 units
   - Total Consumption: 50 + 50 = **100 units**

3. **Total Room Bill:**
   - Total = 100 × ₹5 = **₹500**

4. **Student's Share:**
   - Number of Students: 2
   - Student A's Share = ₹500 ÷ 2 = **₹250**

**When Monthly Bill is Uploaded (2024-02):**

**Monthly Bill Details:**
- Total Room Bill: ₹600
- Students: A (NOC), B

**Adjustment Calculation:**

1. **NOC Adjustment:**
   - Student A's NOC Share: ₹250
   - Total NOC Adjustment: ₹250

2. **Remaining Amount:**
   - Remaining = ₹600 - ₹250 = **₹350**

3. **Distribution:**
   - Students without NOC: B (1 student)
   - Amount per student = ₹350 ÷ 1 = **₹350**

4. **Final Bill Distribution:**
   - Student A: ₹0 (`nocAdjustment: ₹250`)
   - Student B: ₹350
   - **Total: ₹0 + ₹350 = ₹350**
   - **Verification: ₹250 (NOC) + ₹350 (Monthly) = ₹600 ✓**

---

### Scenario 4: All Students Have NOC

**Room Details:**
- Room Number: 101
- Students: 3 (A, B, C)
- All students have approved NOCs for the same month

**Monthly Bill Details:**
- Total Room Bill: ₹300
- All students have NOC adjustments

**Adjustment Calculation:**

1. **NOC Adjustments:**
   - Student A's NOC Share: ₹100
   - Student B's NOC Share: ₹100
   - Student C's NOC Share: ₹100
   - Total NOC Adjustment: ₹300

2. **Remaining Amount:**
   - Remaining = ₹300 - ₹300 = **₹0**

3. **Distribution:**
   - Students without NOC: None
   - All students pay ₹0 (already charged via NOC)

4. **Final Bill Distribution:**
   - Student A: ₹0 (`nocAdjustment: ₹100`)
   - Student B: ₹0 (`nocAdjustment: ₹100`)
   - Student C: ₹0 (`nocAdjustment: ₹100`)
   - **Total: ₹0 + ₹0 + ₹0 = ₹0**
   - **Verification: ₹300 (NOC) + ₹0 (Monthly) = ₹300 ✓**

---

## Key Features

### 1. Automatic Calculation
- Electricity bills are automatically calculated based on meter readings
- No manual calculation required

### 2. Proportional Billing
- Students are charged only for the period they occupied the room
- Bill period is from last bill date to vacating date

### 3. Fair Distribution
- Room bills are divided equally among all students
- NOC adjustments ensure no double-charging

### 4. Automatic Adjustment
- When monthly bills are uploaded, NOC amounts are automatically deducted
- Remaining students share only the remaining amount

### 5. Transparent Tracking
- All calculations are stored in the database
- Students can view their NOC bill details
- Admins can see adjustment breakdowns

### 6. Multi-Stage Verification
- Warden verification for hostel clearance
- Admin approval for final decision
- Meter reading entry for accurate billing

---

## Data Structure

### NOC Document Structure
```javascript
{
  student: ObjectId,
  reason: String,
  vacatingDate: Date,
  status: String,
  meterReadings: {
    meterType: String, // 'single' or 'dual'
    startUnits: Number,
    endUnits: Number,
    meter1StartUnits: Number,
    meter1EndUnits: Number,
    meter2StartUnits: Number,
    meter2EndUnits: Number,
    readingDate: Date,
    enteredBy: ObjectId
  },
  calculatedElectricityBill: {
    consumption: Number,
    rate: Number,
    totalRoomBill: Number,
    studentShare: Number,
    numberOfStudents: Number,
    total: Number, // For backward compatibility
    billPeriodStart: Date,
    billPeriodEnd: Date,
    daysInPeriod: Number,
    calculatedAt: Date
  }
}
```

### Electricity Bill Structure
```javascript
{
  month: String, // 'YYYY-MM'
  consumption: Number,
  rate: Number,
  total: Number,
  totalNOCAdjustment: Number,
  remainingAmount: Number,
  studentBills: [
    {
      studentId: ObjectId,
      studentName: String,
      studentRollNumber: String,
      amount: Number,
      nocAdjustment: Number,
      paymentStatus: String
    }
  ]
}
```

---

## Important Notes

1. **Meter Reading Accuracy**: Ensure meter readings are accurate as they directly affect bill calculations
2. **Vacating Date**: The vacating date determines the end of the billing period
3. **Student Count**: The number of students is counted at the time of meter reading entry
4. **NOC Status**: Only NOCs with status `Approved` are considered for bill adjustments
5. **Overlap Check**: System checks if NOC bill period overlaps with monthly bill period
6. **Rounding**: Amounts are rounded to nearest rupee for student shares

---

## Troubleshooting

### Issue: Student charged twice
**Solution**: Ensure NOC status is `Approved` and bill period overlaps correctly

### Issue: Incorrect student share
**Solution**: Verify number of students in room and meter readings

### Issue: NOC adjustment not applied
**Solution**: Check if NOC status is `Approved` and bill periods overlap

---

## Support

For issues or questions regarding the NOC process or electricity bill calculations, please contact the system administrator.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: System Development Team

