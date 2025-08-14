# Hostel Management System API Documentation

## Base URL
```
https://hms.pydahsoft.in/api
```

## Authentication
All API endpoints require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## User Roles
- **student**: Regular student users
- **admin**: System administrators
- **super_admin**: Super administrators
- **sub_admin**: Sub-administrators
- **warden**: Hostel wardens
- **principal**: College principals
- **custom**: Custom role users

---

## 1. Authentication Module (`/api/auth`)

### Student Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/student/login` | Student login | No |
| POST | `/auth/student/verify` | Verify roll number for registration | No |
| POST | `/auth/student/register` | Complete student registration | No |
| POST | `/auth/student/reset-password` | Reset student password | Student |
| GET | `/auth/validate` | Validate JWT token | Any authenticated user |
| GET | `/auth/test` | Test authentication routes | No |

---

## 2. Complaints Module (`/api/complaints`)

### Student Complaint Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/complaints/` | Create new complaint (with image) | Student |
| GET | `/complaints/my` | Get student's complaints | Student |
| GET | `/complaints/:id` | Get complaint details | Student |
| POST | `/complaints/:id/feedback` | Give feedback on complaint | Student |
| GET | `/complaints/:id/timeline` | Get complaint timeline | Student |
| POST | `/complaints/:id/ai-process` | Process complaint with AI | Student |

### Warden Complaint Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/complaints/warden` | Create warden complaint (with image) | Warden |
| GET | `/complaints/warden` | Get warden complaints | Warden |
| GET | `/complaints/warden/:id/timeline` | Get warden complaint timeline | Warden |
| GET | `/complaints/warden/:id/details` | Get warden complaint details | Warden |

### Principal Complaint Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/complaints/principal` | Get principal complaints | Principal |
| GET | `/complaints/principal/:id/timeline` | Get principal complaint timeline | Principal |
| GET | `/complaints/principal/:id/details` | Get principal complaint details | Principal |

### Admin Complaint Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/complaints/admin/all` | Get all complaints | Admin |
| GET | `/complaints/admin/:id` | Get complaint details | Admin |
| PUT | `/complaints/admin/:id/status` | Update complaint status | Admin |
| GET | `/complaints/admin/:id/timeline` | Get complaint timeline | Admin |
| POST | `/complaints/admin/:id/ai-process` | Process complaint with AI | Admin |

### AI Configuration (Admin Only)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/complaints/admin/ai/config` | Get AI configuration | Admin |
| PUT | `/complaints/admin/ai/config` | Update AI configuration | Admin |
| GET | `/complaints/admin/ai/stats` | Get AI statistics | Admin |
| PUT | `/complaints/admin/members/:memberId/efficiency` | Update member efficiency | Admin |
| POST | `/complaints/admin/ai/quick-setup` | Quick AI setup | Admin |
| POST | `/complaints/admin/ai/toggle` | Toggle AI functionality | Admin |

---

## 3. Leave Management Module (`/api/leave`)

### Student Leave Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/leave/create` | Create leave request | Student |
| GET | `/leave/my-requests` | Get student's leave requests | Student |
| DELETE | `/leave/:id` | Delete leave request | Student |
| POST | `/leave/resend-otp` | Resend OTP | Student |
| POST | `/leave/qr-view/:id` | Request QR view | Student |
| POST | `/leave/incoming-qr-view/:id` | Request incoming QR view | Student |

### Admin Leave Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/leave/all` | Get all leave requests | Admin |
| POST | `/leave/verify-otp` | Verify OTP and approve | Admin |
| POST | `/leave/reject` | Reject leave request | Admin |

### Warden Leave Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/leave/warden/all` | Get warden leave requests | Warden |
| POST | `/leave/warden/verify-otp` | Warden verify OTP | Warden |
| POST | `/leave/warden/reject` | Warden reject leave | Warden |
| GET | `/leave/warden/stay-in-hostel` | Get stay-in-hostel requests | Warden |
| POST | `/leave/warden/recommendation` | Warden recommendation | Warden |

