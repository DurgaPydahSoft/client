import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  PhoneIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const FAQ = () => {
  const [openSection, setOpenSection] = useState(null);
  const [openCategories, setOpenCategories] = useState({});
  const [showHowToApplyModal, setShowHowToApplyModal] = useState(false);

  const faqData = {
    'Leave & Permission': [
    {
      id: 'how-to-apply',
      question: 'How do I apply for leave, permission, or stay in hostel?',
      answer: 'Click the "How to Apply" button below to see a detailed guide on the application process and approval workflow.',
      isSpecial: true
    },
      {
        id: 'leave-types',
        question: 'What are the different types of leave requests?',
        answer: 'There are three types: 1) Leave - for extended absence (multiple days), 2) Permission - for short outings (same day), and 3) Stay in Hostel - for staying in hostel during holidays.'
      },
      {
        id: 'otp-verification',
        question: 'What is OTP verification?',
        answer: 'For Leave and Permission requests, an OTP (4-digit code) is sent to your parent\'s phone number. The warden will verify this OTP with your parent before forwarding to the principal for approval.'
      },
      {
        id: 'approval-time',
        question: 'How long does approval take?',
        answer: 'The approval process typically takes 1-2 business days. Leave/Permission requests go through warden OTP verification first, then principal approval. Stay in Hostel requests go through warden recommendation then principal decision.'
      },
      {
        id: 'rejection',
        question: 'What if my request is rejected?',
        answer: 'If your request is rejected, you will receive a notification with the rejection reason. You can submit a new request with updated information if needed.'
      },
      {
        id: 'emergency',
        question: 'What about emergency situations?',
        answer: 'For genuine emergencies, contact your warden directly. They can help expedite the process or provide immediate assistance.'
      }
    ],
    'QR Code System': [
      {
        id: 'qr-code',
        question: 'When can I use the QR code?',
        answer: 'QR codes are available only for approved Leave and Permission requests. They become active from the gate pass time (for leave) or permission date (for permission) and remain valid until the end of your approved period. There are two types of QR codes: 1) Outgoing QR - for exiting the hostel, and 2) Incoming QR - for re-entering the hostel after your outing.',
        isSpecial: true
      },
      {
        id: 'incoming-qr',
        question: 'How does the incoming QR code work?',
        answer: 'When you scan your outgoing QR code at the security gate to exit, an incoming QR code is automatically generated for your re-entry. This incoming QR code is valid for 24 hours or until your leave end date (whichever comes first). You can view your incoming QR code in the "Leave" section of your dashboard once it\'s generated.',
        isSpecial: true
      },
      {
        id: 'qr-usage',
        question: 'How do I use the outgoing and incoming QR codes?',
        answer: '1) Outgoing QR: Show this QR code to security when leaving the hostel. It\'s available from your gate pass time until the end of your approved period. 2) Incoming QR: Show this QR code to security when returning to the hostel. It\'s automatically generated after your first outgoing scan and expires in 24 hours or at your leave end date.',
        isSpecial: true
      },
      {
        id: 'leave-completion',
        question: 'What happens when I scan the incoming QR code?',
        answer: 'When you scan your incoming QR code to re-enter the hostel, your leave is automatically marked as "Completed" and you are removed from "On Leave" status immediately. This happens even if you return before the end date of your leave. Your attendance will no longer show as "On Leave" for that date.',
        isSpecial: true
      },
      {
        id: 'security-dashboard',
        question: 'How does the security dashboard work for leave verification?',
        answer: 'The security dashboard shows different sections: 1) Outgoing Requests - students who need to exit, 2) Incoming Requests - students who have exited and need to re-enter, 3) Completed Requests - students who have completed their leave (both exit and re-entry). Security personnel can easily identify which students need to exit vs. re-enter and manage the verification process accordingly.',
        isSpecial: true
      }
    ],
    'Complaint System': [
    {
      id: 'how-to-raise-complaint',
      question: 'How do I raise a complaint?',
      answer: 'Go to "Raise Complaint" in your dashboard, select the category (Canteen, Internet, Maintenance, or Others), provide a detailed description, and optionally attach an image. Submit the form and your complaint will be automatically processed.',
      isSpecial: true
    },
    {
      id: 'complaint-categories',
      question: 'What are the complaint categories available?',
      answer: 'There are four main categories: 1) Canteen - for food quality, service, or facility issues, 2) Internet - for connectivity or speed problems, 3) Maintenance - with subcategories for Housekeeping, Plumbing, and Electricity, and 4) Others - for any other hostel-related issues.'
    },
    {
      id: 'complaint-status-flow',
      question: 'What are the different complaint statuses?',
      answer: 'Complaints go through these statuses: 1) Received - when first submitted, 2) Pending - under review, 3) In Progress - assigned to staff and being worked on, 4) Resolved - issue has been fixed, and 5) Closed - final status after resolution.'
    },
    {
      id: 'complaint-resolution-time',
      question: 'How long does it take to resolve a complaint?',
      answer: 'Most complaints are resolved within 2-3 business days. Simple issues like internet problems may be resolved faster, while complex maintenance issues might take longer. You can track the progress in "My Complaints" section.'
    },
    {
      id: 'complaint-assignment',
      question: 'How are complaints assigned to staff?',
      answer: 'Complaints are automatically assigned to appropriate staff members based on the category. Maintenance complaints are assigned to relevant maintenance staff, canteen issues to food service staff, and internet problems to IT support.'
    },
    {
      id: 'complaint-feedback',
      question: 'How do I provide feedback on resolved complaints?',
      answer: 'Once a complaint is marked as "Resolved", you can provide feedback in the "My Complaints" section. You can rate your satisfaction (Satisfied/Not Satisfied) and add optional comments about the resolution quality.'
    },
    {
      id: 'complaint-tracking',
      question: 'How can I track my complaint progress?',
      answer: 'Go to "My Complaints" in your dashboard to see all your complaints with their current status, timeline of updates, and assigned staff. You can also view detailed information by clicking on any complaint.'
    },
    {
      id: 'complaint-image',
      question: 'Can I attach images to my complaint?',
      answer: 'Yes, you can attach one image (up to 5MB) to your complaint. This helps staff better understand the issue. Supported formats are JPG, PNG, and GIF. Images are optional but recommended for maintenance and facility issues.'
    },
    {
      id: 'complaint-updates',
      question: 'How do I know when my complaint is updated?',
      answer: 'You will receive notifications when your complaint status changes or when staff adds notes. You can also check the timeline in "My Complaints" to see all updates and notes from staff members.'
      }
    ],
    'Attendance System': [
      {
        id: 'attendance-marking',
        question: 'How is my attendance marked?',
        answer: 'Your attendance is marked three times daily: Morning, Evening, and Night sessions. Wardens and admins mark attendance during these sessions. If you are on approved leave, you are automatically marked as "On Leave" for that date.',
        isSpecial: true
      },
      {
        id: 'on-leave-status',
        question: 'What does "On Leave" status mean?',
        answer: '"On Leave" status is automatically applied when you have an approved leave for that date. This means you are excused from regular attendance marking and your attendance percentage is not affected. The status is automatically removed when you complete your leave by scanning the incoming QR code.',
        isSpecial: true
      },
      {
        id: 'attendance-sessions',
        question: 'What are the different attendance sessions?',
        answer: 'There are three attendance sessions: 1) Morning - typically early morning roll call, 2) Evening - evening attendance check, and 3) Night - late night attendance verification. You can be marked present, absent, or "On Leave" for each session.',
        isSpecial: true
      },
      {
        id: 'attendance-percentage',
        question: 'How is my attendance percentage calculated?',
        answer: 'Your attendance percentage is calculated based on the sessions you attend. If you are marked "On Leave" for a day, it doesn\'t count against your attendance percentage. The calculation excludes leave days and focuses on actual attendance during regular days.',
        isSpecial: true
      },
      {
        id: 'attendance-viewing',
        question: 'How can I view my attendance records?',
        answer: 'Go to "My Attendance" in your dashboard to view your attendance history. You can see daily attendance records, session-wise marking (Morning/Evening/Night), and your overall attendance statistics including percentage and attendance trends.',
        isSpecial: true
      },
      {
        id: 'leave-attendance-relation',
        question: 'How does leave affect my attendance?',
        answer: 'When you have an approved leave, you are automatically marked as "On Leave" for that date. This status is applied by wardens and admins during attendance marking. When you complete your leave by scanning the incoming QR code, you are immediately removed from "On Leave" status, even if you return before the end date of your leave.',
        isSpecial: true
      },
      {
        id: 'attendance-notifications',
        question: 'Do I get notifications about my attendance?',
        answer: 'You can view your attendance records anytime in the "My Attendance" section. The system tracks your attendance automatically, and you can see your attendance statistics, trends, and any "On Leave" days in your attendance history.',
        isSpecial: true
      },
      {
        id: 'attendance-disputes',
        question: 'What if there\'s an error in my attendance marking?',
        answer: 'If you notice an error in your attendance marking, contact your warden immediately. They can verify and correct attendance records. Make sure to provide the specific date and session where the error occurred.',
        isSpecial: true
      }
    ],
    'General Help': [
    {
      id: 'contact',
      question: 'Who should I contact for help?',
      answer: 'For technical issues with the app, contact the IT support. For leave-related queries, contact your warden. For urgent matters, contact the hostel office directly.'
    }
    ]
  };

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <SEO 
          title="FAQ - Student Dashboard"
          description="Frequently asked questions about hostel management system"
          keywords="FAQ, help, student guide, hostel management"
        />

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-sm sm:text-base text-gray-600">Find answers to common questions about the hostel management system</p>
        </div>

        {/* How to Apply Button */}
        <div className="mb-6 sm:mb-8 text-center">
          <button
            onClick={() => setShowHowToApplyModal(true)}
            className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg text-sm sm:text-base"
          >
            <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">How to Apply for Leave/Permission/Stay in Hostel</span>
            <span className="sm:hidden">How to Apply</span>
          </button>
        </div>

        {/* FAQ List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {Object.entries(faqData).map(([category, faqs]) => (
            <div key={category} className="border-b border-gray-200 last:border-b-0">
              {/* Category Header - Clickable */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-gray-100 transition-colors flex items-center justify-between bg-gray-50 border-b border-gray-200"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <QuestionMarkCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">{category}</span>
                </div>
                {openCategories[category] ? (
                  <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 ml-2" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 ml-2" />
                )}
              </button>
              
              {/* Questions in this category - Collapsible */}
              {openCategories[category] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {faqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border-b border-gray-200 last:border-b-0 ${
                faq.isSpecial ? 'bg-blue-50' : ''
              }`}
            >
              <button
                onClick={() => toggleSection(faq.id)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <QuestionMarkCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
                  <span className="font-medium text-gray-900 text-sm sm:text-base leading-tight">{faq.question}</span>
                </div>
                {openSection === faq.id ? (
                  <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 ml-2" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 ml-2" />
                )}
              </button>
              
              {openSection === faq.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 sm:px-6 pb-3 sm:pb-4"
                >
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{faq.answer}</p>
                </motion.div>
              )}
            </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How to Apply Modal */}
      {showHowToApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 pr-2">How to Apply for Leave/Permission/Stay in Hostel</h2>
              <button
                onClick={() => setShowHowToApplyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 sm:p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-140px)]">
              <div className="space-y-6 sm:space-y-8">
                {/* Step 1: Application Types */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
                    Types of Applications
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-1 sm:mb-2 text-sm sm:text-base">Leave</h4>
                      <p className="text-xs sm:text-sm text-blue-800">For extended absence (multiple days)</p>
                      <ul className="text-xs text-blue-700 mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                        <li>• Requires start and end dates</li>
                        <li>• Gate pass time (after 4:30 PM)</li>
                        <li>• Parent OTP verification</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-1 sm:mb-2 text-sm sm:text-base">Permission</h4>
                      <p className="text-xs sm:text-sm text-purple-800">For short outings (same day)</p>
                      <ul className="text-xs text-purple-700 mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                        <li>• Single day permission</li>
                        <li>• Out and in time required</li>
                        <li>• Parent OTP verification</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-1 sm:mb-2 text-sm sm:text-base">Stay in Hostel</h4>
                      <p className="text-xs sm:text-sm text-green-800">For staying during holidays</p>
                      <ul className="text-xs text-green-700 mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                        <li>• Holiday stay requests</li>
                        <li>• Warden recommendation</li>
                        <li>• Principal decision</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 2: Application Process */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
                    Application Process
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm sm:text-base">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Submit Request</h4>
                        <p className="text-gray-700 text-xs sm:text-sm">Fill out the application form with all required details including dates, times, and reason.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center font-semibold text-sm sm:text-base">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Initial Review</h4>
                        <p className="text-gray-700 text-xs sm:text-sm">Your request is reviewed and assigned to the appropriate authority.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm sm:text-base">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Final Approval</h4>
                        <p className="text-gray-700 text-xs sm:text-sm">After verification, your request receives final approval or rejection.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Approval Workflows */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <ShieldCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
                    Approval Workflows
                  </h3>
                  
                  {/* Leave & Permission Workflow */}
                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                      <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                      Leave & Permission Requests
                    </h4>
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">1</div>
                          <div>
                            <p className="font-medium text-blue-900 text-xs sm:text-sm">Student submits request</p>
                            <p className="text-xs text-blue-700">Fill form with dates, times, and reason</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">2</div>
                          <div>
                            <p className="font-medium text-blue-900 text-xs sm:text-sm">Warden verifies OTP with parent</p>
                            <p className="text-xs text-blue-700">4-digit OTP sent to parent's phone number</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">3</div>
                          <div>
                            <p className="font-medium text-blue-900 text-xs sm:text-sm">Principal gives final approval</p>
                            <p className="text-xs text-blue-700">Course-specific principal reviews and approves</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stay in Hostel Workflow */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                      <AcademicCapIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                      Stay in Hostel Requests
                    </h4>
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">1</div>
                          <div>
                            <p className="font-medium text-green-900 text-xs sm:text-sm">Student submits request</p>
                            <p className="text-xs text-green-700">Fill form with stay date and reason</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">2</div>
                          <div>
                            <p className="font-medium text-green-900 text-xs sm:text-sm">Warden provides recommendation</p>
                            <p className="text-xs text-green-700">Warden reviews and recommends approval/rejection</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">3</div>
                          <div>
                            <p className="font-medium text-green-900 text-xs sm:text-sm">Principal makes final decision</p>
                            <p className="text-xs text-green-700">Principal reviews recommendation and decides</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4: QR Code Workflow */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
                    QR Code Workflow
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2 sm:mb-3 text-sm sm:text-base">For Approved Leave & Permission Requests</h4>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">1</div>
                          <div>
                            <p className="font-medium text-green-900 text-xs sm:text-sm">View Outgoing QR Code</p>
                            <p className="text-xs text-green-700">Available from gate pass time until leave end date</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">2</div>
                          <div>
                            <p className="font-medium text-green-900 text-xs sm:text-sm">Scan Outgoing QR at Security Gate</p>
                            <p className="text-xs text-green-700">Show QR code to security when leaving hostel</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">3</div>
                          <div>
                            <p className="font-medium text-green-900 text-xs sm:text-sm">Incoming QR Automatically Generated</p>
                            <p className="text-xs text-green-700">Valid for 24 hours or until leave end date</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">4</div>
                          <div>
                            <p className="font-medium text-green-900 text-xs sm:text-sm">Scan Incoming QR for Re-entry</p>
                            <p className="text-xs text-green-700">Show incoming QR code to security when returning</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">5</div>
                          <div>
                            <p className="font-medium text-green-900 text-xs sm:text-sm">Leave Automatically Completed</p>
                            <p className="text-xs text-green-700">Removed from "On Leave" status immediately</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5: Important Notes */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600" />
                    Important Notes
                  </h3>
                  <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                    <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-orange-800">
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2 flex-shrink-0">•</span>
                        <span><strong>Gate Pass Time:</strong> For leave requests, gate pass must be after 4:30 PM</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2 flex-shrink-0">•</span>
                        <span><strong>Parent Contact:</strong> Ensure parent's phone number is correct for OTP verification</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2 flex-shrink-0">•</span>
                        <span><strong>Course Assignment:</strong> Requests are forwarded to principals assigned to your course</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2 flex-shrink-0">•</span>
                        <span><strong>QR Code:</strong> Available only for approved Leave and Permission requests</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2 flex-shrink-0">•</span>
                        <span><strong>Incoming QR:</strong> Automatically generated after first outgoing scan, valid for 24 hours</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2 flex-shrink-0">•</span>
                        <span><strong>Leave Completion:</strong> Scanning incoming QR automatically completes your leave</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2 flex-shrink-0">•</span>
                        <span><strong>Processing Time:</strong> Allow 1-2 business days for complete processing</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Step 6: Contact Information */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <PhoneIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-gray-600" />
                    Need Help?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Technical Issues</h4>
                      <p className="text-xs sm:text-sm text-gray-700">Contact IT support for app-related problems</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Leave Queries</h4>
                      <p className="text-xs sm:text-sm text-gray-700">Contact your warden for leave-related questions</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Urgent Matters</h4>
                      <p className="text-xs sm:text-sm text-gray-700">Contact hostel office directly for emergencies</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">General Inquiries</h4>
                      <p className="text-xs sm:text-sm text-gray-700">Check announcements or contact hostel administration</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowHowToApplyModal(false)}
                className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FAQ; 