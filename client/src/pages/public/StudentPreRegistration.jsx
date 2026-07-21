import { Link } from 'react-router-dom';

/**
 * Phase 5: Public student pre-registration is retired.
 * Hostel allocation is created by admin via SQL/SDMS registration (HostelRequest).
 */
const StudentPreRegistration = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Pre-registration closed
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Student hostel requests are now created by the hostel office using SDMS
          admission details. Please contact the hostel admin to register for the
          academic year.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default StudentPreRegistration;