### Principal Leave Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/leave/principal/all` | Get principal leave requests | Principal |
| POST | `/leave/principal/approve` | Principal approve leave | Principal |
| POST | `/leave/principal/reject` | Principal reject leave | Principal |
| GET | `/leave/student/:studentId/history` | Get student leave history | Principal |
| GET | `/leave/principal/stay-in-hostel` | Get stay-in-hostel requests | Principal |
| POST | `/leave/principal/decision` | Principal decision | Principal |

### Public QR Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/leave/approved` | Get approved leaves | No |
| POST | `/leave/verify` | Update verification status | No |
| POST | `/leave/qr/:id` | Record visit (QR scan) | No |
| POST | `/leave/incoming-qr/:id` | Record incoming visit | No |
| GET | `/leave/:id` | Get leave by ID | No |

---

## 4. Attendance Module (`/api/attendance`)

### Admin/Warden Attendance Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/attendance/students` | Get students for attendance | Admin/Warden |
| POST | `/attendance/take` | Take attendance | Admin/Warden |
| GET | `/attendance/date` | Get attendance for date | Admin/Warden |
| GET | `/attendance/range` | Get attendance for date range | Admin/Warden |
| GET | `/attendance/stats` | Get attendance statistics | Admin/Warden |
| PUT | `/attendance/update` | Update attendance | Admin/Warden |
| DELETE | `/attendance/:studentId/:date` | Delete attendance | Admin/Warden |
| GET | `/attendance/report` | Generate attendance report | Admin/Warden |

### Warden-Specific Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/attendance/warden/date` | Get warden attendance for date | Warden |
| GET | `/attendance/warden/range` | Get warden attendance for range | Warden |
| GET | `/attendance/warden/report` | Generate warden report | Warden |

### Student Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/attendance/my-attendance` | Get student's attendance | Student |

### Principal Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/attendance/principal/date` | Get principal attendance for date | Principal |
| GET | `/attendance/principal/range` | Get principal attendance for range | Principal |
| GET | `/attendance/principal/stats` | Get principal attendance stats | Principal |
| GET | `/attendance/principal/students/count` | Get principal student count | Principal |
| GET | `/attendance/principal/students/by-status` | Get students by status | Principal |
| GET | `/attendance/principal/report` | Generate principal report | Principal |

---

## 5. Menu & Cafeteria Module (`/api/cafeteria/menu`)

### Admin Menu Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/cafeteria/menu/date` | Create/update menu for date | Admin |
| GET | `/cafeteria/menu/date` | Get menu for date | Admin |
| POST | `/cafeteria/menu/item` | Add menu item for date | Admin |
| DELETE | `/cafeteria/menu/item` | Delete menu item for date | Admin |
| GET | `/cafeteria/menu/ratings/stats` | Get rating statistics | Admin |
| POST | `/cafeteria/menu/cleanup-images` | Cleanup old menu images | Admin |
| POST | `/cafeteria/menu/delete-images` | Delete menu images | Admin |

### Student Menu Access
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/cafeteria/menu/today` | Get today's menu | No |
| GET | `/cafeteria/menu/today/with-ratings` | Get today's menu with ratings | Student |
| POST | `/cafeteria/menu/rate` | Submit meal rating | Student |
| GET | `/cafeteria/menu/rating` | Get user's meal rating | Student |

---

## 6. Found & Lost Module (`/api/foundlost`)

### Student Found & Lost
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/foundlost/` | Create found/lost post (with image) | Student |
| GET | `/foundlost/all` | Get all posts (public) | No |
| GET | `/foundlost/my` | Get student's posts | Student |
| GET | `/foundlost/:id` | Get post details (public) | No |
| POST | `/foundlost/:id/claim` | Claim item | Student |
| PUT | `/foundlost/:id` | Update post (with image) | Student |
| DELETE | `/foundlost/:id` | Close post | Student |

### Admin Found & Lost Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/foundlost/admin/all` | Get all posts | Admin |
| PUT | `/foundlost/admin/:id/status` | Update post status | Admin |
| GET | `/foundlost/admin/analytics` | Get analytics | Admin |

---

## 7. Student Management Module (`/api/students`)

### Admin Student Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/students/upload` | Upload students via Excel | Admin |
| POST | `/students/add` | Add student manually | Admin |
| GET | `/students/` | List all students | Admin |
| POST | `/students/renew-batch` | Renew student batches | Admin |
| PUT | `/students/:id` | Edit student | Admin |
| DELETE | `/students/:id` | Delete student | Admin |

