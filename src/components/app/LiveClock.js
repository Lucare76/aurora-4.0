import React, { useEffect, useState } from 'react';

function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="current-time">
      {currentTime.toLocaleDateString('it-IT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })}
      <br />
      <span className="time">{currentTime.toLocaleTimeString('it-IT')}</span>
    </div>
  );
}

export default LiveClock;
