import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  pullThreshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

/**
 * PullToRefresh:
 * A high-performance, touch-friendly Pull-to-Refresh container designed for mobile & desktop.
 * Provides tactile elastic resistance, animated status indicators, and zero interference with normal scroll.
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  pullThreshold = 65,
  maxPull = 110,
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    // Only activate if we are at the very top of the scrollable document or container
    const isAtTop = (window.scrollY || document.documentElement.scrollTop || 0) <= 2;
    if (!isAtTop) {
      isPullingRef.current = false;
      return;
    }

    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    // Only respond to downward drag when at top
    if (diff > 0) {
      const isAtTop = (window.scrollY || document.documentElement.scrollTop || 0) <= 2;
      if (isAtTop) {
        // Damping elastic formula
        const damped = Math.min(maxPull, Math.pow(diff, 0.85) * 1.5);
        setPullDistance(damped);
      } else {
        isPullingRef.current = false;
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold); // Hold at threshold while refreshing
      try {
        await onRefresh();
      } catch (err) {
        console.warn('Error during pull-to-refresh:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(1, pullDistance / pullThreshold);
  const isReady = pullDistance >= pullThreshold;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-full"
    >
      {/* Pull down indicator banner */}
      <div
        className={`w-full overflow-hidden flex flex-col items-center justify-center transition-all ${
          isPullingRef.current ? 'duration-75' : 'duration-300 ease-out'
        }`}
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 8 ? Math.min(1, pullDistance / 35) : 0,
        }}
      >
        <div className="flex items-center gap-2 py-2 px-3.5 rounded-full bg-white/95 border border-[#D6DEE5] shadow-xs text-[#124C46] text-xs font-bold select-none">
          {isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-[#124C46]" />
              <span className="text-[#124C46]">جاري تحديث البيانات...</span>
            </>
          ) : isReady ? (
            <>
              <RefreshCw className="w-4 h-4 text-[#D6A84F] transition-transform rotate-180" />
              <span className="text-[#D6A84F] font-black">اترك للتحديث الآن...</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-4 h-4 text-[#124C46] transition-transform"
                style={{ transform: `rotate(${progress * 180}deg)` }}
              />
              <span className="text-[#5D6B78]">اسحب لأسفل للتحديث...</span>
            </>
          )}
        </div>
      </div>

      {/* Child screen content */}
      {children}
    </div>
  );
};
