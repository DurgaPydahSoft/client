# Hostel Management System

A comprehensive hostel management system with advanced features for complaint tracking, student management, attendance, fee management, and more. Built with React, Node.js, and MongoDB.

## 🚀 Features

### 👨‍🎓 Student Features

#### **Complaint Management System**
- **Raise Complaints**: Submit complaints with image attachments and detailed descriptions
- **Track Status**: Real-time complaint status tracking with detailed timeline
- **AI-Powered Processing**: Automated complaint processing with AI assistance for faster resolution
- **Feedback System**: Provide feedback on complaint resolution quality
- **Complaint History**: View all past complaints and their resolutions with search and filter

**📋 Complaint Flow:**
```
Student Submits Complaint → AI Processing → Admin/Warden Review → Status Updates → Resolution → Feedback
```

**🔧 Technical Implementation:**
- Image upload with validation (5MB limit, image formats only)
- AI integration for automated response generation
- Real-time status updates via WebSocket
- Timeline tracking for complete audit trail
- Feedback collection for service improvement

#### **Leave Management System**
- **Multiple Leave Types**: Apply for Leave, Permission, or Stay-in-Hostel requests
- **QR Code System**: Generate QR codes for approved leaves with security features
- **OTP Verification**: Secure OTP-based approval system with parent notification
- **PDF Generation**: Download leave requests as PDF documents with official formatting
- **Real-time Tracking**: Track leave status and approval process with notifications
- **Parent Notification**: Automatic SMS notifications to parents in Telugu and English

**📋 Leave Request Flow:**
```
Student Applies → OTP Sent to Parent → Parent Verification → Warden Review → Principal Approval → QR Generated → Student Notified
```

**🔧 Technical Implementation:**
- Multi-step approval workflow (Student → Parent → Warden → Principal)
- QR code generation for security verification
- PDF generation with official letterhead
- SMS integration for parent notifications
- Real-time status tracking with notifications

#### **Attendance & Profile Management**
- **View Attendance**: Check personal attendance records with detailed statistics
- **Profile Management**: Update personal information and photos with validation
- **Password Reset**: Secure password reset functionality with email verification
- **Document Management**: Upload and manage profile documents with secure storage

**📋 Profile Update Flow:**
```
Student Login → Profile Section → Update Information → Photo Upload → Validation → Save → Notification
```

#### **Financial Management System**
- **Fee Payment**: Pay hostel fees through Cashfree payment gateway with multiple options
- **Payment History**: View complete payment transaction history with receipts
- **Payment Status**: Track payment status and receipts with real-time updates
- **Electricity Bills**: View and pay room electricity bills with consumption tracking

**📋 Payment Flow:**
```
Student Selects Fee → Payment Gateway → Cashfree Processing → Payment Verification → Receipt Generation → Database Update
```

**🔧 Technical Implementation:**
- Cashfree payment gateway integration
- Webhook handling for payment status updates
- Receipt generation and storage
- Payment history tracking
- Electricity bill calculation and management

#### **Campus Services**
- **Menu & Cafeteria**: View daily menu with meal ratings and nutritional information
- **Found & Lost**: Post and claim lost/found items with image support
- **Announcements**: View important announcements with priority filtering
- **Polls & Voting**: Participate in campus polls and surveys with real-time results
- **Notifications**: Real-time push notifications for all important updates

**📋 Menu Rating Flow:**
```
Student Views Menu → Rates Meal → Rating Stored → Analytics Generated → Admin Dashboard Updated
```

### 👨‍💼 Admin Features

#### **Student Management System**
- **Bulk Upload**: Upload students via Excel files with preview and validation
- **Student CRUD**: Add, edit, delete, and manage student records with comprehensive data
- **Profile Photos**: Manage student and guardian photos with secure storage
- **Batch Management**: Renew student batches and update years automatically
- **Admit Cards**: Generate individual and bulk admit cards with custom templates
- **Course Management**: Manage courses and branches with detailed information
- **Room Allocation**: Assign students to rooms and beds with availability tracking

**📋 Student Registration Flow:**
```
Excel Upload → Data Validation → Preview → Confirmation → Database Insert → Room Assignment → Notification
```

