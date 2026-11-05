import { useEffect, useState } from "react";

const EVENT_DATE = new Date("2026-10-28T11:00:00");

function getTimeLeft() {
  const distance = Math.max(0, EVENT_DATE.getTime() - Date.now());
  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance / 3600000) % 24),
    minutes: Math.floor((distance / 60000) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
}

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (Object.values(timeLeft).every((unit) => unit === 0)) {
    return <p className="countdown-live">The celebration is here! Let the fun begin!</p>;
  }

  return (
    <div className="countdown" aria-label="Countdown to the birthday celebration">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div className="countdown-unit" key={unit}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{unit}</span>
        </div>
      ))}
    </div>
  );
}
