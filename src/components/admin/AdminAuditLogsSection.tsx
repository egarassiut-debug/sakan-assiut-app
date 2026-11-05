import React, { useState, useEffect, useMemo } from 'react';
import { AuditLogEntry, fetchAuditLogs } from '../../utils/auditManager';
import { getAdminActivityLogs, AdminActivityLogItem } from '../../utils/adminManager';
import { AppUser } from '../../types/property';
import { 
  Activity, Search, Filter, RefreshCw, User, Calendar, ShieldCheck, 
  ArrowUpRight, Clock, FileText, Building2
} from 'lucide-react';

interface AdminAuditLogsSectionProps {
  currentUser?: AppUser | null;
}

export const AdminAuditLogsSection: React.FC<AdminAuditLogsSectionProps> = ({
  currentUser,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const dbLogs = await fetchAuditLogs();
      setAuditLogs(dbLogs);
      const localLogs = getAdminActivityLogs();
      setActivityLogs(localLogs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesUser = (log.userName || '').toLowerCase().includes(q);
        const matchesPhone = (log.userPhone || '').includes(q);
        const matchesEntity = (log.entityCode || log.entityId || '').toLowerCase().includes(q);
        const matchesType = (log.entityType || '').toLowerCase().includes(q);
        if (!matchesUser && !matchesPhone && !matchesEntity && !matchesType) return false;
      }
      return true;
    });
  }, [auditLogs, actionFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-700" />
              <span>سجل التدقيق والرقابة الإدارية المركزي</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {auditLogs.length} حركة تدقيق
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              سجل تدقيق كامل وغير قابل للتعديل لكافة عمليات الإضافة والتعديل والحذف وتغيير حالات الإعلانات والمستخدمين.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLogs}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer self-start sm:self-center"
            title="تحديث السجلات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم المسؤول، رقم الهاتف، أو كود العقار..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-600 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActionFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                actionFilter === 'all' ? 'bg-indigo-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              كل العمليات
            </button>
            <button
              type="button"
              onClick={() => setActionFilter('STATUS_CHANGE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                actionFilter === 'STATUS_CHANGE' ? 'bg-indigo-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              تغيير حالة
            </button>
            <button
              type="button"
              onClick={() => setActionFilter('DELETE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                actionFilter === 'DELETE' ? 'bg-indigo-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              حذف
            </button>
            <button
              type="button"
              onClick={() => setActionFilter('CREATE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                actionFilter === 'CREATE' ? 'bg-indigo-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              إضافة
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Activity className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">لا توجد سجلات تدقيق مسجلة</h3>
          <p className="text-xs text-slate-400">سيتم تسجيل كل حركة يقوم بها أي مشرف تلقائياً هنا في جدول audit_logs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredLogs.map((log) => {
            const isDelete = log.action === 'DELETE';
            const isStatus = log.action === 'STATUS_CHANGE';
            const isCreate = log.action === 'CREATE';

            return (
              <div
                key={log.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {/* Action badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      isDelete
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isStatus
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : isCreate
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {log.action}
                    </span>

                    <span className="text-xs font-bold text-slate-800">
                      الكيان: {log.entityType} {log.entityCode ? `(${log.entityCode})` : ''}
                    </span>

                    <span className="text-xs font-medium text-slate-500">
                      بواسطة: <strong className="text-slate-700">{log.userName}</strong> ({log.userRole})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono" dir="ltr">
                      <Clock className="w-3 h-3" />
                      <span>{log.timestamp ? log.timestamp.replace('T', ' ').split('.')[0] : ''}</span>
                    </span>
                    <span className="font-mono" dir="ltr">
                      الهاتف: {log.userPhone}
                    </span>
                    <span className="font-mono">
                      ID: {log.entityId}
                    </span>
                  </div>

                  {/* Changes detail if present */}
                  {(log.newValues || log.oldValues) && (
                    <div className="mt-2 text-[11px] font-mono bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-600 overflow-x-auto">
                      {log.oldValues && <span>القيم السابقة: {JSON.stringify(log.oldValues)} </span>}
                      {log.newValues && <span className="text-indigo-800">| القيم الجديدة: {JSON.stringify(log.newValues)}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
