// pdf.js — PDF report generation via jsPDF + autoTable
import { formatDate } from './helpers.js';

export function generateMatchReport(matchResults, slots, users, dutyTypes) {
  if (!window.jspdf) { alert('PDF library not loaded'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr  = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(20, 31, 20);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(76, 175, 80);
  doc.text('SENTINEL', 14, 14);

  doc.setFontSize(10);
  doc.setTextColor(200, 230, 200);
  doc.text('Guard Duty Assignment Report', 14, 21);

  doc.setTextColor(150, 200, 150);
  doc.setFontSize(9);
  doc.text(`Generated: ${dateStr} at ${timeStr}`, 297 - 14, 14, { align: 'right' });

  const matched   = matchResults.filter(r => r.eligible).length;
  const unmatched = matchResults.filter(r => !r.eligible).length;

  doc.text(`Matched: ${matched}   Unmatched: ${unmatched}   Total: ${matchResults.length}`, 297 - 14, 21, { align: 'right' });

  // ── Summary table ────────────────────────────────────────
  doc.autoTable({
    startY: 35,
    head:   [['#', 'Date', 'Time', 'Duty Type', 'Assigned To', 'Rank', 'Coins', 'Status', 'Notes']],
    body:    matchResults.map((r, i) => {
      const dt   = dutyTypes.find(t => t.id === r.slot.typeId);
      const user = users.find(u => u.id === r.userId);
      return [
        i + 1,
        formatDate(r.slot.date),
        `${r.slot.startTime}–${r.slot.endTime}`,
        dt  ? dt.name  : '—',
        user ? user.name : 'UNMATCHED',
        user ? user.rank : '—',
        dt  ? `${dt.coinValue}` : '—',
        r.eligible ? 'Matched' : 'Unmatched',
        r.conflicts.join('; ') || '—',
      ];
    }),
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 50, 30],
      lineColor: [45, 90, 45],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor:  [30, 50, 30],
      textColor:  [160, 230, 160],
      fontStyle:  'bold',
      fontSize:   8,
    },
    bodyStyles: { fillColor: [245, 250, 245] },
    alternateRowStyles: { fillColor: [230, 242, 230] },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 36 },
      4: { cellWidth: 42 },
      5: { cellWidth: 30 },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' },
      8: { cellWidth: 'auto' },
    },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 7) {
        const val = data.cell.raw;
        if (val === 'Unmatched') doc.setTextColor(200, 60, 60);
        else if (val === 'Matched') doc.setTextColor(60, 180, 60);
      }
    },
    willDrawCell(data) {
      if (data.section === 'body') doc.setTextColor(30, 50, 30);
    },
  });

  // ── Footer ───────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const y = doc.internal.pageSize.height - 8;
    doc.setFontSize(8);
    doc.setTextColor(120, 160, 120);
    doc.text(`Sentinel Guard Duty System  |  Page ${p} of ${pageCount}`, 14, y);
    doc.text('Manager Signature: ________________________', 297 - 14, y, { align: 'right' });
  }

  doc.save(`sentinel-duty-assignment-${now.toISOString().slice(0,10)}.pdf`);
}