### Student Profile Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/students/profile` | Get student profile | Student |
| PUT | `/students/profile` | Update student profile | Student |
| PUT | `/students/profile/photos` | Update profile photos | Student |

---

## 8. Admin Management Module (`/api/admin`)

### Student Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/admin/students` | Add student (with photos) | Admin |
| GET | `/admin/students` | Get all students | Admin |
| GET | `/admin/students/:id` | Get student by ID | Admin |
| PUT | `/admin/students/:id` | Update student (with photos) | Admin |
| DELETE | `/admin/students/:id` | Delete student | Admin |
| POST | `/admin/students/:id/reset-password` | Reset student password | Admin |
| POST | `/admin/students/bulk-upload-preview` | Preview bulk upload | Admin |
| POST | `/admin/students/bulk-upload-commit` | Commit bulk upload | Admin |
| GET | `/admin/students/temp-summary` | Get temp students summary | Admin |
| GET | `/admin/students/count` | Get student count | Admin |
| GET | `/admin/students/course-counts` | Get course counts | Admin |
| POST | `/admin/students/renew-batch` | Renew batches | Admin |
| POST | `/admin/students/update-years` | Update student years | Admin |

### Admit Card Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/students/admit-cards` | Get students for admit cards | Admin |
| POST | `/admin/students/bulk-admit-cards` | Generate bulk admit cards | Admin |
| POST | `/admin/students/:id/admit-card` | Generate admit card | Admin |

### Leave Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/leave/all` | Get all leave requests | Admin |
| POST | `/admin/leave/verify-otp` | Verify OTP and approve | Admin |
| POST | `/admin/leave/reject` | Reject leave request | Admin |

### Room Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/admin/rooms/:roomId/electricity` | Add electricity bill | Admin |
| GET | `/admin/rooms/:roomId/electricity` | Get electricity bills | Admin |
| GET | `/admin/rooms/:roomNumber/bed-locker-availability` | Get bed/locker availability | Admin |

### Utility Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/branches/:course` | Get branches by course | Admin |
| POST | `/admin/counters/initialize` | Initialize hostel counters | Admin |
| GET | `/admin/counters/status` | Get counter status | Admin |
| GET | `/admin/email/status` | Get email service status | Admin |
| POST | `/admin/email/test` | Test email service | Admin |

### Public Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/students/search/:rollNumber` | Search student by roll number | No |

---

## 9. Room Management Module (`/api/rooms`)

### Room Access (Admin/Student)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/rooms/` | Get all rooms | Admin/Student |

### Admin Room Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/rooms/stats` | Get room statistics | Admin |
| GET | `/rooms/bed-availability` | Get rooms with bed availability | Admin |
| GET | `/rooms/:roomId/students` | Get students in room | Admin |
| POST | `/rooms/` | Add new room | Admin |
| PUT | `/rooms/:id` | Update room | Admin |
| DELETE | `/rooms/:id` | Delete room | Admin |

### Electricity Bill Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/rooms/bulk-electricity-bills` | Add bulk electricity bills | Admin |
| POST | `/rooms/:roomId/electricity-bill` | Add/update electricity bill | Admin |
| GET | `/rooms/:roomId/electricity-bill` | Get electricity bills | Admin |
| GET | `/rooms/electricity-default-rate` | Get default electricity rate | Admin |

### Warden Room Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/rooms/warden` | Get warden rooms | Warden |
| POST | `/rooms/warden/bulk-electricity-bills` | Add bulk electricity bills | Warden |
| POST | `/rooms/warden/:roomId/electricity-bill` | Add/update electricity bill | Warden |
| GET | `/rooms/warden/:roomId/electricity-bill` | Get electricity bills | Warden |
| GET | `/rooms/warden/electricity-default-rate` | Get default electricity rate | Warden |

### Student Room Access
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/rooms/student/electricity-bills` | Get student room bills | Student |

---

## 10. Notification Module (`/api/notifications`)

### Test & Status Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/notifications/test` | Send test notification | No |
| GET | `/notifications/status` | Get notification status | No |

