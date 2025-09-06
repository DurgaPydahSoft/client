import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <DotLottieReact
        src="https://lottie.host/b4aa4f1c-3fee-4d78-a956-500f220ddd98/MnjSoSypAh.lottie"
        loop
        autoplay
        className={className}
      />
    </div>
  );
};

export default LoadingSpinner;