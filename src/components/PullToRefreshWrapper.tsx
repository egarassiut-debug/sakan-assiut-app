import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshWrapperProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
}

const PULL_THRESHOLD = 60;
const MAX_PULL = 90;

export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({
  onRefresh,
  children,
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      // Only initiate pull-to-refresh if user is at the top of the viewport
      if (window.scrollY <= 0) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPullingRef.current || startYRef.current === null || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYRef.current;

      if (deltaY > 0 && window.scrollY <= 0) {
        // Elastic resistance formula
        const distance = Math.min(MAX_PULL, Math.pow(deltaY, 0.85));
        setPullDistance(distance);
        if (distance > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    startYRef.current = null;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50);
      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.warn('Pull-to-refresh failed:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 350);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const isReady = pullDistance >= PULL_THRESHOLD;

  return (
    <div ref={containerRef} className="relative min-h-full">
      {/* Pull to refresh visual indicator badge */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{
            height: `${pullDistance}px`,
            opacity: Math.min(1, pullDistance / 40),
            transition: isPullingRef.current ? 'none' : 'height 0.25s ease, opacity 0.25s ease',
          }}
          className="overflow-hidden flex items-center justify-center pointer-events-none select-none text-[#124C46]"
        >
          <div className="flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-white/95 shadow-md border border-[#D6DEE5] text-xs font-bold animate-in fade-in zoom-in-95 duration-150">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 text-[#124C46] animate-spin" />
                <span className="text-[#124C46]">جاري تحديث البيانات...</span>
              </>
            ) : isReady ? (
              <>
                <RefreshCw className="w-4 h-4 text-[#D6A84F] rotate-180 transition-transform" />
                <span className="text-[#D6A84F]">اترك الآن للتحديث ⚡</span>
              </>
            ) : (
              <>
                <ArrowDown
                  className="w-4 h-4 text-[#124C46] transition-transform duration-100"
                  style={{
                    transform: `rotate(${Math.min(180, (pullDistance / PULL_THRESHOLD) * 180)}deg)`,
                  }}
                />
                <span className="text-[#5D6B78]">اسحب لأسفل للتحديث</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Children Content */}
      <div
        style={{
          transform: pullDistance > 0 && isPullingRef.current ? `translateY(${pullDistance * 0.2}px)` : 'none',
          transition: isPullingRef.current ? 'none' : 'transform 0.25s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshWrapper;