### Menu Notifications
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/notifications/send-menu` | Send menu notification | Any authenticated |
| POST | `/notifications/send-menu-all` | Send menu notification to all students | Admin |

### Admin Notifications
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications/admin` | Get admin notifications | Admin |
| GET | `/notifications/admin/unread` | Get unread admin notifications | Admin |
| GET | `/notifications/admin/count` | Get unread count | Admin |
| PATCH | `/notifications/admin/read-all` | Mark all as read | Admin |
| PATCH | `/notifications/admin/:id/read` | Mark as read | Admin |
| DELETE | `/notifications/admin/:id` | Delete notification | Admin |

### Warden Notifications
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications/warden` | Get warden notifications | Warden |
| GET | `/notifications/warden/unread` | Get unread warden notifications | Warden |
| GET | `/notifications/warden/count` | Get unread count | Warden |
| PATCH | `/notifications/warden/read-all` | Mark all as read | Warden |
| PATCH | `/notifications/warden/:id/read` | Mark as read | Warden |
| DELETE | `/notifications/warden/:id` | Delete notification | Warden |

### Principal Notifications
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications/principal` | Get principal notifications | Principal |
| GET | `/notifications/principal/unread` | Get unread principal notifications | Principal |
| GET | `/notifications/principal/count` | Get unread count | Principal |
| PATCH | `/notifications/principal/read-all` | Mark all as read | Principal |
| PATCH | `/notifications/principal/:id/read` | Mark as read | Principal |
| DELETE | `/notifications/principal/:id` | Delete notification | Principal |

### Student Notifications
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications/` | Get student notifications | Student |
| GET | `/notifications/unread` | Get unread notifications | Student |
| GET | `/notifications/count` | Get unread count | Student |
| PATCH | `/notifications/read-all` | Mark all as read | Student |
| PATCH | `/notifications/:id/read` | Mark as read | Student |
| DELETE | `/notifications/:id` | Delete notification | Student |

---

## 11. Announcements Module (`/api/announcements`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/announcements/` | Create announcement (with image) | Admin |
| GET | `/announcements/` | List announcements | Student |
| GET | `/announcements/warden` | List announcements (warden) | Warden |
| GET | `/announcements/admin/all` | List all announcements | Admin |
| DELETE | `/announcements/:id` | Delete announcement | Admin |

---

## 12. Polls Module (`/api/polls`)

### Admin Poll Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/polls/` | Create poll | Admin |
| GET | `/polls/admin/all` | Get all polls | Admin |
| POST | `/polls/:pollId/end` | End poll | Admin |
| DELETE | `/polls/:pollId` | Delete poll | Admin |

### Student Poll Access
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/polls/active` | Get active polls | Student |
| POST | `/polls/:pollId/vote` | Vote on poll | Student |
| GET | `/polls/:pollId/results` | Get poll results | Student |

### Warden Poll Access
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/polls/warden/active` | Get active polls | Warden |

---

## 13. Fee Structure Module (`/api/fee-structures`)

### Public Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/fee-structures/` | Get fee structures | No |
| GET | `/fee-structures/academic-years` | Get academic years | No |
| GET | `/fee-structures/stats` | Get fee structure stats | No |
| GET | `/fee-structures/admit-card/:academicYear/:category` | Get fee structure for admit card | No |
| GET | `/fee-structures/:academicYear/:category` | Get fee structure | No |

### Admin Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/fee-structures/` | Create/update fee structure | Admin |
| DELETE | `/fee-structures/:academicYear/:category` | Delete fee structure | Admin |
| POST | `/fee-structures/create-sample` | Create sample fee structures | Admin |
| POST | `/fee-structures/fix-inactive` | Fix inactive fee structures | Admin |

### Test Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/fee-structures/test` | Test fee structure | No |

---

## 14. Fee Reminders Module (`/api/fee-reminders`)

### Student Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/fee-reminders/student/:studentId` | Get student fee reminders | Student |

### Admin/Warden Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/fee-reminders/admin/all` | Get all fee reminders | Admin/Warden |
| GET | `/fee-reminders/admin/stats` | Get fee reminder stats | Admin/Warden |
| PUT | `/fee-reminders/admin/:feeReminderId/status` | Update payment status | Admin/Warden |