**🔧 Technical Implementation:**
- Excel file parsing with validation
- Bulk data processing with error handling
- Image upload and storage in S3
- PDF generation for admit cards
- Room allocation algorithm with constraints

#### **Complaint Administration**
- **Complaint Dashboard**: Comprehensive complaint management interface with filtering
- **AI Configuration**: Configure AI processing parameters and response templates
- **Status Management**: Update complaint status and assign to staff members
- **Analytics**: View complaint statistics and trends with detailed reports
- **Member Efficiency**: Track staff performance and efficiency metrics

**📋 Complaint Resolution Flow:**
```
Complaint Received → AI Processing → Admin Review → Staff Assignment → Resolution → Status Update → Student Notification
```

#### **Attendance Management**
- **Take Attendance**: Mark attendance for students with bulk operations
- **Attendance Reports**: Generate detailed attendance reports with analytics
- **Statistics**: View attendance analytics and trends with visual charts
- **Date Range Queries**: Filter attendance by date ranges with export options
- **Export Data**: Export attendance data in various formats (PDF, Excel, CSV)

**📋 Attendance Flow:**
```
Admin/Warden Login → Select Date → Mark Attendance → Save → Generate Report → Analytics Update
```

#### **Financial Administration**
- **Fee Structure**: Manage fee structures for different categories and academic years
- **Payment Tracking**: Monitor all payment transactions with detailed analytics
- **Electricity Bills**: Manage room electricity billing with consumption tracking
- **Fee Reminders**: Automated fee reminder system with customizable schedules
- **Payment Analytics**: View payment statistics and trends with visual reports

**📋 Fee Management Flow:**
```
Fee Structure Setup → Student Assignment → Payment Collection → Receipt Generation → Analytics Update → Reminder System
```

#### **Room Management System**
- **Room Allocation**: Manage room assignments and availability with constraints
- **Bed Management**: Track bed and locker availability with real-time updates
- **Electricity Billing**: Generate and manage electricity bills with consumption calculation
- **Room Statistics**: View room occupancy and statistics with visual charts
- **Category Management**: Manage room categories and pricing with flexible options

**📋 Room Allocation Flow:**
```
Student Registration → Room Selection → Availability Check → Assignment → Bill Generation → Notification
```

#### **System Administration**
- **Menu Management**: Create and manage cafeteria menus with images and nutritional info
- **Announcement System**: Post and manage announcements with priority levels
- **Poll Management**: Create and manage campus polls with real-time results
- **Notification System**: Send push notifications to users with targeting options
- **Feature Controls**: Enable/disable system features with granular permissions
- **Security Settings**: Configure system security parameters and access controls

### 👨‍🏫 Warden Features

#### **Leave Management**
- **Leave Approval**: Approve/reject student leave requests with detailed review
- **OTP Verification**: Verify OTPs for leave approval with security checks
- **Stay-in-Hostel**: Manage stay-in-hostel requests with approval workflow
- **Recommendations**: Provide recommendations for principal approval with comments

**📋 Warden Approval Flow:**
```
Leave Request → Warden Review → OTP Verification → Recommendation → Principal Forward → Status Update
```

#### **Attendance Management**
- **Take Attendance**: Mark daily attendance for students with bulk operations
- **View Attendance**: View attendance records and statistics with filtering
- **Attendance Reports**: Generate attendance reports with detailed analytics
- **Student Tracking**: Track student presence and movements with real-time updates

#### **Room & Billing Management**
- **Room Management**: Manage assigned rooms and students with detailed information
- **Electricity Bills**: Generate and manage electricity bills with consumption tracking
- **Fee Management**: Assist with fee collection and tracking with payment support
- **Student Support**: Provide support for student issues with direct communication

#### **Bulk Operations**
- **Bulk Outing**: Create and manage group outings with student selection
- **Student Selection**: Select students for bulk operations with filtering options
- **Outing Approval**: Manage outing requests and approvals with workflow

**📋 Bulk Outing Flow:**
```
Warden Creates Outing → Student Selection → Admin Approval → Notification → QR Generation → Tracking
```

### 👨‍🎓 Principal Features

