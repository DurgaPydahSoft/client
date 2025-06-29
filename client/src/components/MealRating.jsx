import React, { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import api from '../utils/axios';
import { toast } from 'react-hot-toast';

const MealRating = ({ mealType, date, onRatingSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  const mealEmojis = {
    breakfast: '🥞',
    lunch: '🍛',
    dinner: '🍽️'
  };

  const mealColors = {
    breakfast: 'bg-green-50 border-green-200',
    lunch: 'bg-yellow-50 border-yellow-200',
    dinner: 'bg-blue-50 border-blue-200'
  };

  useEffect(() => {
    fetchUserRating();
  }, [mealType, date]);

  const fetchUserRating = async () => {
    try {
      const res = await api.get(`/api/menu/rating?date=${date}&mealType=${mealType}`);
      if (res.data.success && res.data.data) {
        setUserRating(res.data.data);
        setRating(res.data.data.rating);
        setComment(res.data.data.comment || '');
      }
    } catch (err) {
      console.error('Error fetching user rating:', err);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/menu/rate', {
        date,
        mealType,
        rating,
        comment: comment.trim()
      });

      if (res.data.success) {
        toast.success('Rating submitted successfully!');
        setUserRating(res.data.data);
        if (onRatingSubmit) {
          onRatingSubmit();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  const handleCommentChange = (e) => {
    setComment(e.target.value);
  };

  return (
    <div className={`p-4 rounded-lg border ${mealColors[mealType]} mb-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{mealEmojis[mealType]}</span>
        <h3 className="font-semibold capitalize text-gray-800">{mealType}</h3>
        {userRating && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Rated
          </span>
        )}
      </div>

      {/* Rating Stars */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
            disabled={loading}
          >
            {star <= (hover || rating) ? (
              <StarIcon className="w-6 h-6 text-yellow-400" />
            ) : (
              <StarOutlineIcon className="w-6 h-6 text-gray-300" />
            )}
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating > 0 && `${rating}/5`}
        </span>
      </div>

      {/* Comment Input */}
      <div className="mb-3">
        <textarea
          value={comment}
          onChange={handleCommentChange}
          placeholder={`Share your thoughts about ${mealType}...`}
          className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
          rows="2"
          maxLength="500"
          disabled={loading}
        />
        <div className="text-xs text-gray-500 text-right mt-1">
          {comment.length}/500
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleRatingSubmit}
        disabled={loading || rating === 0}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          loading || rating === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {loading ? 'Submitting...' : userRating ? 'Update Rating' : 'Submit Rating'}
      </button>

      {/* Average Rating Display */}
      {avgRating > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Average: {avgRating}/5</span>
            <span>({totalRatings} ratings)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealRating; 