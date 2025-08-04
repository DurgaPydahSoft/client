# Hostel Complaint Management System

A comprehensive hostel management system with complaint tracking, menu management, attendance, and more.

## Features

### Menu Management with Image Upload
- **Image Upload**: Admins can now upload images for menu items (optional)
- **S3 Storage**: Images are stored in Amazon S3 for reliable access
- **Automatic Cleanup**: Old menu images (older than 7 days) are automatically deleted from S3
- **Image Validation**: Supports common image formats with 5MB size limit
- **Legacy Support**: Backward compatible with existing text-only menu items

#### Menu Image Features:
- Upload images when adding menu items
- Images are displayed in the menu overview
- Automatic cleanup prevents S3 storage bloat
- Error handling for failed uploads
- Responsive image display

### Other Features
- Complaint Management
- Student Management
- Attendance Tracking
- Fee Management
- Notification System
- And more...

## Technical Implementation

### Menu Image Upload Flow:
1. Admin selects image file when adding menu item
2. Image is validated (size < 5MB, image format)
3. Image is uploaded to S3 in 'menu-items' folder
4. Image URL is stored in MongoDB with menu item
5. Images are displayed in menu interface
6. Old images are automatically cleaned up after 7 days

### Backend Changes:
- Updated Menu model to support image URLs
- Added multer middleware for file uploads
- Integrated S3 upload/delete functionality
- Added automatic cleanup scheduling
- Enhanced error handling

### Frontend Changes:
- Added image upload inputs to menu forms
- Updated display to show menu item images
- Added image validation and user feedback
- Enhanced UI for image preview

## Environment Variables Required:
```
AWS_REGION=your-aws-region
AWS_ACCESS_KEY=your-aws-access-key
AWS_SECRET_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
```

## API Endpoints:
- `POST /api/cafeteria/menu/date` - Create/update menu with images
- `POST /api/cafeteria/menu/cleanup-images` - Manual cleanup trigger
- All existing menu endpoints remain unchanged 