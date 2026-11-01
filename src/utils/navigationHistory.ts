/**
 * Sakan Assiut - Unified Back Navigation & History Manager
 * 
 * Provides robust support for:
 * 1. Android hardware back button
 * 2. Mobile edge-swipe back gesture (Android 10+ gesture nav & mobile browsers)
 * 3. Strict priority-based layer closing:
 *    - Drawer (القائمة الجانبية) -> Closes first (Priority 100)
 *    - Filter popovers & sheets -> Closes second (Priority 90-95)
 *    - Modals & dialogs -> Closes third (Priority 80-85)
 *    - Detail cards (عرض تفاصيل الإعلان) -> Closes fourth (Priority 70)
 *    - Fullscreen overlays (شاشات الإدخال) -> Closes fifth (Priority 60)
 *    - Sub-tabs / pages (التبويبات الفرعية) -> Navigates back to previous tab or Home (Priority 30)
 * 4. App exit only when on Home with zero open layers.
 * 5. Full synchronization between on-screen close buttons ("X", "إلغاء", backdrop) and system back.
 */

import { useEffect, useRef } from 'react';

export interface NavigationLayer {
  id: string;
  priority: number;
  onClose: () => void;
  url?: string;
  timestamp: number;
}

// Global state for back navigation stack
let activeLayers: NavigationLayer[] = [];
let syntheticHistoryDepth = 0;
let suppressPopstateCount = 0;
let isDispatchingPop = false;
let isInitialized = false;

function initGlobalPopstateListener() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  window.addEventListener('popstate', (event) => {
    // 1. Check if this popstate was triggered by a programmatic history.back()
    // to clean up a layer that was closed via on-screen UI button
    if (suppressPopstateCount > 0) {
      suppressPopstateCount--;
      return;
    }

    // 2. Decrement synthetic history depth if above zero
    if (syntheticHistoryDepth > 0) {
      syntheticHistoryDepth--;
    }

    // 3. If no layers are active, let native browser behavior proceed (e.g. exit app)
    if (activeLayers.length === 0) {
      return;
    }

    // 4. Find the highest priority layer (and most recently opened for equal priorities)
    const topLayer = activeLayers.reduce((prev, curr) => {
      if (!prev) return curr;
      if (curr.priority > prev.priority) return curr;
      if (curr.priority === prev.priority && curr.timestamp > prev.timestamp) return curr;
      return prev;
    }, null as NavigationLayer | null);

    if (topLayer) {
      // Remove it from active layers before dispatching so re-entrant calls won't target it
      activeLayers = activeLayers.filter((l) => l.id !== topLayer.id);

      isDispatchingPop = true;
      try {
        topLayer.onClose();
      } catch (err) {
        console.error('Error executing back navigation for layer:', topLayer.id, err);
      } finally {
        isDispatchingPop = false;
      }
    }
  });
}

/**
 * Register an active layer into the back navigation stack
 */
export function registerBackLayer(layer: Omit<NavigationLayer, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  initGlobalPopstateListener();

  const existingIndex = activeLayers.findIndex((l) => l.id === layer.id);
  if (existingIndex !== -1) {
    // Update existing layer configuration
    activeLayers[existingIndex] = {
      ...layer,
      timestamp: activeLayers[existingIndex].timestamp,
    };
    return;
  }

  // Push new active layer
  activeLayers.push({
    ...layer,
    timestamp: Date.now(),
  });

  // Push synthetic entry to browser history
  syntheticHistoryDepth++;
  try {
    const targetUrl = layer.url || window.location.pathname + window.location.search;
    window.history.pushState(
      { sakanLayer: layer.id, depth: syntheticHistoryDepth, ts: Date.now() },
      '',
      targetUrl
    );
  } catch (err) {
    console.warn('Failed to push state for back navigation:', err);
  }
}

/**
 * Unregister a layer from the back navigation stack (e.g. when closed via UI or unmounted)
 */
export function unregisterBackLayer(id: string) {
  if (typeof window === 'undefined') return;

  const index = activeLayers.findIndex((l) => l.id === id);
  if (index !== -1) {
    activeLayers.splice(index, 1);

    // If this closure was NOT initiated by a popstate event,
    // we must pop the corresponding browser history entry to keep history clean.
    if (!isDispatchingPop && syntheticHistoryDepth > 0) {
      syntheticHistoryDepth--;
      suppressPopstateCount++;
      try {
        window.history.back();
      } catch (err) {
        console.warn('Failed to pop history for closed layer:', err);
      }
    }
  }
}

/**
 * React Hook to attach any modal, drawer, or sub-view to the back navigation system
 */
export function useBackLayer({
  id,
  isOpen,
  priority,
  onClose,
  url,
}: {
  id: string;
  isOpen: boolean;
  priority: number;
  onClose: () => void;
  url?: string;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    registerBackLayer({
      id,
      priority,
      onClose: () => onCloseRef.current(),
      url,
    });

    return () => {
      unregisterBackLayer(id);
    };
  }, [isOpen, id, priority, url]);
}