#### **Oversight & Analytics**
- **Student Overview**: View comprehensive student information with demographics
- **Attendance Analytics**: View attendance statistics and trends with visual reports
- **Leave Management**: Approve/reject leave requests with detailed review
- **Complaint Oversight**: Monitor complaint resolution process with efficiency metrics
- **Stay-in-Hostel**: Manage stay-in-hostel requests with approval workflow

#### **Reporting & Analytics**
- **Attendance Reports**: Generate detailed attendance reports with export options
- **Student Statistics**: View student count and demographics with visual charts
- **Performance Metrics**: Track system performance and usage with analytics
- **Analytics Dashboard**: Comprehensive analytics and insights with real-time data

### 🔐 Security Features

#### **Security Dashboard**
- **Student Search**: Quick student lookup by roll number with instant results
- **Access Control**: Secure access to student information with role-based permissions
- **QR Code Scanning**: Scan leave QR codes for verification with mobile support
- **Visit Recording**: Record student visits and movements with timestamp tracking

**📋 Security Verification Flow:**
```
Student Arrives → QR Scan → Verification → Visit Recorded → Database Update → Notification
```

## 🛠 Technical Features

### **AI Integration System**
- **Complaint Processing**: AI-powered complaint analysis and response generation
- **Automated Responses**: Generate automated responses to common complaints
- **Efficiency Tracking**: Monitor AI processing efficiency and accuracy
- **Configurable AI**: Customize AI processing parameters and response templates

**📋 AI Processing Flow:**
```
Complaint Submitted → AI Analysis → Response Generation → Admin Review → Approval → Auto-Response
```

### **Real-time Communication System**
- **Push Notifications**: OneSignal integration for instant notifications across devices
- **Socket.IO**: Real-time updates and live notifications with WebSocket support
- **WebSocket Support**: Live communication between users with low latency
- **Notification Management**: Comprehensive notification system with targeting

**📋 Notification Flow:**
```
Event Triggered → Notification Service → OneSignal/Socket.IO → User Device → Display → Action
```

### **Payment Integration System**
- **Cashfree Gateway**: Secure payment processing with PCI compliance
- **Multiple Payment Methods**: Support for various payment options (UPI, Cards, Net Banking)
- **Payment Webhooks**: Automated payment status updates with real-time processing
- **Transaction History**: Complete payment transaction records with audit trail

**📋 Payment Processing Flow:**
```
Payment Initiated → Cashfree Gateway → Payment Processing → Webhook → Status Update → Receipt Generation
```

### **File Management System**
- **S3 Integration**: Amazon S3 for secure file storage with CDN support
- **Image Upload**: Support for profile and menu images with compression
- **Automatic Cleanup**: Scheduled cleanup of old files to manage storage costs
- **File Validation**: Secure file upload with validation and virus scanning

**📋 File Upload Flow:**
```
File Selected → Validation → S3 Upload → URL Generation → Database Update → CDN Distribution
```

### **QR Code System**
- **Leave QR Codes**: Generate QR codes for approved leaves with security features
- **Visit Tracking**: Record student visits using QR scanning with mobile support
- **Security Integration**: QR codes for security verification with access control
- **Mobile Support**: QR codes work on mobile devices with offline capability

**📋 QR Code Flow:**
```
Leave Approved → QR Generation → Student Download → Security Scan → Verification → Visit Recorded
```

### **Advanced Features**
- **Role-based Access**: Comprehensive role-based permissions with granular control
- **Bulk Operations**: Support for bulk data operations with progress tracking
- **Export Functionality**: Export data in various formats (PDF, Excel, CSV, JSON)
- **Analytics Dashboard**: Comprehensive analytics and reporting with visual charts
- **Mobile Responsive**: Fully responsive design for all devices with PWA support

## 🏗 Technical Stack

### **Frontend Architecture**
- **React 18**: Modern React with hooks, context, and concurrent features
- **Vite**: Fast build tool and development server with hot module replacement
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Framer Motion**: Smooth animations and transitions with performance optimization
- **Chart.js**: Data visualization and analytics with interactive charts
- **React Router**: Client-side routing with lazy loading and code splitting

