# Hostel Complaint Management System

A comprehensive, full-stack web application for managing hostel operations including complaints, student registrations, room management, leave requests, announcements, polls, member assignments, attendance tracking, and warden oversight. Built with modern technologies and designed for efficiency, clarity, and actionable analytics for administrators, wardens, and students.

---

## 🚀 Features

### 🔐 Authentication & Role Management
- **Multi-level authentication**: Super Admin, Sub Admin, Warden, and Student roles with granular permissions
- **JWT-based security**: Secure token-based authentication with session management
- **Protected routes**: Role-based access control for all sections
- **Admin management**: Super admins can create, manage, and assign permissions to sub-admins and wardens

### 👥 Student Management
- **Bulk student upload**: Excel-based bulk registration with validation and preview
- **Student self-service**: Profile updates, password resets, and photo management
- **Batch management**: Academic year and batch tracking with renewal capabilities
- **Photo management**: Student and guardian photo uploads with S3 integration
- **Comprehensive data**: Roll numbers, courses, branches, room assignments, contact details

### 🏠 Room Management
- **Room allocation**: Gender and category-based room assignments (A+, A, B+, B, C)
- **Bed management**: Configurable bed counts per room
- **Electricity billing**: Room-wise electricity bill generation and management
- **Bulk billing**: Mass electricity bill creation with preview and confirmation
- **Bill history**: Complete billing history with edit capabilities
- **Student tracking**: View students assigned to each room

### 📝 Complaint Management
- **Multi-category complaints**: Canteen, Internet, Maintenance (Housekeeping, Plumbing, Electricity), Others
- **Status tracking**: Received → Pending → In Progress → Resolved → Closed workflow
- **Member assignment**: Category-based complaint assignment to staff members
- **Feedback system**: Student feedback with complaint reopening capability
- **Analytics dashboard**: Interactive charts, KPIs, and trend analysis
- **Long-pending alerts**: Automatic identification of overdue complaints

### 👨‍💼 Member Management
- **Category-based staff**: Assign staff members to specific complaint categories
- **Performance tracking**: Member assignment heatmap with resolution rates
- **Minimum enforcement**: Prevents deletion when fewer than 2 members remain
- **Assignment analytics**: Track member workload and efficiency

### 📢 Announcements & Polls
- **Announcement system**: Create, schedule, and manage announcements
- **Poll creation**: Multi-option polls with scheduling and result tracking
- **Student engagement**: Real-time voting and result visualization
- **Status management**: Active, scheduled, and ended content states

### 🚪 Leave Management
- **Leave requests**: Student leave application with approval workflow
- **QR code generation**: Secure QR codes for leave verification
- **Status tracking**: Pending, Approved, Rejected, Completed states
- **Security integration**: Gate pass functionality for security staff

### 🏛️ Warden Management
- **Bulk outing management**: Create and manage bulk outing requests for multiple students
- **Student oversight**: Comprehensive student management with filtering and search capabilities
- **Attendance management**: Take and view hostel attendance (morning/evening) for students, with dedicated UI for wardens and admins
- **Attendance analytics**: View attendance records, filter by date/session, and monitor student presence
- **Announcement access**: View and manage hostel announcements
- **Student status tracking**: Monitor student hostel status (Active/Inactive)
- **Filtered student views**: Course, branch, gender, category, and room-based filtering
- **Bulk outing history**: Track and review all bulk outing requests and their statuses
- **Student selection tools**: Multi-select functionality for bulk operations
- **Enhanced notifications**: Real-time, creative notifications for all key events (complaints, announcements, polls, leaves, menu, attendance)

### 🟢 Attendance Management (NEW)
- **Role-based attendance**: Wardens and Admins can take and view attendance for hostel students (morning/evening sessions)
- **Student attendance view**: Students can view their own attendance records and history
- **Modular UI**: Dedicated attendance pages for Admin, Warden, and Student roles
- **Attendance analytics**: Track attendance trends and generate reports
- **Real-time updates**: Attendance status updates reflected instantly for all roles

### 🔔 Advanced Notification System
- **OneSignal integration**: Reliable push notifications for all platforms
- **Real-time updates**: Socket.IO for instant notification delivery
- **Multi-channel**: Push notifications, in-app notifications, and email
- **Smart targeting**: Role-based and user-specific notifications
- **Notification history**: Complete notification log with read/unread status

### 📊 Analytics & Dashboard
- **Admin dashboard**: Comprehensive analytics with:
  - Real-time KPIs and metrics
  - Interactive charts (Pie, Bar, Line) using Recharts
  - Complaint trends and category analysis
  - Member performance heatmaps
  - Recent activity feeds
  - Long-pending complaint alerts
  - Poll and announcement widgets
