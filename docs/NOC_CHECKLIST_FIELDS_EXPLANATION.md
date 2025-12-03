# NOC Checklist Item Fields Explanation

When creating a checklist item in the NOC Management → Checklist Configuration tab, here's what each field means:

## Field Descriptions

### 1. **Description** (Required) ⭐
- **What it is**: The name/title of the checklist item
- **Example values**: 
  - "Room"
  - "Key"
  - "Almirah/Locker"
  - "Hostel Fee Dues (Deposit/Mess Bill)"
  - "Caution Deposit"
- **Purpose**: This is what the warden will see when verifying NOC requests. It appears as the column header in the checklist table.

### 2. **Default Value** (Optional)
- **What it is**: A hint or placeholder value that appears in the "Checked Out" field
- **Example values**:
  - "Clear" - for items that are cleared/verified
  - "—" (dash) - for items that don't apply
  - "5000/-" - for monetary values
  - "N. Usharani" - for signature examples
- **Purpose**: Helps wardens understand what value to enter. It appears as a placeholder in the form but can be changed.

### 3. **Order**
- **What it is**: The position/sequence number of this item in the checklist
- **How it works**: 
  - Lower numbers appear first (0 = first item, 1 = second item, etc.)
  - You can also reorder items using the up/down arrows in the checklist table
- **Purpose**: Controls the display order of checklist items when wardens fill the form

### 4. **Active** (Checkbox)
- **What it is**: Whether this checklist item is currently active/enabled
- **Options**:
  - ✅ **Checked (Active)**: Item appears in the warden's verification form
  - ❌ **Unchecked (Inactive)**: Item is hidden but not deleted (can be reactivated later)
- **Purpose**: Allows you to temporarily disable items without deleting them

### 5. **Requires Remarks** (Checkbox)
- **What it is**: Whether the warden must provide additional remarks/comments for this item
- **Options**:
  - ✅ **Checked**: Warden must fill a "Remarks" field (required)
  - ❌ **Unchecked**: Remarks field is optional
- **Purpose**: For items that need additional explanation or notes
- **Example**: "Hostel Fee Dues" might require remarks like "August power bill 858 (Cleared, Paid 10/09/25)"

### 6. **Requires Signature** (Checkbox)
- **What it is**: Whether the warden must provide a signature for this item
- **Options**:
  - ✅ **Checked**: Warden must fill a "Signature" field (required)
  - ❌ **Unchecked**: Signature field is optional
- **Purpose**: For items that need official verification with signature
- **Example**: "Key" might require signature "N. Usharani" to verify who checked it

## Example Checklist Item Configuration

Based on your sample format, here's how to configure each item:

| Description | Default Value | Requires Remarks | Requires Signature | Order |
|------------|---------------|------------------|-------------------|-------|
| Room | Clear | ❌ | ❌ | 0 |
| Key | Clear | ❌ | ✅ | 1 |
| Almirah/Locker | Clear | ❌ | ❌ | 2 |
| Others | Clear | ❌ | ❌ | 3 |
| Hostel Fee Dues (Deposit/Mess Bill) | — | ✅ | ❌ | 4 |
| Caution Deposit | 5000/- | ✅ | ❌ | 5 |

## How It Appears to Warden

When a warden verifies an NOC request, they will see:

1. **S.No.**: Auto-generated (1, 2, 3...)
2. **Description**: What you entered (e.g., "Room", "Key")
3. **Checked Out**: Text field with default value as placeholder
4. **Remarks**: Text area (shown only if "Requires Remarks" is checked)
5. **Signature**: Text field (shown only if "Requires Signature" is checked)

## Tips

- **Start simple**: Create basic items first, then add requirements later
- **Use clear descriptions**: Make sure wardens understand what each item means
- **Set appropriate defaults**: Help wardens by providing common values
- **Order matters**: Put most important items first
- **Test before going live**: Create a test NOC request to see how it looks

