/**
 * Brand Book PDF export.
 *
 * Captures a DOM node (the off-screen brand-export stage) with html2canvas
 * and compiles it into a single continuous A4-width PDF page via jsPDF.
 * html2canvas paints the live DOM to a real canvas with computed styles, so
 * modern Grid/Flexbox layouts, gradients, and CSS variables resolve natively
 * where an SVG foreignObject serializer would drop them. The capture bakes an
 * opaque obsidian ground into the PNG and pre-fills the PDF page with the
 * same token, so translucent glass surfaces never fall through to white. The
 * bitmap scales to the full 210 mm A4 width with the page height derived from
 * the canvas aspect ratio, producing one continuous sheet.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/** $color-bg-primary — the obsidian ground of the Cyber-SaaS identity. */
const OBSIDIAN_RGB = '#0b0d12';
/** A4 width in millimetres; the single source of truth for the page width. */
const A4_WIDTH_MM = 210;
/** Canvas safety ceiling: keeps the capture below browser canvas limits. */
const MAX_CAPTURE_HEIGHT_PX = 16000;

/**
 * Normalizes a brand name into a filesystem-safe filename fragment.
 *
 * @param {string} brandName The raw identity name.
 * @returns {string} A diacritic-free, hyphenated slug.
 */
function toFileNameSlug(brandName: string): string {
  return brandName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Exports the DOM node identified by `elementId` as a downloadable PDF
 * Brand Book: one continuous A4-width page whose height follows the node's
 * aspect ratio, rendered over the obsidian product ground.
 *
 * @param {string} brandName Name used in the generated file name.
 * @param {string} elementId ID of the DOM node to capture.
 * @returns {Promise<void>} Resolves once the file download has been triggered.
 * @throws {Error} When the node is missing or has no laid-out dimensions.
 */
export async function exportBrandToPDF(
  brandName: string,
  elementId: string,
): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) {
    throw new Error(`No se encontró el nodo de exportación "${elementId}".`);
  }

  const widthPx = node.offsetWidth;
  const heightPx = node.offsetHeight;
  if (widthPx === 0 || heightPx === 0) {
    throw new Error('El área de exportación no tiene dimensiones de layout.');
  }

  const scale = Math.min(2, MAX_CAPTURE_HEIGHT_PX / heightPx);

  const canvas = await html2canvas(node, {
    scale,
    backgroundColor: OBSIDIAN_RGB,
    useCORS: true,
    logging: false,
  });

  const imgWidth = A4_WIDTH_MM;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const doc = new jsPDF({
    orientation: imgHeight >= imgWidth ? 'portrait' : 'landscape',
    unit: 'mm',
    compress: true,
    format: [imgWidth, imgHeight],
  });

  doc.setFillColor(OBSIDIAN_RGB);
  doc.rect(0, 0, imgWidth, imgHeight, 'F');

  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

  doc.save(`ChromaForge_Identidad_${toFileNameSlug(brandName)}.pdf`);
}