### **Backend Architecture**
- **Node.js**: JavaScript runtime environment with async/await support
- **Express.js**: Web application framework with middleware support
- **MongoDB**: NoSQL database with Mongoose ODM and aggregation pipelines
- **Socket.IO**: Real-time bidirectional communication with room support
- **JWT**: JSON Web Token authentication with refresh token support
- **Multer**: File upload handling with validation and processing

### **External Services Integration**
- **OneSignal**: Push notification service with targeting and analytics
- **Cashfree**: Payment gateway integration with webhook support
- **Amazon S3**: File storage service with CDN and lifecycle policies
- **AWS Services**: Cloud infrastructure with auto-scaling and monitoring

### **Development & Deployment**
- **ESLint**: Code linting and formatting with custom rules
- **Prettier**: Code formatting with consistent style
- **Git**: Version control with branching strategy
- **Vercel**: Frontend deployment with automatic builds
- **Railway/Render**: Backend deployment with environment management

## 🔧 Environment Variables

### **Required Environment Variables**
```env
# Database Configuration
MONGODB_URI=your-mongodb-connection-string

# JWT Authentication
JWT_SECRET=your-jwt-secret-key

# AWS S3 Configuration
AWS_REGION=your-aws-region
AWS_ACCESS_KEY=your-aws-access-key
AWS_SECRET_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name

# OneSignal Configuration
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key

# Cashfree Payment Gateway
CASHFREE_CLIENT_ID=your-cashfree-client-id
CASHFREE_CLIENT_SECRET=your-cashfree-client-secret

# Email Service (Optional)
EMAIL_SERVICE=your-email-service
EMAIL_USER=your-email-username
EMAIL_PASS=your-email-password

# Server Configuration
PORT=5000
NODE_ENV=production
CLIENT_URL=your-client-url
```

## 🚀 Installation & Setup

### **Prerequisites**
- Node.js 18+ (LTS version recommended)
- MongoDB 6+ (with replica set for production)
- AWS Account (for S3 storage)
- OneSignal Account (for push notifications)
- Cashfree Account (for payment processing)

### **Backend Setup**
```bash
# Clone the repository
git clone <repository-url>
cd server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# For production
npm run build
npm start
```