- **Warden dashboard**: Student oversight and bulk outing management
- **Student dashboard**: Personal complaint tracking, announcements, and polls
- **Export capabilities**: PDF generation for reports and student lists

### 🎨 Modern UI/UX
- **Responsive design**: Mobile-first approach with Tailwind CSS
- **Smooth animations**: Framer Motion for enhanced user experience
- **Dark/light themes**: Adaptive color schemes
- **Loading states**: Comprehensive loading indicators and error handling
- **Accessibility**: WCAG compliant with proper focus management

---

## 🗂️ System Architecture

### For Super Admins
- **Complete system access**: All features and admin management
- **User management**: Create, edit, and manage sub-admins and wardens
- **Permission control**: Granular permission assignment
- **System monitoring**: Full analytics and system health

### For Sub Admins
- **Assigned permissions**: Access only to authorized sections
- **Student management**: Bulk upload, individual management, batch operations
- **Complaint handling**: Assignment, status updates, resolution tracking
- **Room management**: Room allocation, billing, student tracking
- **Content management**: Announcements, polls, member assignments

### For Wardens
- **Student oversight**: Comprehensive student management and monitoring
- **Bulk outing management**: Create and manage bulk outing requests
- **Attendance management**: Take and view attendance for hostel students (morning/evening)
- **Attendance analytics**: View and filter attendance records
- **Student filtering**: Advanced filtering by course, branch, gender, category, room
- **Announcement access**: View and manage hostel announcements
- **Student status tracking**: Monitor active/inactive student status
- **Bulk operations**: Multi-select functionality for student management
- **Enhanced notifications**: Receive real-time, creative notifications for all key events

### For Students
- **Self-service portal**: Profile management and photo updates
- **Complaint submission**: Category-based complaint creation
- **Status tracking**: Real-time complaint progress monitoring
- **Leave requests**: Application and approval tracking
- **Attendance view**: View personal attendance records and history
- **Engagement**: Announcements, polls, and notifications

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite for fast development
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth interactions
- **Charts**: Recharts for data visualization
- **Notifications**: OneSignal SDK v16 for push notifications
- **Real-time**: Socket.IO client for live updates
- **PDF Generation**: jsPDF with auto-table for reports
- **Excel Handling**: XLSX for bulk data operations
- **Routing**: React Router DOM v6 with protected routes
- **State Management**: React Context API with custom hooks

### Backend
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js with middleware architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs for password hashing
- **Real-time**: Socket.IO server for live communication
- **File Upload**: Multer with AWS S3 integration
- **Validation**: Express-validator for input sanitization
- **Notifications**: OneSignal REST API integration
- **QR Codes**: QRCode library for leave management
- **Utilities**: Moment.js for date handling, UUID for unique IDs

### DevOps & Services
- **Cloud Storage**: AWS S3 for file management
- **Push Notifications**: OneSignal for cross-platform notifications
- **Deployment**: Vercel for frontend, various hosting for backend
- **Environment**: Dotenv for configuration management
- **Development**: Nodemon for auto-restart, ESLint for code quality

---

## 📦 Project Structure

