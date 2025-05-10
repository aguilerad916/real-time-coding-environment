import React, { useEffect, useState } from 'react';
import { UserIcon } from './Icons';

interface AnimatedUserCounterProps {
  count: number;
  className?: string;
}

export const AnimatedUserCounter: React.FC<AnimatedUserCounterProps> = ({ 
  count, 
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(count);
  
  useEffect(() => {
    // Skip animation on first render
    if (prevCount !== count) {
      setIsAnimating(true);
      
      // Reset animation after it completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 700); // Match animation duration
      
      setPrevCount(count);
      
      return () => clearTimeout(timer);
    }
  }, [count, prevCount]);
  
  // Define the animation class
  const animationClass = isAnimating 
    ? count > prevCount 
      ? 'animate-count-up' 
      : 'animate-count-down'
    : '';
  
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full transition-colors ${className}`}>
      <UserIcon className="w-5 h-5 text-blue-600" />
      <div className="flex items-center">
        <span className={`font-medium ${animationClass}`}>{count}</span>
        <span className="ml-1">{count === 1 ? 'person' : 'people'} in room</span>
      </div>
    </div>
  );
};

export default AnimatedUserCounter;