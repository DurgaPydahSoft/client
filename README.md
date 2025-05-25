# Hostel Complaint Management System

A modern, full-stack web application for managing hostel complaints, student registrations, announcements, polls, and member assignments. Designed for clarity, efficiency, and actionable analytics for both admins and students.

---

## 🚀 Features

### Authentication & Roles
- **Role-based authentication**: Separate dashboards and permissions for Admins and Students.
- **Secure login**: JWT-based authentication, session management, and protected routes.

### Student Management
- **Bulk student upload**: Admins can upload students via Excel, with validation and summary before import.
- **Student self-service**: Students can update their profile and reset passwords.

### Complaint Management
- **Raise complaints**: Students can submit complaints by category (Canteen, Internet, Maintenance, Others) with detailed descriptions.
- **Subcategories**: Maintenance complaints support subcategories (Housekeeping, Plumbing, Electricity).
- **Complaint status tracking**: Statuses include Received, Pending, In Progress, Resolved, Closed.
- **Feedback & Reopen**: Students can provide feedback on resolution; unsatisfied feedback can reopen complaints.
- **Assignment**: Admins can assign complaints to members by category.
- **Analytics**: Admin dashboard features charts, KPIs, and filters for complaint trends and status.

### Member Management
- **Category-based members**: Admins can add, edit, and delete members for each complaint category (including "Others").
- **Minimum member enforcement**: Prevents deletion if fewer than 2 members remain in a category.

### Announcements & Polls
- **Announcements**: Admins can post announcements; students see them in their dashboard.
- **Polls**: Admins can create, schedule, and manage polls. Students can vote and view results.

### Notifications
- **Real-time notifications**: Students and admins receive updates for complaint status, announcements, and polls.

### Dashboard & Analytics
- **Admin dashboard**: Modern, responsive dashboard with:
  - Complaint and student KPIs
  - Interactive bar and pie charts (category/status)
  - Recent activity and long-pending complaints
  - Quick filters (week/month/date range)
  - Poll and announcement widgets
- **Student dashboard**: Track complaint status, view announcements, participate in polls.

### UI/UX
- **Responsive design**: Works on desktop, tablet, and mobile.
- **Modern sidebar navigation**: Collapsible, with icons and profile/logout section.
- **Loading states & error handling**: User-friendly feedback throughout.

---

## 🗂️ Data Flow & How It Works

### For Admins
- **Login** → Access the admin dashboard.
- **Student Management**: Upload students in bulk, view and manage student list.
- **Complaint Management**: View, filter, and assign complaints. Update statuses and add notes. See analytics and trends.
- **Member Management**: Add/edit/delete members for each category. Assign complaints to members.
- **Announcements & Polls**: Create, schedule, and manage announcements and polls. See engagement analytics.
- **Notifications**: Receive real-time updates for new complaints, feedback, and poll results.

### For Students
- **Login** → Access the student dashboard.
- **Raise Complaints**: Submit new complaints by category. Track status and provide feedback.
- **View Announcements**: See latest admin announcements.
- **Participate in Polls**: Vote in active polls and view results.
- **Notifications**: Get real-time updates on complaint progress and new announcements.

---

## 🛠️ Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion + Recharts
- **Backend**: Node.js + Express + Mongoose (MongoDB)
- **Real-time**: Socket.IO
- **Other**: XLSX (Excel parsing), JWT, bcrypt

---

## 📦 Project Structure

```
hostel-complaint-management/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (admin & student)
│   │   ├── context/       # React context
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   └── public/            # Static assets
└── server/                # Node.js backend
    ├── src/
    │   ├── controllers/   # Route controllers
    │   ├── models/        # MongoDB models
    │   ├── routes/        # API routes
    │   ├── middleware/    # Custom middleware
    │   ├── utils/         # Utility functions
    │   └── config/        # Configuration files
    └── uploads/           # For Excel file uploads
```

---

## ⚡ Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd hostel-complaint-management
   ```
2. **Install dependencies:**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
3. **Configure environment:**
   - Copy `.env.example` to `.env` in the `server` folder and update as needed.
4. **Run the app:**
   - Start backend: `cd server && npm run dev`
   - Start frontend: `cd client && npm run dev`
5. **Access:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

---

## 👤 Default Admin Credentials
- Username: `admin`
- Password: `admin123`

---

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details. 