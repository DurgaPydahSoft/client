import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/axios';
import { toast } from 'react-hot-toast';
import { 
  HandThumbUpIcon, 
  HandThumbDownIcon,
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const FeedbackPopup = ({ complaint, onFeedbackSubmit, remainingComplaints = 0 }) => {
  const [feedback, setFeedback] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback) {
      toast.error('Please select whether you are satisfied or not');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/api/complaints/${complaint._id}/feedback`, {
        isSatisfied: feedback === 'satisfied',
        comment: comment
      });
      toast.success('Feedback submitted successfully');
      onFeedbackSubmit();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                <ChatBubbleLeftRightIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Complaint Resolved</h2>
                <p className="text-blue-100 text-xs sm:text-sm">Please provide your feedback</p>
              </div>
            </div>
            {remainingComplaints > 0 && (
              <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-blue-100 bg-white/10 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 inline-block">
                {remainingComplaints} more complaint{remainingComplaints > 1 ? 's' : ''} awaiting feedback
              </div>
            )}
          </div>

          {/* Content - Scrollable */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {/* Complaint Info */}
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-600 text-xs sm:text-sm font-medium">
                    {complaint.category?.charAt(0) || 'C'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-xs font-medium">
                      {complaint.category}
                    </span>
                    {complaint.subCategory && (
                      <span className="px-1.5 sm:px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-[10px] sm:text-xs font-medium">
                        {complaint.subCategory}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3">{complaint.description}</p>
                  <p className="text-gray-400 text-[10px] sm:text-xs mt-1 sm:mt-2">
                    Submitted on {new Date(complaint.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback Options */}
            <div className="mb-4 sm:mb-6">
              <p className="text-gray-700 font-medium mb-2 sm:mb-3 text-sm sm:text-base">Are you satisfied with the resolution?</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFeedback('satisfied')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                    feedback === 'satisfied'
                      ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                      : 'border-gray-200 text-gray-600 active:border-green-300 active:bg-green-50/50'
                  }`}
                >
                  <HandThumbUpIcon className="w-6 h-6 sm:w-6 sm:h-6" />
                  <span className="font-medium text-xs sm:text-sm">Satisfied</span>
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFeedback('not-satisfied')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                    feedback === 'not-satisfied'
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-md'
                      : 'border-gray-200 text-gray-600 active:border-red-300 active:bg-red-50/50'
                  }`}
                >
                  <HandThumbDownIcon className="w-6 h-6 sm:w-6 sm:h-6" />
                  <span className="font-medium text-xs sm:text-sm">Not Satisfied</span>
                </motion.button>
              </div>
            </div>

            {/* Comment Input - Show when feedback is selected */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 sm:mb-6"
              >
                <label className="block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm">
                  Additional Comments (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={feedback === 'satisfied' 
                    ? "Share what went well..." 
                    : "Tell us what could be improved..."}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none text-sm"
                  rows="2"
                />
              </motion.div>
            )}

            {/* Warning for not satisfied */}
            {feedback === 'not-satisfied' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 sm:mb-6 p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2"
              >
                <ExclamationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-700 text-xs sm:text-sm">
                  Selecting "Not Satisfied" will reopen your complaint for further action.
                </p>
              </motion.div>
            )}
          </div>

          {/* Submit Button - Fixed at bottom */}
          <div className="p-4 sm:p-6 pt-0 flex-shrink-0 bg-white">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={!feedback || submitting}
              className={`w-full px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-medium text-white transition-all duration-300 shadow-lg text-sm sm:text-base ${
                !feedback || submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-800 active:from-blue-700 active:to-blue-900'
              }`}
            >
              {submitting 
                ? 'Submitting...' 
                : remainingComplaints > 0 
                  ? 'Submit & Continue' 
                  : 'Submit Feedback'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FeedbackPopup;

