import { fetchEvidenceAsBase64 } from '@/lib/api/evidence';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  Incident,
  IncidentEvidence,
  IncidentOfficer,
} from '@/lib/types/incident.types';

const PAGE_WIDTH = 215.9;
const PAGE_HEIGHT = 279.4;
const MARGIN = 18;

const RETORNO_LABELS = [
  'Evidencia de Calle (Sustancia/Arma)',
  'Fijación del Entorno (Calle)',
  'Fachada del Suceso (Casa)',
] as const;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRangeRole(role: string): string {
  return role.replace(/_/g, ' ');
}

function buildCommissionRows(incident: Incident): string[][] {
  const rows: string[][] = [];
  const seen = new Set<string>();

  const pushOfficer = (officer: IncidentOfficer, rol: string) => {
    if (seen.has(officer.id)) return;
    seen.add(officer.id);
    rows.push([
      rol,
      officer.nombres,
      officer.apellidos,
      officer.cedula,
      formatRangeRole(officer.rangeRole),
    ]);
  };

  if (incident.squad.leader) {
    pushOfficer(incident.squad.leader, 'Líder de Escuadra');
  }

  for (const member of incident.squad.members) {
    pushOfficer(member, 'Miembro de Escuadra');
  }

  if (rows.length === 0) {
    rows.push([
      'Sin registro',
      '—',
      '—',
      '—',
      incident.squad.name,
    ]);
  }

  return rows;
}

function getEvidenceLabel(
  evidence: IncidentEvidence,
  retornoIndex: number,
): string {
  if (evidence.stage === 'RESEÑA_COMANDO') {
    return 'Reseña Formal de Identificación (Logo Comando)';
  }
  return RETORNO_LABELS[retornoIndex] ?? 'Evidencia de Calle';
}

async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const base64 = await fetchEvidenceAsBase64(url);
    return `data:image/webp;base64,${base64}`;
  } catch {
    return createPlaceholderImage('EVIDENCIA REGISTRADA · SITOP');
  }
}

function createPlaceholderImage(caption: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  ctx.fillStyle = '#64748b';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(caption, canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function drawWatermark(doc: jsPDF): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(220, 220, 220);
  doc.text('SITOP - COPIA AUTÉNTICA INMUTABLE', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, {
    align: 'center',
    angle: 35,
  });
}

function getTableFinalY(doc: jsPDF): number {
  const extended = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  return extended.lastAutoTable?.finalY ?? MARGIN;
}

function drawHeader(doc: jsPDF, incident: Incident): number {
  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA', PAGE_WIDTH / 2, y, {
    align: 'center',
  });

  y += 6;
  doc.setFontSize(10);
  doc.text(
    'CUERPO DE POLICÍA DEL MUNICIPIO SAN FRANCISCO',
    PAGE_WIDTH / 2,
    y,
    { align: 'center' },
  );

  y += 5;
  doc.setFontSize(9);
  doc.text(
    'SISTEMA DE INTELIGENCIA Y TÁCTICA OPERATIVA POLICIAL - SITOP',
    PAGE_WIDTH / 2,
    y,
    { align: 'center' },
  );

  y += 8;
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Oficio / Caso: ${incident.code}`, PAGE_WIDTH - MARGIN, y, {
    align: 'right',
  });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Cuadrante: ${incident.cuadrante}`, PAGE_WIDTH - MARGIN, y, {
    align: 'right',
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ACTA DE PROCEDIMIENTO — REMISIÓN AL MINISTERIO PÚBLICO', MARGIN, y);

  return y + 8;
}

export async function generateFiscalReport(incident: Incident): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
  let cursorY = drawHeader(doc, incident);

  autoTable(doc, {
    startY: cursorY,
    head: [['DATOS DEL PROCEDIMIENTO', '']],
    body: [
      ['Tipo de Delito', incident.tipoDelito],
      ['Parroquia', incident.parroquia],
      ['Sector / Cuadrante', incident.cuadrante],
      ['Fecha y Hora de la Novedad', formatDateTime(incident.createdAt)],
      ['Departamento Responsable', incident.department.name],
      ['Estatus Procesal', incident.status.replace(/_/g, ' ')],
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [148, 163, 184],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [226, 232, 240],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  cursorY = getTableFinalY(doc) + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 95);
  doc.text('COMISIÓN ACTUANTE — BLINDAJE JURÍDICO', MARGIN, cursorY);
  cursorY += 6;

  autoTable(doc, {
    startY: cursorY,
    head: [['Rol', 'Nombres', 'Apellidos', 'Cédula', 'Rango']],
    body: buildCommissionRows(incident),
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: [148, 163, 184],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [241, 245, 249],
      fontStyle: 'bold',
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  cursorY = getTableFinalY(doc) + 8;

  autoTable(doc, {
    startY: cursorY,
    head: [['RESEÑA DE HECHOS']],
    body: [[incident.descripcion]],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      overflow: 'linebreak',
      cellWidth: 'wrap',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [226, 232, 240],
      fontStyle: 'bold',
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  cursorY = getTableFinalY(doc) + 10;

  if (incident.evidence.length > 0) {
    doc.addPage();
    drawWatermark(doc);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('ANEXO FOTOGRÁFICO INTEGRADO', MARGIN, MARGIN + 4);

    let photoY = MARGIN + 12;
    let retornoIndex = 0;
    const contentWidth = PAGE_WIDTH - MARGIN * 2;
    const photoHeight = 58;

    for (const evidence of incident.evidence) {
      const label = getEvidenceLabel(evidence, retornoIndex);
      if (evidence.stage === 'RETORNO_CALLE') retornoIndex += 1;

      if (photoY + photoHeight + 20 > PAGE_HEIGHT - MARGIN) {
        doc.addPage();
        drawWatermark(doc);
        photoY = MARGIN + 6;
      }

      const base64 = await loadImageAsBase64(evidence.imageUrl);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.text(label, MARGIN, photoY);
      photoY += 4;

      if (base64) {
        doc.addImage(base64, 'JPEG', MARGIN, photoY, contentWidth, photoHeight);
      }

      photoY += photoHeight + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        evidence.descripcion ?? 'Registro fotográfico certificado por SITOP',
        MARGIN,
        photoY,
      );
      photoY += 10;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Página ${page} de ${totalPages} · Generado por SITOP · ${new Date().toLocaleString('es-VE')}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: 'center' },
    );
  }

  doc.save(`Expediente_${incident.code}.pdf`);
}