### **Frontend Setup**
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# For production build
npm run build
```

## 📱 User Roles & Permissions

### **Student Role**
- **Complaint Management**: Submit, track, and provide feedback on complaints
- **Leave Management**: Apply for leaves, track status, download QR codes
- **Attendance**: View personal attendance records and statistics
- **Financial**: Pay fees, view bills, track payment history
- **Campus Services**: Access menu, polls, announcements, found/lost items

### **Admin Role**
- **System Administration**: Full system configuration and management
- **Student Management**: CRUD operations, bulk upload, profile management
- **Complaint Administration**: Process complaints, assign staff, configure AI
- **Financial Management**: Fee structure, payment tracking, billing
- **Room Management**: Room allocation, bed management, electricity billing
- **Analytics**: Comprehensive reporting and analytics dashboard

### **Warden Role**
- **Leave Management**: Approve/reject leave requests, verify OTPs
- **Attendance Tracking**: Mark attendance, generate reports, track students
- **Room Management**: Manage assigned rooms, electricity billing
- **Student Support**: Provide support, manage bulk operations
- **Bulk Operations**: Create group outings, manage student groups

### **Principal Role**
- **Oversight**: Monitor system performance and student activities
- **Leave Approval**: Final approval for leave requests
- **Analytics**: View comprehensive reports and statistics
- **Performance Tracking**: Monitor staff efficiency and system metrics
- **Strategic Planning**: Access to high-level analytics and insights

### **Security Role**
- **Student Verification**: Quick student lookup and verification
- **QR Code Scanning**: Scan and verify leave QR codes
- **Access Control**: Manage entry/exit with visit recording
- **Emergency Support**: Handle emergency situations and notifications

## 🔒 Security Features

### **Authentication & Authorization**
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Role-based Access**: Granular permissions per user role and function
- **Session Management**: Secure session handling with automatic logout
- **Password Security**: Bcrypt hashing with salt rounds for password protection

### **Data Security**
- **Input Validation**: Comprehensive input sanitization and validation
- **SQL Injection Prevention**: Parameterized queries and input filtering
- **XSS Protection**: Content Security Policy and input sanitization
- **File Upload Security**: Secure file upload with validation and scanning

### **Payment Security**
- **PCI Compliance**: Payment Card Industry compliance for payment processing
- **Encrypted Communication**: SSL/TLS encryption for all data transmission
- **Secure Webhooks**: Signed webhooks for payment status verification
- **Transaction Logging**: Complete audit trail for all payment transactions

### **Infrastructure Security**
- **HTTPS Enforcement**: All communications encrypted with SSL/TLS
- **CORS Configuration**: Proper Cross-Origin Resource Sharing setup
- **Rate Limiting**: API rate limiting to prevent abuse
- **Environment Variables**: Secure configuration management

## 📊 Analytics & Reporting

### **Complaint Analytics**
- **Trend Analysis**: Track complaint trends and patterns over time
- **Resolution Times**: Monitor average resolution times by category
- **Staff Performance**: Track staff efficiency and response times
- **Category Analysis**: Analyze complaints by type and severity

### **Attendance Analytics**
- **Attendance Trends**: Track attendance patterns and trends
- **Student Performance**: Monitor individual student attendance
- **Course Analysis**: Compare attendance across courses and batches
- **Predictive Analytics**: Identify at-risk students based on attendance

### **Financial Analytics**
- **Payment Tracking**: Monitor payment collection and trends
- **Fee Analysis**: Analyze fee collection by category and time period
- **Revenue Reports**: Generate comprehensive revenue reports
- **Outstanding Payments**: Track and manage outstanding payments

### **System Analytics**
- **User Activity**: Monitor system usage and user engagement
- **Performance Metrics**: Track system performance and response times
- **Feature Usage**: Analyze feature adoption and usage patterns
- **Error Tracking**: Monitor system errors and performance issues

## 🔄 API Documentation

Complete API documentation is available in `API_DOCUMENTATION.md` with detailed endpoints for all modules including:

### **Core Modules**
- **Authentication & Authorization**: Login, registration, password reset
- **Complaint Management**: CRUD operations, AI processing, status tracking
- **Leave Management**: Request creation, approval workflow, QR generation
- **Attendance Tracking**: Mark attendance, generate reports, analytics
- **Student Management**: CRUD operations, bulk upload, profile management

### **Financial Modules**
- **Payment Processing**: Cashfree integration, webhook handling
- **Fee Management**: Fee structure, collection, reminders
- **Electricity Billing**: Consumption tracking, bill generation
- **Financial Reports**: Analytics, reporting, export functionality

### **Administrative Modules**
- **Room Management**: Allocation, availability, billing
- **Menu Management**: Menu creation, image upload, ratings
- **Notification System**: Push notifications, real-time updates
- **System Configuration**: Feature controls, security settings

### **Analytics & Reporting**
- **Data Analytics**: Comprehensive analytics and insights
- **Report Generation**: PDF, Excel, CSV export functionality
- **Real-time Dashboards**: Live data visualization and monitoring
- **Performance Metrics**: System performance and efficiency tracking

## 🤝 Contributing

### **Development Guidelines**
1. Fork the repository and create a feature branch
2. Follow the existing code style and conventions
3. Add comprehensive tests for new features
4. Update documentation for any API changes
5. Ensure all tests pass before submitting PR

### **Code Standards**
- Use ESLint and Prettier for code formatting
- Follow React best practices and hooks guidelines
- Implement proper error handling and validation
- Add JSDoc comments for complex functions
- Maintain consistent naming conventions

### **Testing Requirements**
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance testing for heavy operations
- Security testing for authentication flows

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 📞 Support

### **Technical Support**
- Create an issue in the repository for bugs or feature requests
- Contact the development team for urgent issues
- Check the documentation for common solutions
- Join the community forum for discussions

### **Documentation**
- API Documentation: `API_DOCUMENTATION.md`
- Setup Guide: This README file
- Deployment Guide: Available in docs folder
- Troubleshooting: Common issues and solutions

---

**Built with ❤️ for efficient hostel management** 