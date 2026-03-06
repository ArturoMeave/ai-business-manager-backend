const PDFDocument = require('pdfkit');

const generateInvoice = (res, data) => {
    //creo el documento pdf
    const doc = new PDFDocument({margin: 50});

    //conecto el documento directamente a la respuesta http asi se descargara solo
    doc.pipe(res);

    // --- CABECERA (Datos de tu Empresa) ---
    doc.fontSize(20).text('FACTURA', { align: 'right' });
    doc.moveDown();

    doc.fontSize(10)
       .text(data.company.name || 'Mi Empresa', { align: 'left' })
       .text(`NIF: ${data.company.taxId || 'No especificado'}`)
       .text(data.company.address || 'Dirección no especificada')
       .moveDown();

    // --- DATOS DEL CLIENTE (A quien le cobras) ---
    doc.text('FACTURADO A:', { underline: true })
       .text(data.client.name || 'Cliente Genérico')
       .text(data.client.email || '')
       .moveDown();

    // --- DETALLES DEL MOVIMIENTO ---
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // Línea separadora
    doc.moveDown();

    doc.fontSize(12).text('Concepto:', { continued: true }).text(data.finance.description, { align: 'right' });
    doc.moveDown();
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // Línea separadora
    doc.moveDown();

    // --- TOTAL ---
    doc.fontSize(16).text(`TOTAL: ${data.finance.amount} ${data.company.currency || '€'}`, { align: 'right' });

    // --- PIE DE PÁGINA ---
    doc.fontSize(10)
       .text('Gracias por su confianza.', 50, 700, { align: 'center', width: 500 });

    // 3. Finalizamos y cerramos el documento
    doc.end();
};

module.exports = {generateInvoice};