```
hostel-complaint-management/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── PushNotificationInitializer.jsx
│   │   │   └── ...
│   │   ├── pages/                  # Page components
│   │   │   ├── admin/             # Admin dashboard pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Students.jsx
│   │   │   │   ├── Complaints.jsx
│   │   │   │   ├── RoomManagement.jsx
│   │   │   │   ├── LeaveManagement.jsx
│   │   │   │   ├── TakeAttendance.jsx      # Admin: Take attendance
│   │   │   │   ├── ViewAttendance.jsx      # Admin: View attendance
│   │   │   │   └── ...
│   │   │   ├── student/           # Student dashboard pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── RaiseComplaint.jsx
│   │   │   │   ├── Leave.jsx
│   │   │   │   ├── MyAttendance.jsx        # Student: View own attendance
│   │   │   │   └── ...
│   │   │   ├── warden/            # Warden dashboard pages
│   │   │   │   ├── WardenDashboard.jsx
│   │   │   │   ├── TakeAttendance.jsx     # Warden: Take attendance
│   │   │   │   ├── ViewAttendance.jsx     # Warden: View attendance
│   │   │   │   └── ...
│   │   │   └── security/          # Security dashboard
│   │   ├── context/               # React context providers
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── utils/                 # Utility functions
│   │   └── routes/                # Route configurations
│   ├── public/                    # Static assets
│   │   ├── OneSignalSDKWorker.js  # OneSignal service worker
│   │   └── ...
│   └── package.json
├── server/                         # Node.js backend
│   ├── src/
│   │   ├── controllers/           # Route controllers
│   │   │   ├── adminController.js
│   │   │   ├── complaintController.js
│   │   │   ├── roomController.js
│   │   │   ├── leaveController.js
│   │   │   ├── notificationController.js
│   │   │   ├── wardenController.js
│   │   │   ├── attendanceController.js    # Attendance controller (NEW)
│   │   │   └── ...
│   │   ├── models/                # MongoDB models
│   │   │   ├── User.js
│   │   │   ├── Complaint.js
│   │   │   ├── Room.js
│   │   │   ├── Leave.js
│   │   │   ├── Notification.js
│   │   │   ├── BulkOuting.js
│   │   │   ├── Attendance.js             # Attendance model (NEW)
│   │   │   └── ...
│   │   ├── routes/                # API routes
│   │   │   ├── adminRoutes.js
│   │   │   ├── complaintRoutes.js
│   │   │   ├── roomRoutes.js
│   │   │   ├── wardenRoutes.js
│   │   │   ├── attendanceRoutes.js       # Attendance routes (NEW)
│   │   │   └── ...
│   │   ├── middleware/            # Custom middleware
│   │   │   └── authMiddleware.js
│   │   ├── utils/                 # Utility services
│   │   │   ├── oneSignalService.js
│   │   │   ├── notificationService.js
│   │   │   └── ...
│   │   ├── config/                # Configuration files
│   │   ├── scripts/               # Database scripts
│   │   └── index.js               # Main server file
│   ├── uploads/                   # File upload directory
│   └── package.json
├── README.md
├── NOTIFICATION_SYSTEM_REFACTOR.md
├── ONESIGNAL_DEBUG_GUIDE.md
└── new_updates.txt
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB database
- OneSignal account (for push notifications)
- AWS S3 bucket (for file storage)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd hostel-complaint-management
```

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration:
# MONGODB_URI=your-mongodb-connection-string
# JWT_SECRET=your-jwt-secret
# ONESIGNAL_APP_ID=your-onesignal-app-id
# ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key
# AWS_ACCESS_KEY_ID=your-aws-access-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret-key
# AWS_BUCKET_NAME=your-s3-bucket-name

# Create super admin
npm run create-super-admin

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration:
# VITE_API_URL=http://localhost:5000
# VITE_ONESIGNAL_APP_ID=your-onesignal-app-id

# Start development server
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Default Super Admin**: 
  - Username: `admin`
  - Password: `admin123`

---

## 🔧 Environment Configuration

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/hostel-management

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# OneSignal Push Notifications
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key

# AWS S3 File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BUCKET_NAME=your-s3-bucket-name
AWS_REGION=us-east-1

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:5000

# OneSignal Configuration
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id
```

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd client
npm run build
# Deploy to Vercel or your preferred hosting
```

### Backend (Various Options)
```bash
cd server
npm run build
# Deploy to Heroku, Railway, DigitalOcean, or your preferred hosting
```

---

## 📋 Upcoming Features

Based on the development roadmap:

1. **Electricity Bill Preview**: Enhanced billing module with preview and confirmation
2. **Bulk Billing Management**: Improved room-wise billing interface
3. **Enhanced Gate Pass**: Permission requests and leave approval integration
4. **Batch Renewal**: Academic year renewal with registration updates
5. **Email Notifications**: Comprehensive email integration
6. **Profile Pictures**: Enhanced photo management system
7. **Security Dashboard**: Advanced search and student verification
8. **Menu Management**: Breakfast and meal menu system
9. **Enhanced Analytics**: More detailed reporting and insights
10. **Warden Mobile App**: Dedicated mobile application for wardens
11. **Advanced Bulk Outing**: Enhanced bulk outing with approval workflows
12. **Warden Notifications**: Real-time notifications for warden-specific events
13. **Student Attendance**: Track student attendance and presence in hostel (ENHANCED)
14. **Warden Reports**: Comprehensive reporting for warden activities

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and patterns
- Add proper error handling and validation
- Include comprehensive documentation
- Test thoroughly before submitting

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

For technical support or questions:
- Check the documentation in the project files
- Review the notification system guides
- Examine the debug guides for troubleshooting
- Create an issue in the repository

---

**Built with ❤️ by the Hostel Management Team** 