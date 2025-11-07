import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 🔧 Esto permite usar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📄 Generar PDF genérico
export const generatePDF = (filename, title, headers, rows) => {
  // 🧭 Ruta absoluta para "backend/reports"
  const outputDir = path.resolve(__dirname, '../reports');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${filename}.pdf`);
  console.log('📁 Guardando PDF en:', outputPath);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Encabezado
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown();

  // Cabeceras
  doc.fontSize(12);
  headers.forEach(header => doc.text(header, { continued: true, width: 150 }));
  doc.moveDown();

  // Filas
  doc.fontSize(10);
  rows.forEach(row => {
    Object.values(row).forEach(val => {
      doc.text(String(val), { continued: true, width: 150 });
    });
    doc.moveDown();
  });

  doc.end();
  return outputPath;
};
