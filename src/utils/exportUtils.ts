export interface ExportColumn<T> {
  header: string;
  accessor: (item: T) => any;
}

/**
 * Exports data to CSV file with UTF-8 BOM so Arabic letters render flawlessly in Excel.
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export'
): void {
  try {
    const headerRow = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');
    const rows = data.map((item) =>
      columns
        .map((col) => {
          const val = col.accessor(item);
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export CSV:', e);
  }
}

/**
 * Generates a clean, print-ready HTML page with Egyptian Real Estate styling for browser Print-to-PDF.
 */
export function exportToPrintablePDF<T>(
  title: string,
  data: T[],
  columns: ExportColumn<T>[],
  subtitle?: string
): void {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.warn('Popup blocked, cannot open print preview');
      return;
    }

    const headersHtml = columns.map((c) => `<th>${c.header}</th>`).join('');
    const rowsHtml = data
      .map(
        (item, index) =>
          `<tr>
            <td style="text-align: center; color: #64748b; font-weight: bold;">${index + 1}</td>
            ${columns
              .map((c) => {
                const val = c.accessor(item);
                return `<td>${val === null || val === undefined ? '-' : val}</td>`;
              })
              .join('')}
          </tr>`
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      direction: rtl;
      margin: 0;
      padding: 20px;
      color: #1e293b;
      background: #fff;
    }
    .header {
      border-bottom: 2px solid #002B49;
      padding-bottom: 15px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      color: #002B49;
      font-size: 24px;
      font-weight: 800;
    }
    .brand span {
      color: #FFB300;
    }
    .meta {
      font-size: 13px;
      color: #64748b;
      text-align: left;
    }
    .subtitle {
      font-size: 14px;
      color: #475569;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 15px;
    }
    th {
      background-color: #002B49;
      color: #ffffff;
      padding: 10px 8px;
      text-align: right;
      font-weight: 700;
      border: 1px solid #002B49;
    }
    td {
      padding: 8px;
      border: 1px solid #cbd5e1;
      text-align: right;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
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
      <div class="brand">سكن <span>أسيوط</span> | لوحة الإدارة</div>
      <h2 style="margin: 6px 0 2px 0; font-size: 18px; color: #0f172a;">${title}</h2>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    </div>
    <div class="meta">
      <div><strong>تاريخ الاستخراج:</strong> ${new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}</div>
      <div><strong>إجمالي السجلات:</strong> ${data.length} سجل</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        ${headersHtml}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>تم إنشاء هذا التقرير تلقائياً عبر منظومة إدارة عقارات محافظة أسيوط</div>
    <div>سكن أسيوط &copy; ${new Date().getFullYear()}</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } catch (e) {
    console.error('Failed to generate printable PDF:', e);
  }
}
