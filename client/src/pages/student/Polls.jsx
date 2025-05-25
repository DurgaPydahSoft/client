import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

ChartJS.register(ArcElement, Tooltip, Legend);

const Polls = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState({});

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const res = await api.get('/api/polls/active');
      setPolls(res.data.data);
      // Initialize selected options
      const initialSelections = {};
      res.data.data.forEach(poll => {
        initialSelections[poll._id] = '';
      });
      setSelectedOptions(initialSelections);
    } catch (err) {
      toast.error('Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId) => {
    const selectedOption = selectedOptions[pollId];
    if (selectedOption === undefined || selectedOption === '') {
      toast.error('Please select an option');
      return;
    }

    try {
      await api.post(`/api/polls/${pollId}/vote`, { optionIndex: parseInt(selectedOption) });
      toast.success('Vote recorded successfully');
      fetchPolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record vote');
    }
  };

  const getChartData = (poll) => {
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    return {
      labels: poll.options.map(opt => opt.text),
      datasets: [{
        data: poll.options.map(opt => opt.votes),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',  // blue-500
          'rgba(16, 185, 129, 0.8)',  // green-500
          'rgba(245, 158, 11, 0.8)',  // yellow-500
          'rgba(239, 68, 68, 0.8)',   // red-500
          'rgba(139, 92, 246, 0.8)',  // purple-500
          'rgba(14, 165, 233, 0.8)',  // sky-500
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(14, 165, 233, 1)',
        ],
        borderWidth: 1,
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-12 sm:mt-0">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg shadow-blue-100">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
            Active Polls
          </h2>
          <p className="text-gray-600 text-sm mt-1">Participate in ongoing polls and surveys</p>
        </div>
      </div>

      <div className="space-y-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {polls.map((poll) => (
            <motion.div
              key={poll._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-4 border border-blue-100"
            >
              <h3 className="text-lg font-semibold text-blue-900 mb-3 line-clamp-2">{poll.question}</h3>

              <div className="mb-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Active
                </span>
                <span className="ml-3 text-xs text-gray-500">
                  Ends: {new Date(poll.endTime).toLocaleString()}
                </span>
              </div>

              {poll.hasVoted ? (
                <>
                  <div className="h-48 mb-3">
                    <Pie data={getChartData(poll)} options={{
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 15,
                            font: {
                              size: 11
                            }
                          }
                        }
                      }
                    }} />
                  </div>
                  <div className="space-y-1">
                    {poll.options.map((option, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700 truncate">{option.text}</span>
                        <span className="text-blue-600 font-medium ml-2">{option.votes} votes</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {poll.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedOptions[poll._id] === index.toString()
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`poll-${poll._id}`}
                        value={index}
                        checked={selectedOptions[poll._id] === index.toString()}
                        onChange={(e) => {
                          setSelectedOptions(prev => ({
                            ...prev,
                            [poll._id]: e.target.value
                          }));
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 truncate">{option.text}</span>
                    </label>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleVote(poll._id)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm"
                  >
                    Submit Vote
                  </motion.button>
                </div>
              )}
            </motion.div>
          ))}

          {polls.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <div className="text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg font-medium">No active polls at the moment</p>
                <p className="text-sm mt-2">Check back later for new polls</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Polls; 