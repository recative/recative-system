import * as React from 'react';

export const useMemoryLeakFixer = () => {
  const intervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      if (!localStorage.debug) {
        console.clear?.();
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalRef.current!);
    };
  }, []);
};
