/**
 * Utility functions for exporting data to CSV and printable PDF (via Print Dialog / HTML report)
 * Fully supports Arabic UTF-8 encoding with BOM for Microsoft Excel compatibility.
 */

export interface ExportColumn<T> {
  header: string;
  accessor: (item: T) => string | number | undefined | null;
}

/**
 * Downloads data as a CSV file with Arabic UTF-8 BOM
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileNameWithoutExt: string
) {
  if (!data || data.length === 0) {
    console.warn('لا توجد بيانات متاحة للتصدير');
    return;
  }

  // Header row
  const headers = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');

  // Data rows
  const rows = data.map(item => {
    return columns
      .map(col => {
        const val = col.accessor(item);
        if (val === null || val === undefined) return '""';
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens Arabic correctly
  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${fileNameWithoutExt}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an elegant Arabic printable document ready for Save as PDF / Print
 * Uses a sandboxed hidden iframe to trigger the browser print dialog safely without popup blockers.
 */
export function exportToPrintablePDF<T>(
  title: string,
  data: T[],
  columns: ExportColumn<T>[],
  subtitle?: string
) {
  if (!data || data.length === 0) {
    console.warn('لا توجد بيانات متاحة للتصدير');
    return;
  }

  const dateStr = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const headersHtml = columns
    .map(c => `<th style="padding: 10px 12px; background: #002B49; color: white; border: 1px solid #cbd5e1; font-weight: bold; font-size: 13px;">${c.header}</th>`)
    .join('');

  const rowsHtml = data
    .map((item, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns
        .map(c => {
          const val = c.accessor(item) ?? '-';
          return `<td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 12px; color: #1e293b;">${val}</td>`;
        })
        .join('');
      return `<tr style="background: ${bg};">${cells}</tr>`;
    })
    .join('');

  const fullHtml = generateReportHtml(title, subtitle, dateStr, headersHtml, rowsHtml, data.length);

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    if (iframe.contentDocument) {
      iframe.contentDocument.open();
      iframe.contentDocument.write(fullHtml);
      iframe.contentDocument.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } catch {
          // Fallback if print is restricted
          downloadReportHtml(fullHtml, title);
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 3000);
      }, 500);
      return;
    }
  } catch {
    // If iframe print fails, provide direct download
  }

  downloadReportHtml(fullHtml, title);
}

function downloadReportHtml(htmlContent: string, title: string) {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}_تقرير_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateReportHtml(
  title: string,
  subtitle: string | undefined,
  dateStr: string,
  headersHtml: string,
  rowsHtml: string,
  count: number
): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: landscape; margin: 15mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      direction: rtl;
      text-align: right;
      color: #0f172a;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #FFB300;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 20px;
      font-weight: 900;
      color: #002B49;
    }
    .brand span {
      color: #FFB300;
    }
    .meta {
      font-size: 12px;
      color: #64748b;
    }
    h1 {
      margin: 0 0 6px 0;
      font-size: 18px;
      color: #002B49;
    }
    p.sub {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .footer {
      margin-top: 24px;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">أرضك <span>أسيوط</span></div>
      <p class="sub">${subtitle || 'منظومة التسويق العقاري الذكية'}</p>
    </div>
    <div class="meta">
      <div>تاريخ التصدير: ${dateStr}</div>
      <div>إجمالي السجلات: ${count}</div>
    </div>
  </div>

  <h1>${title}</h1>

  <table>
    <thead>
      <tr>${headersHtml}</tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>تم التصدير بواسطة إدارة منظومة عقارات أسيوط</div>
    <div>وثيقة إدارية رسمية</div>
  </div>
</body>
</html>`;
}
