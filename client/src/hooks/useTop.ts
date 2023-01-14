import { useState, useEffect } from 'react';
import { Rect } from 'react-use-rect';

export function useTop(rect: Rect | null) {
  const [top, setTop] = useState<number>();
  const rectTop = rect ? rect.top : undefined;
  useEffect(() => {
    if (typeof rectTop === 'undefined') return;
    const newTop = rectTop + window.pageYOffset;
    if (newTop !== top) {
      setTop(newTop);
    }
  }, [rectTop, top]);
  return top;
}
