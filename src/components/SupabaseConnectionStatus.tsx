import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Clock, 
  Wifi, 
  WifiOff, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { 
  checkSupabaseConnection, 
  getSupabaseConfig, 
  SupabaseHealthStatus,
  SupabaseSyncErrorEventDetail 
} from '../lib/supabase';

export interface SupabaseConnectionStatusProps {
  /** Optional callback to open the Supabase configuration section in admin */
  onOpenSettings?: () => void;
  /** Optional custom CSS classes */
  className?: string;
  /** Visual variant: 'compact' for tight top bars or 'banner' for wide headers */
  variant?: 'compact' | 'badge';
}

export const SupabaseConnectionStatus: React.FC<SupabaseConnectionStatusProps> = ({
  onOpenSettings,
  className = '',
  variant = 'compact',
}) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error' | 'unconfigured'>('checking');
  const [health, setHealth] = useState<SupabaseHealthStatus | null>(null);
  const [lastErrorDetail, setLastErrorDetail] = useState<SupabaseSyncErrorEventDetail | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ping and test the live connection to Supabase
  const performHealthCheck = useCallback(async () => {
    setIsManualChecking(true);
    try {
      const res = await checkSupabaseConnection();
      setHealth(res);

      if (!res.isConfigured) {
        setStatus('unconfigured');
      } else if (res.isConnected) {
        setStatus('connected');
        // Clear old sync error if new connection succeeds
        setLastErrorDetail(null);
      } else {
        setStatus('error');
      }
    } catch (err: any) {
      setStatus('error');
      setHealth({
        isConnected: false,
        isConfigured: Boolean(getSupabaseConfig()?.url),
        error: err?.message || 'خطأ غير متوقع أثناء فحص الاتصال',
        lastChecked: new Date().toLocaleTimeString('ar-EG'),
      });
    } finally {
      setIsManualChecking(false);
    }
  }, []);

  // Initial check on mount + periodic background heartbeat check every 60 seconds
  useEffect(() => {
    performHealthCheck();

    const interval = setInterval(() => {
      performHealthCheck();
    }, 60000);

    return () => clearInterval(interval);
  }, [performHealthCheck]);

  // Listen to application events:
  // 1. ardaw_supabase_sync_error -> Immediately turn RED and capture the error detail
  // 2. ardaw_supabase_sync_success -> Turn GREEN with fresh timestamp
  // 3. ardaw_supabase_config_changed -> Re-run connection check
  useEffect(() => {
    const handleSyncError = (e: Event) => {
      const customEvent = e as CustomEvent<SupabaseSyncErrorEventDetail>;
      setStatus('error');
      if (customEvent.detail) {
        setLastErrorDetail(customEvent.detail);
        setHealth((prev) => ({
          isConnected: false,
          isConfigured: true,
          error: customEvent.detail.message || 'خطأ في عملية مزامنة البيانات مع Supabase',
          lastChecked: customEvent.detail.timestamp || new Date().toLocaleTimeString('ar-EG'),
          url: prev?.url,
        }));
      }
    };

    const handleSyncSuccess = (e: Event) => {
      const customEvent = e as CustomEvent<{ table?: string; timestamp?: string }>;
      setStatus('connected');
      setLastErrorDetail(null);
      setHealth((prev) => ({
        isConnected: true,
        isConfigured: true,
        error: undefined,
        lastChecked: customEvent.detail?.timestamp || new Date().toLocaleTimeString('ar-EG'),
        url: prev?.url,
        latencyMs: prev?.latencyMs,
      }));
    };

    const handleConfigChanged = () => {
      performHealthCheck();
    };

    window.addEventListener('ardaw_supabase_sync_error', handleSyncError);
    window.addEventListener('ardaw_supabase_sync_success', handleSyncSuccess);
    window.addEventListener('ardaw_supabase_config_changed', handleConfigChanged);

    return () => {
      window.removeEventListener('ardaw_supabase_sync_error', handleSyncError);
      window.removeEventListener('ardaw_supabase_sync_success', handleSyncSuccess);
      window.removeEventListener('ardaw_supabase_config_changed', handleConfigChanged);
    };
  }, [performHealthCheck]);

  // Click outside to dismiss popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Clean masked hostname for privacy & neat display
  const displayHost = health?.url
    ? health.url.replace(/^https?:\/\//i, '').split('/')[0]
    : 'غير متصل';

  // Determine styles strictly based on status:
  // - GREEN for connected
  // - RED for error
  // - AMBER for checking
  // - SLATE for unconfigured
  const isGreen = status === 'connected';
  const isRed = status === 'error';
  const isAmber = status === 'checking';

  const dotColorClass = isGreen
    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
    : isRed
    ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse'
    : isAmber
    ? 'bg-amber-400 animate-pulse'
    : 'bg-slate-400';

  const badgeBgClass = isGreen
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/80'
    : isRed
    ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100/90 shadow-2xs'
    : isAmber
    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';

  const statusTitle = isGreen
    ? 'متصل بقاعدة البيانات'
    : isRed
    ? 'خطأ في المزامنة'
    : isAmber
    ? 'جاري التحقق...'
    : 'قاعدة البيانات غير مهيأة';

  return (
    <div ref={containerRef} className={`relative inline-block text-right ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={`حالة اتصال Supabase: ${statusTitle} (اضغط للتفاصيل)`}
        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${badgeBgClass}`}
      >
        {/* Status Dot with Glow ring */}
        <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
          {isGreen && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          )}
          {isRed && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColorClass}`} />
        </span>

        {/* Database Icon */}
        <Database className={`w-3.5 h-3.5 shrink-0 ${isGreen ? 'text-emerald-700' : isRed ? 'text-rose-700' : 'text-slate-600'}`} />

        {/* Status label: responsive truncation */}
        <span className="hidden sm:inline whitespace-nowrap">
          {isGreen ? 'Supabase متصل' : isRed ? 'خطأ Supabase' : isAmber ? 'فحص الاتصال...' : 'Supabase غير متصل'}
        </span>

        {/* Optional latency tag for connected state on desktop */}
        {isGreen && health?.latencyMs !== undefined && (
          <span className="text-[10px] text-emerald-700/80 font-mono hidden md:inline">
            · {health.latencyMs}ms
          </span>
        )}

        <ChevronDown className={`w-3 h-3 transition-transform opacity-70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Detailed Popover Card */}
      {isOpen && (
        <div 
          role="dialog"
          aria-label="تفاصيل اتصال Supabase"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-right animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isGreen ? 'bg-emerald-100 text-emerald-700' : isRed ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-none">حالة اتصال Supabase</h4>
                <span className="text-[10px] text-slate-500 font-medium">مزامنة قاعدة بيانات سكن أسيوط</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-xs"
            >
              إغلاق
            </button>
          </div>

          {/* Status Banner */}
          <div className="my-3">
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                isGreen
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : isRed
                  ? 'bg-rose-50/90 border-rose-300 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {isGreen ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : isRed ? (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              )}

              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>{statusTitle}</span>
                  {isGreen && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-200/60 text-emerald-800 font-mono">
                      مستقر
                    </span>
                  )}
                  {isRed && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-200 text-rose-800 font-mono">
                      تنبيه مزامنة
                    </span>
                  )}
                </div>

                <p className="text-[11px] mt-1 text-slate-600 leading-relaxed">
                  {isGreen
                    ? 'الاتصال بقاعدة البيانات نشط ومباشر. كافة عمليات الحفظ والاسترجاع تتم بشكل لحظي.'
                    : isRed
                    ? health?.error || lastErrorDetail?.message || 'تعذر استكمال الاتصال بقاعدة البيانات أو حدث خطأ أثناء المزامنة.'
                    : 'لم يتم حفظ إعدادات الاتصال بمشروع Supabase حتى الآن.'}
                </p>
              </div>
            </div>
          </div>

          {/* Metrics & Metadata Grid */}
          <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            {/* Host / URL */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">عنوان الخادم:</span>
              <span className="text-slate-800 font-mono text-[11px] truncate max-w-[190px]" dir="ltr">
                {displayHost}
              </span>
            </div>

            {/* Response Time (Latency) */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">زمن الاستجابة:</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                {health?.latencyMs !== undefined ? (
                  <>
                    <span className={`font-bold ${health.latencyMs < 200 ? 'text-emerald-700' : health.latencyMs < 500 ? 'text-amber-700' : 'text-rose-700'}`}>
                      {health.latencyMs} ms
                    </span>
                    <Wifi className="w-3 h-3 text-slate-400" />
                  </>
                ) : (
                  <span className="text-slate-400">غير متوفر</span>
                )}
              </div>
            </div>

            {/* Last Checked / Synced */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">آخر تحقق:</span>
              <div className="flex items-center gap-1 text-[11px] text-slate-700">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{health?.lastChecked || 'الآن'}</span>
              </div>
            </div>

            {/* Active Table Details if error occurred */}
            {lastErrorDetail?.table && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-rose-600 font-medium">الجدول المتأثر:</span>
                <span className="font-mono text-[11px] text-rose-800 bg-rose-100/60 px-1.5 py-0.5 rounded">
                  {lastErrorDetail.table} ({lastErrorDetail.operation})
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={performHealthCheck}
              disabled={isManualChecking}
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isManualChecking ? 'animate-spin' : ''}`} />
              <span>{isManualChecking ? 'جاري الفحص...' : 'فحص الاتصال الآن'}</span>
            </button>

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 shrink-0"
                title="الانتقال إلى تبويب إعدادات Supabase"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>إعدادات الربط</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
