import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type MeetingDetail = {
  meeting: {
    id: string;
    title: string;
    created_at: string;
    duration_seconds: number | null;
    status: string;
    language: string | null;
    audio_file_path: string | null;
  };
  transcription: {
    id: string;
    content: string;
  } | null;
  summary: {
    id: string;
    summary: string;
    key_points: string[];
    action_items: string[];
  } | null;
  tasks: Array<{
    id: string;
    description: string;
    completed: boolean;
    due_date: string | null;
    assignee: string | null;
  }>;
  decisions: Array<{
    id: string;
    description: string;
  }>;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) {
    return 'No disponible';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function addSectionTitle(
  doc: jsPDF,
  title: string,
  y: number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y > pageHeight - 35) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, y);

  return y + 8;
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  y: number,
  maxWidth = 180
): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const lines = doc.splitTextToSize(text || 'Sin información.', maxWidth);

  for (const line of lines) {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }

    doc.text(line, 14, y);
    y += 5;
  }

  return y + 4;
}

export function exportMeetingPdf(meetingDetail: MeetingDetail): void {
  const { meeting, transcription, summary, tasks, decisions } = meetingDetail;

  const doc = new jsPDF();

  let y = 20;

  // --------------------------------------------------
  // ENCABEZADO
  // --------------------------------------------------

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Lumen Note AI', 14, y);

  y += 10;

  doc.setFontSize(16);
  doc.text(meeting.title || 'Reunión sin título', 14, y);

  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  doc.text(`Fecha: ${formatDate(meeting.created_at)}`, 14, y);
  y += 5;

  doc.text(
    `Idioma: ${meeting.language || 'No especificado'}`,
    14,
    y
  );
  y += 5;

  doc.text(
    `Duración: ${formatDuration(meeting.duration_seconds)}`,
    14,
    y
  );
  y += 5;

  doc.text(`Estado: ${meeting.status || 'No especificado'}`, 14, y);

  y += 12;

  // --------------------------------------------------
  // RESUMEN EJECUTIVO
  // --------------------------------------------------

  y = addSectionTitle(doc, 'Resumen Ejecutivo', y);

  y = addWrappedText(
    doc,
    summary?.summary || 'No hay resumen disponible.',
    y
  );

  // --------------------------------------------------
  // PUNTOS CLAVE
  // --------------------------------------------------

  y = addSectionTitle(doc, 'Puntos Clave', y);

  if (summary?.key_points?.length) {
    for (const point of summary.key_points) {
      y = addWrappedText(doc, `• ${point}`, y);
    }
  } else {
    y = addWrappedText(doc, 'No hay puntos clave disponibles.', y);
  }

  // --------------------------------------------------
  // ACUERDOS Y DECISIONES
  // --------------------------------------------------

  y = addSectionTitle(doc, 'Acuerdos y Decisiones', y);

  if (decisions.length) {
    for (const decision of decisions) {
      y = addWrappedText(
        doc,
        `• ${decision.description}`,
        y
      );
    }
  } else {
    y = addWrappedText(
      doc,
      'No hay decisiones registradas.',
      y
    );
  }

  // --------------------------------------------------
  // TAREAS
  // --------------------------------------------------

  y = addSectionTitle(doc, 'Tareas Asignadas', y);

  if (tasks.length) {
    autoTable(doc, {
      startY: y,
      head: [
        [
          'Descripción',
          'Asignado',
          'Fecha límite',
          'Estado',
        ],
      ],
      body: tasks.map((task) => [
        task.description || '',
        task.assignee || 'Sin asignar',
        task.due_date || 'Sin fecha',
        task.completed ? 'Completada' : 'Pendiente',
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fontStyle: 'bold',
      },
      margin: {
        left: 14,
        right: 14,
      },
    });

    y =
      (doc as jsPDF & {
        lastAutoTable?: { finalY: number };
      }).lastAutoTable?.finalY ?? y + 10;

    y += 10;
  } else {
    y = addWrappedText(
      doc,
      'No hay tareas asignadas.',
      y
    );
  }

  // --------------------------------------------------
  // TRANSCRIPCIÓN COMPLETA
  // --------------------------------------------------

  y = addSectionTitle(doc, 'Transcripción Completa', y);

  if (transcription?.content) {
    y = addWrappedText(
      doc,
      transcription.content,
      y
    );
  } else {
    y = addWrappedText(
      doc,
      'No hay transcripción disponible.',
      y
    );
  }

  // --------------------------------------------------
  // PIE DE DOCUMENTO
  // --------------------------------------------------

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    doc.text(
      `Lumen Note AI — Página ${page} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // --------------------------------------------------
  // DESCARGA
  // --------------------------------------------------

  const safeTitle =
    (meeting.title || 'reunion')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);

  doc.save(`Lumen-Note-${safeTitle || 'reunion'}.pdf`);
}
