import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/axios';
import { toast } from 'react-hot-toast';

const PollPopup = ({ poll, onVote, remainingPolls = 0 }) => {
  const [selectedOption, setSelectedOption] = useState('');
  const [voting, setVoting] = useState(false);

  const handleVote = async () => {
    if (!selectedOption) {
      toast.error('Please select an option');
      return;
    }

    setVoting(true);
    try {
      await api.post(`/api/polls/${poll._id}/vote`, { optionIndex: parseInt(selectedOption) });
      toast.success('Vote recorded successfully');
      onVote();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record vote');
    } finally {
      setVoting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-blue-900 mb-2">New Poll</h2>
            <p className="text-gray-600">{poll.question}</p>
            {remainingPolls > 0 && (
              <div className="mt-2 text-sm text-blue-600 font-medium">
                {remainingPolls} more poll{remainingPolls > 1 ? 's' : ''} to vote on
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {poll.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedOption === index.toString()
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="poll-option"
                  value={index}
                  checked={selectedOption === index.toString()}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">{option.text}</span>
              </label>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleVote}
            disabled={voting}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {voting ? 'Submitting...' : remainingPolls > 0 ? 'Submit & Continue' : 'Submit Vote'}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PollPopup; 