# Fee Reminder System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Integration Flow](#integration-flow)
5. [Configuration Management](#configuration-management)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Setup Instructions](#setup-instructions)
9. [Usage Examples](#usage-examples)
10. [Troubleshooting](#troubleshooting)

## System Overview

The Fee Reminder System is a comprehensive solution for managing automated fee payment reminders in a hostel management system. It integrates three core components:

- **Academic Calendar**: Defines semester start dates and academic schedules
- **Reminder Config**: Manages reminder settings and term due date configurations
- **Fee Reminders**: Executes automated reminder sending based on configurations

## Architecture

### Three-Layer Integration Architecture

```
Academic Calendar (Base Layer)
         ↓
Reminder Config (Configuration Layer)
         ↓
Fee Reminders (Execution Layer)
```

### Component Relationships

1. **Academic Calendar** provides the foundation with semester start dates
2. **Reminder Config** adds course-specific and academic year-specific configurations
3. **Fee Reminders** uses both to calculate and send automated reminders

## Components

### 1. Academic Calendar (`CourseManagement.jsx`)

**Purpose**: Manages academic year and semester schedules

**Key Features**:
- Course-specific academic calendars
- Academic year management (2022-2023 to 2026-2027)
- Semester start date configuration
- Year of study filtering
- Dynamic year selection based on course duration

**Key Methods**:
- `calculateAcademicYear()`: Determines current academic year
- `getSemesterStartDate()`: Gets semester start date for calculations
- `filterAcademicCalendars()`: Filters calendars by various criteria

### 2. Reminder Config (`ReminderConfig.jsx`)

**Purpose**: Manages reminder settings and term due date configurations

**Key Features**:
- Course-specific reminder configurations
- Academic year-specific settings
- Term due date management
- Reminder schedule configuration
- Email template management

**Key Methods**:
- `calculateTermDueDates()`: Calculates due dates based on academic calendar
- `getTermDueDateConfig()`: Retrieves course-specific configurations
- `updateReminderConfig()`: Updates reminder settings

### 3. Fee Reminders (`FeeManagement.jsx`)

**Purpose**: Executes automated reminder sending

**Key Features**:
- Automated reminder scheduling
- Multi-channel notifications (Email, Push, SMS)
- Payment status synchronization
- Bulk and individual reminder sending
- Real-time status updates

**Key Methods**:
- `calculateReminderDates()`: Calculates reminder dates using academic calendar
- `sendFeeReminder()`: Sends individual reminders
- `sendBulkReminders()`: Sends bulk reminders
- `syncPaymentStatus()`: Updates payment status

## Integration Flow

### 1. Academic Calendar Integration

The fee reminder system directly queries the Academic Calendar to determine semester start dates:

```javascript
// From FeeReminder.js - calculateReminderDates method
const academicCalendar = await AcademicCalendar.findOne({
  course: student.course._id,
  academicYear: currentAcademicYear,
  semester: 'Semester 1',
  isActive: true
});

if (academicCalendar && academicCalendar.startDate) {
  const semesterStartDate = new Date(academicCalendar.startDate);
  // Calculate reminder dates based on semester start
}
```

### 2. Reminder Config Integration

The system uses Reminder Config to determine course-specific settings:

```javascript
// From ReminderConfig.js - calculateTermDueDates method
const reminderConfig = await ReminderConfig.findOne({
  course: courseId,
  academicYear: academicYear,
  isActive: true
});

if (reminderConfig && reminderConfig.termDueDateConfigs) {
  // Use course-specific configurations
}
```

### 3. Fee Reminder Execution

Fee reminders are calculated and sent based on both Academic Calendar and Reminder Config:

```javascript
// From FeeReminder.js - calculateReminderDates method
const reminderDates = {
  preDueDate: new Date(semesterStartDate.getTime() + (preDueDays * 24 * 60 * 60 * 1000)),
  dueDate: new Date(semesterStartDate.getTime() + (dueDays * 24 * 60 * 60 * 1000)),
  postDueDate: new Date(semesterStartDate.getTime() + (postDueDays * 24 * 60 * 60 * 1000))
};
```

## Configuration Management

### Term Due Date Configuration

The system supports flexible term due date configurations:

```javascript
termDueDateConfigs: [{
  course: ObjectId,
  academicYear: String,
  semester: String,
  preDueDays: Number,
  dueDays: Number,
  postDueDays: Number,
  isActive: Boolean
}]
```

### Reminder Schedule Configuration

```javascript
reminderSchedule: {
  preDueReminders: [{
    daysBefore: Number,
    isActive: Boolean
  }],
  postDueReminders: [{
    daysAfter: Number,
    isActive: Boolean
  }]
}
```

## API Endpoints

### Academic Calendar Endpoints

- `GET /api/academic-calendars` - Get all academic calendars
- `POST /api/academic-calendars` - Create new academic calendar
- `PUT /api/academic-calendars/:id` - Update academic calendar
- `DELETE /api/academic-calendars/:id` - Delete academic calendar

### Reminder Config Endpoints

- `GET /api/reminder-configs` - Get reminder configurations
- `POST /api/reminder-configs` - Create reminder configuration
- `PUT /api/reminder-configs/:id` - Update reminder configuration
- `GET /api/reminder-configs/term-due-dates` - Get term due date configs

### Fee Reminder Endpoints

- `GET /api/fee-reminders` - Get fee reminders
- `POST /api/fee-reminders` - Create fee reminder
- `PUT /api/fee-reminders/:id` - Update fee reminder
- `POST /api/fee-reminders/send` - Send fee reminder
- `POST /api/fee-reminders/send-bulk` - Send bulk reminders

## Database Schema

### Academic Calendar Schema

```javascript
{
  course: ObjectId,
  academicYear: String,
  semester: String,
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Reminder Config Schema

```javascript
{
  course: ObjectId,
  academicYear: String,
  termDueDateConfigs: [{
    course: ObjectId,
    academicYear: String,
    semester: String,
    preDueDays: Number,
    dueDays: Number,
    postDueDays: Number,
    isActive: Boolean
  }],
  reminderSchedule: {
    preDueReminders: [{
      daysBefore: Number,
      isActive: Boolean
    }],
    postDueReminders: [{
      daysAfter: Number,
      isActive: Boolean
    }]
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Fee Reminder Schema

```javascript
{
  student: ObjectId,
  course: ObjectId,
  academicYear: String,
  semester: String,
  amount: Number,
  dueDate: Date,
  reminderDates: {
    preDueDate: Date,
    dueDate: Date,
    postDueDate: Date
  },
  status: String,
  sentAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Setup Instructions

### 1. Backend Setup

1. Install required dependencies:
```bash
npm install mongoose nodemailer
```

2. Set up environment variables:
```env
MONGODB_URI=your_mongodb_connection_string
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email_username
EMAIL_PASS=your_email_password
```

3. Initialize database models:
```bash
node server/scripts/initializeCounters.js
```

### 2. Frontend Setup

1. Install required dependencies:
```bash
npm install axios react-router-dom
```

2. Set up API configuration in `utils/axios.js`

3. Configure routes in `App.jsx`

### 3. Email Service Setup

1. Configure email service in `server/src/utils/emailService.js`
2. Set up email templates
3. Test email functionality

## Usage Examples

### 1. Creating an Academic Calendar

```javascript
const academicCalendar = {
  course: "60f7b3b3b3b3b3b3b3b3b3b3",
  academicYear: "2024-2025",
  semester: "Semester 1",
  startDate: new Date("2024-08-01"),
  endDate: new Date("2024-12-31"),
  isActive: true
};
```

### 2. Configuring Reminder Settings

```javascript
const reminderConfig = {
  course: "60f7b3b3b3b3b3b3b3b3b3b3",
  academicYear: "2024-2025",
  termDueDateConfigs: [{
    course: "60f7b3b3b3b3b3b3b3b3b3b3",
    academicYear: "2024-2025",
    semester: "Semester 1",
    preDueDays: 7,
    dueDays: 30,
    postDueDays: 15,
    isActive: true
  }],
  reminderSchedule: {
    preDueReminders: [
      { daysBefore: 7, isActive: true },
      { daysBefore: 3, isActive: true }
    ],
    postDueReminders: [
      { daysAfter: 3, isActive: true },
      { daysAfter: 7, isActive: true }
    ]
  },
  isActive: true
};
```

### 3. Sending Fee Reminders

```javascript
// Send individual reminder
const reminder = await sendFeeReminder(studentId, courseId, academicYear);

// Send bulk reminders
const bulkResult = await sendBulkReminders(courseId, academicYear);
```

## Troubleshooting

### Common Issues

1. **Academic Calendar Not Found**
   - Ensure the course has an active academic calendar
   - Check if the academic year matches
   - Verify semester configuration

2. **Reminder Config Not Found**
   - Ensure reminder configuration exists for the course
   - Check if the academic year matches
   - Verify term due date configurations

3. **Email Sending Failed**
   - Check email service configuration
   - Verify email credentials
   - Check email template configuration

4. **Date Calculation Errors**
   - Verify academic calendar start dates
   - Check term due date configurations
   - Ensure proper date formatting

### Debug Steps

1. Check database connections
2. Verify API endpoints
3. Test email service
4. Check console logs for errors
5. Verify data integrity

## Best Practices

1. **Always set up Academic Calendar before configuring reminders**
2. **Test reminder configurations with small batches first**
3. **Monitor email delivery rates**
4. **Keep backup of reminder configurations**
5. **Regularly update academic calendars for new academic years**
6. **Use proper error handling in all operations**
7. **Implement logging for debugging purposes**

## Future Enhancements

1. **SMS Integration**: Add SMS reminder capabilities
2. **Push Notifications**: Implement mobile push notifications
3. **Advanced Scheduling**: Add more flexible reminder scheduling options
4. **Analytics Dashboard**: Add reminder effectiveness analytics
5. **Template Management**: Enhanced email template management
6. **Multi-language Support**: Support for multiple languages
7. **Automated Testing**: Add automated testing for reminder system


┌─────────────────────────────────────────────────────────────────┐
│                    ACADEMIC CALENDAR                            │
│  Semester 1: Jul 1, 2024         Semester 2: Jan 1, 2025       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TERM DUE DATE CONFIG                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Term 1:                                                 │    │
│  │   - Reference Semester: Semester 1 ← (selectable)       │    │
│  │   - Days from Semester Start: 5                         │    │
│  │   - Due Date: Jul 6, 2024                              │    │
│  │                                                         │    │
│  │ Term 2:                                                 │    │
│  │   - Reference Semester: Semester 1 ← (selectable)       │    │
│  │   - Days from Semester Start: 90                        │    │
│  │   - Due Date: Sep 29, 2024                             │    │
│  │                                                         │    │
│  │ Term 3:                                                 │    │
│  │   - Reference Semester: Semester 2 ← (selectable)       │    │
│  │   - Days from Semester Start: 30                        │    │
│  │   - Due Date: Jan 31, 2025                             │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