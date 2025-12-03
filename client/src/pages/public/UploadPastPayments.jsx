import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../utils/axios';

const UploadIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const UploadPastPayments = () => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [editableData, setEditableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a valid Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setPreviewData(null);
      setUploadResults(null);
      setShowPreview(false);
    }
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select an Excel file first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/upload-past-payments/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout for large Excel files
      });

      if (res.data.success) {
        setPreviewData(res.data.data);
        setEditableData(res.data.data.validPayments || []);
        setShowPreview(true);
        toast.success(`Preview loaded: ${res.data.data.summary.validCount} valid, ${res.data.data.summary.invalidCount} invalid`);
      } else {
        toast.error(res.data.message || 'Failed to generate preview');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate preview');
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select an Excel file first');
      return;
    }

    if (!previewData || previewData.validPayments.length === 0) {
      toast.error('No valid payments to upload. Please preview the file first.');
      return;
    }

    const shouldProceed = window.confirm(
      `You are about to upload ${previewData.summary.validCount} payment(s).\n\n` +
      `This action cannot be undone. Do you want to proceed?`
    );

    if (!shouldProceed) {
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/upload-past-payments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout for large Excel files
      });

      if (res.data.success) {
        setUploadResults(res.data.data);
        toast.success(res.data.message || 'Payments uploaded successfully!');
        setShowPreview(false);
      } else {
        toast.error(res.data.message || 'Failed to upload payments');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload payments');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setEditableData([]);
    setUploadResults(null);
    setShowPreview(false);
    // Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 lg:mb-8">
          <img
            src="/PYDAH_LOGO_PHOTO.jpg"
            alt="Pydah Logo"
            className="mx-auto mb-4 h-20 sm:h-24 object-contain"
          />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">
            Upload Past Fee Payments
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Upload historical fee payment data from Excel sheet
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-3">Excel File Format</h3>
          <p className="text-xs sm:text-sm text-gray-700 mb-2">
            Your Excel file should contain the following columns (supports multiple column name formats):
          </p>
          <ul className="text-xs sm:text-sm text-gray-700 list-disc list-inside space-y-1">
            <li><strong>AdmnNo / Roll Number</strong> (Required) - Student admission/roll number</li>
            <li><strong>Amount</strong> (Required) - Payment amount</li>
            <li><strong>TransDate / Payment Date</strong> (Required) - Date of payment (DD/MM/YYYY format or Excel date)</li>
            <li><strong>PayMode / Payment Mode</strong> (Optional) - If "bank" then marked as "Online", otherwise "Cash"</li>
            <li><strong>Payment Method</strong> (Optional, defaults to "Cash") - Cash, Online, card, upi, netbanking, wallet, or other</li>
            <li><strong>Academic Year</strong> (Optional, auto-inferred from date) - Format: YYYY-YYYY (e.g., 2024-2025)</li>
            <li><strong>Term</strong> (Optional) - term1, term2, or term3. If not provided, auto-deduction will apply</li>
            <li><strong>RecNo / Receipt Number</strong> (Optional) - Receipt/Record number</li>
            <li><strong>Transaction ID</strong> (Optional) - Transaction ID</li>
            <li><strong>UTR Number</strong> (Optional) - UTR number for online payments</li>
            <li><strong>Notes</strong> (Optional) - Additional notes</li>
          </ul>
          <p className="text-xs sm:text-sm text-gray-600 mt-3 italic">
            Note: The system will automatically match students by their roll number (AdmnNo). Academic year will be inferred from the payment date if not provided.
          </p>
        </div>

        {/* File Upload Section */}
        {!showPreview && !uploadResults && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
            <form onSubmit={handlePreview} className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border-2 border-dashed border-gray-300">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <UploadIcon />
                  </div>
                  <label htmlFor="file-input" className="cursor-pointer">
                    <span className="text-sm sm:text-base font-medium text-blue-600 hover:text-blue-700">
                      {file ? file.name : 'Click to select Excel file'}
                    </span>
                    <input
                      id="file-input"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    Supported formats: .xlsx, .xls (Max 5MB)
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={!file || loading}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Preview Data'
                  )}
                </button>
                {file && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Preview Section */}
        {showPreview && previewData && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Preview Results</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Total Rows</p>
                  <p className="text-lg font-semibold text-blue-900">{previewData.summary.totalRows}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Valid</p>
                  <p className="text-lg font-semibold text-green-900">{previewData.summary.validCount}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Invalid</p>
                  <p className="text-lg font-semibold text-red-900">{previewData.summary.invalidCount}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Total Amount</p>
                  <p className="text-lg font-semibold text-yellow-900">
                    ₹{previewData.validPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Valid Payments */}
            {previewData.validPayments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-gray-900 mb-3">Valid Payments ({previewData.validPayments.length})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-gray-700">Row</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700">Roll Number</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700">Student</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700">Amount</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700">Method</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700">Date</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700">Term</th>
                        {previewData.validPayments.some(p => p.warnings) && (
                          <th className="px-2 py-2 text-left font-medium text-gray-700">Warnings</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.validPayments.map((payment, idx) => (
                        <tr key={idx} className={payment.warnings ? 'bg-yellow-50' : ''}>
                          <td className="px-2 py-2 text-gray-900">{payment.rowIndex}</td>
                          <td className="px-2 py-2 text-gray-900 font-medium">{payment.rollNumber}</td>
                          <td className="px-2 py-2 text-gray-900">{payment.student?.name || 'N/A'}</td>
                          <td className="px-2 py-2 text-gray-900">₹{payment.amount?.toLocaleString()}</td>
                          <td className="px-2 py-2 text-gray-900">{payment.paymentMethod}</td>
                          <td className="px-2 py-2 text-gray-900">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-gray-900">{payment.term || 'Auto'}</td>
                          {previewData.validPayments.some(p => p.warnings) && (
                            <td className="px-2 py-2">
                              {payment.warnings && (
                                <div className="text-yellow-700 text-xs">
                                  {Object.values(payment.warnings).join(', ')}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Invalid Payments */}
            {previewData.invalidPayments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-red-900 mb-3">Invalid Payments ({previewData.invalidPayments.length})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-red-700">Row</th>
                        <th className="px-2 py-2 text-left font-medium text-red-700">Roll Number</th>
                        <th className="px-2 py-2 text-left font-medium text-red-700">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.invalidPayments.map((payment, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2 text-gray-900">{payment.rowIndex}</td>
                          <td className="px-2 py-2 text-gray-900">{payment.rollNumber || 'N/A'}</td>
                          <td className="px-2 py-2 text-red-700">
                            {payment.errors && Object.values(payment.errors).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
              <button
                onClick={handleUpload}
                disabled={previewData.validPayments.length === 0 || uploading}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : `Upload ${previewData.validPayments.length} Payment(s)`}
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                className="px-4 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResults && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Upload Results</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Total Processed</p>
                  <p className="text-lg font-semibold text-blue-900">{uploadResults.summary.totalProcessed}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Successful</p>
                  <p className="text-lg font-semibold text-green-900">{uploadResults.summary.successCount}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Failed</p>
                  <p className="text-lg font-semibold text-red-900">{uploadResults.summary.failureCount}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Total Amount</p>
                  <p className="text-lg font-semibold text-yellow-900">
                    ₹{uploadResults.summary.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Successful Uploads */}
            {uploadResults.successful.length > 0 && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-green-900 mb-3">Successful Uploads ({uploadResults.successful.length})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-green-700">Row</th>
                        <th className="px-2 py-2 text-left font-medium text-green-700">Roll Number</th>
                        <th className="px-2 py-2 text-left font-medium text-green-700">Student Name</th>
                        <th className="px-2 py-2 text-left font-medium text-green-700">Amount</th>
                        <th className="px-2 py-2 text-left font-medium text-green-700">Records Created</th>
                        <th className="px-2 py-2 text-left font-medium text-green-700">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadResults.successful.map((result, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2 text-gray-900">{result.rowIndex}</td>
                          <td className="px-2 py-2 text-gray-900 font-medium">{result.rollNumber}</td>
                          <td className="px-2 py-2 text-gray-900">{result.studentName}</td>
                          <td className="px-2 py-2 text-gray-900">₹{result.amount.toLocaleString()}</td>
                          <td className="px-2 py-2 text-gray-900">{result.paymentRecords}</td>
                          <td className="px-2 py-2 text-gray-900">
                            {result.remainingAmount > 0 ? `₹${result.remainingAmount.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Failed Uploads */}
            {uploadResults.failed.length > 0 && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-red-900 mb-3">Failed Uploads ({uploadResults.failed.length})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-red-700">Row</th>
                        <th className="px-2 py-2 text-left font-medium text-red-700">Roll Number</th>
                        <th className="px-2 py-2 text-left font-medium text-red-700">Error</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadResults.failed.map((result, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2 text-gray-900">{result.rowIndex}</td>
                          <td className="px-2 py-2 text-gray-900">{result.rollNumber}</td>
                          <td className="px-2 py-2 text-red-700">{result.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Upload Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPastPayments;

