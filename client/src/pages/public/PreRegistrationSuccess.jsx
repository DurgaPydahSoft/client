import { Link } from 'react-router-dom';

const PreRegistrationSuccess = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Pre-registration closed
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          This flow is no longer used. Please contact the hostel office for
          academic-year hostel registration.
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

export default PreRegistrationSuccess;