### Admin Only Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/fee-reminders/admin/create` | Create fee reminder | Admin |
| POST | `/fee-reminders/admin/create-all` | Create reminders for all students | Admin |

### Internal Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/fee-reminders/process` | Process automated reminders | No |
| PUT | `/fee-reminders/:feeReminderId/visibility` | Update reminder visibility | No |

---

## 15. Payment Module (`/api/payments`)

### Student Payment Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/initiate` | Initiate payment | Student |
| GET | `/payments/status/:paymentId` | Get payment status | Student |
| POST | `/payments/verify/:paymentId` | Verify payment | Student |
| GET | `/payments/history` | Get payment history | Student |
| DELETE | `/payments/cancel/:paymentId` | Cancel payment | Student |

### Admin Payment Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/payments/stats` | Get payment statistics | Admin |

### Hostel Fee Payment Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/hostel-fee` | Record hostel fee payment | Admin |
| GET | `/payments/hostel-fee/:studentId` | Get student's hostel fee payments | Admin |
| GET | `/payments/hostel-fee/history/:studentId` | Get student's own payment history | Student |
| GET | `/payments/hostel-fee/stats` | Get hostel fee payment statistics | Admin |

### Webhook Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/webhook` | Process payment webhook | No |
| POST | `/payments/webhook-test` | Test webhook endpoint | No |

---

## 16. Bulk Outing Module (`/api/bulk-outing`)

### Warden Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/bulk-outing/create` | Create bulk outing | Warden |
| GET | `/bulk-outing/warden` | Get warden bulk outings | Warden |
| GET | `/bulk-outing/warden/students` | Get students for bulk outing | Warden |

### Admin Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/bulk-outing/admin` | Get all bulk outings | Admin |
| GET | `/bulk-outing/admin/:bulkOutingId/students` | Get bulk outing students | Admin |
| POST | `/bulk-outing/admin/:bulkOutingId/approve` | Approve bulk outing | Admin |
| POST | `/bulk-outing/admin/:bulkOutingId/reject` | Reject bulk outing | Admin |

---

## 17. Push Subscriptions Module (`/api/push-subscriptions`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/push-subscriptions/` | Subscribe to push notifications | Any authenticated |
| DELETE | `/push-subscriptions/` | Unsubscribe from push notifications | Any authenticated |

---

## 18. System Health & Test Endpoints

### Health Check
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | System health check | No |

### Test Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Welcome message | No |
| GET | `/test-leave/:id` | Test leave route | No |
| GET | `/test-notification` | Test notification system | No |
| GET | `/test-onesignal` | Test OneSignal connection | No |
| POST | `/test-push-notification` | Test push notification | No |
| GET | `/api/cafeteria/menu/test` | Test menu routes | No |

---

## Error Responses

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

## Success Responses

Successful API responses follow this format:

```json
{
  "success": true,
  "message": "Success description",
  "data": {
    // Response data
  }
}
```

## File Upload

For endpoints that accept file uploads:
- Maximum file size: 5MB
- Supported formats: Images (JPEG, PNG, GIF, etc.)
- Excel files for bulk uploads
- Use `multipart/form-data` content type

## Rate Limiting

API endpoints may be subject to rate limiting. Check response headers for rate limit information.

## WebSocket Support

The system supports real-time notifications via WebSocket connections on the same server port.

---

## Notes

1. **Authentication**: All protected endpoints require a valid JWT token in the Authorization header
2. **File Uploads**: Image uploads are limited to 5MB and must be image files
3. **Role-Based Access**: Different endpoints require different user roles (student, admin, warden, principal)
4. **Real-time Features**: The system supports real-time notifications and updates
5. **AI Integration**: Complaint processing includes AI-powered features for automated responses
6. **Payment Integration**: Supports Cashfree payment gateway for electricity payments and manual hostel fee collection system
7. **Push Notifications**: Integrated with OneSignal for push notifications
8. **QR Code System**: Leave management includes QR code generation and scanning
9. **Bulk Operations**: Supports bulk uploads and operations for efficiency
10. **Reporting**: Comprehensive reporting and analytics features available

This API documentation covers all major modules of the Hostel Management System. Each endpoint is designed to handle specific functionality while maintaining security through proper authentication and authorization. 