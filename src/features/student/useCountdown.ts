import { useEffect, useRef, useState } from "react";

// Counts down from server-provided remaining seconds. resync() re-anchors the local
// clock on every server response (start + each save), so client clock drift never
// accumulates — the server's DeadlineUtc stays authoritative. Fires onExpire once.
export function useCountdown(onExpire: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const endAtRef = useRef<number | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  function resync(remainingSeconds: number) {
    endAtRef.current = Date.now() + remainingSeconds * 1000;
    if (remainingSeconds > 0) expiredRef.current = false;
    setRemaining(Math.max(0, remainingSeconds));
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (endAtRef.current === null) return;
      const left = Math.ceil((endAtRef.current - Date.now()) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return { remaining, resync };
}
