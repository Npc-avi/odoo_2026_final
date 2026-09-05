import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

interface DocumentItem {
  id?: string;
  description?: string;
  product_name?: string;
  sku?: string;
  line_type?: string;
  item_type?: string;
  quantity?: number;
  unit_price?: number | string;
  calculated_unit_price?: number | string;
  applied_discount_pct?: number | string;
  line_total?: number | string;
}

interface ExportData {
  invoice: any;
  quotation?: any;
}

/**
 * Export Invoice & Quotation breakdown as a styled PDF using jsPDF + jspdf-autotable
 */
export function exportInvoiceQuotationPDF({ invoice, quotation }: ExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [17, 24, 39]; // #111827
  const accentColor = [255, 59, 48]; // #ff3b30
  const emeraldColor = [16, 185, 129];
  const neutralGray = [107, 114, 128];

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DEALFLOW 360', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('ENTERPRISE RECONCILED INVOICE & QUOTATION STATEMENT', 14, 23);

  // Status Badge on top right
  const isPaid = invoice?.status === 'paid';
  doc.setFillColor(isPaid ? 16 : 225, isPaid ? 185 : 29, isPaid ? 129 : 72);
  doc.roundedRect(160, 10, 36, 12, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(isPaid ? 'PAID' : 'UNPAID / ISSUED', 178, 17.5, { align: 'center' });

  // Invoice & Customer Info Grid
  let y = 42;
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice: ${invoice?.invoice_number || 'INV-DRAFT'}`, 14, y);

  if (quotation?.quotation_code) {
    doc.setFontSize(10);
    doc.setTextColor(neutralGray[0], neutralGray[1], neutralGray[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Origin Quotation: ${quotation.quotation_code}`, 14, y + 6);
  }

  // Right column: Date info
  doc.setFontSize(9);
  doc.setTextColor(neutralGray[0], neutralGray[1], neutralGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED DATE:', 130, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(invoice?.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : 'N/A', 170, y, { align: 'right' });

  doc.setTextColor(neutralGray[0], neutralGray[1], neutralGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('DUE DATE:', 130, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(invoice?.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Immediate', 170, y + 6, { align: 'right' });

  y += 18;

  // Customer Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 24, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(neutralGray[0], neutralGray[1], neutralGray[2]);
  doc.text('BILLED TO / CUSTOMER ACCOUNT:', 20, y + 7);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(invoice?.customer_name || quotation?.customer_company_name || 'Client Account', 20, y + 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(neutralGray[0], neutralGray[1], neutralGray[2]);
  const emailText = invoice?.customer_email || quotation?.customer_email || 'customer@client.com';
  doc.text(emailText, 20, y + 19);

  if (quotation?.tier || quotation?.customer_tier) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`TIER: ${quotation.tier || quotation.customer_tier}`, 180, y + 14, { align: 'right' });
  }

  y += 32;

  // Quotation / Invoice Line Items
  const items: DocumentItem[] = quotation?.items?.length
    ? quotation.items
    : invoice?.items?.length
    ? invoice.items
    : [];

  const tableRows = items.map((item, index) => {
    const desc = item.description || item.product_name || `Line Item #${index + 1}`;
    const type = (item.line_type || item.item_type || 'Standard').toUpperCase();
    const qty = item.quantity || 1;
    const unitPrice = Number(item.calculated_unit_price || item.unit_price || 0);
    const discount = item.applied_discount_pct ? `${Number(item.applied_discount_pct).toFixed(1)}%` : '0.0%';
    const lineTotal = Number(item.line_total || unitPrice * qty);

    return [
      `#${index + 1}`,
      desc,
      type,
      qty.toString(),
      `$${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      discount,
      `$${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description & Product', 'Type', 'Qty', 'Unit Price', 'Discount', 'Total']],
    body: tableRows.length > 0 ? tableRows : [['1', 'General Services / Product Delivery', 'Standard', '1', `$${Number(invoice?.total_amount || 0).toFixed(2)}`, '0%', `$${Number(invoice?.total_amount || 0).toFixed(2)}`]],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 65 },
      2: { cellWidth: 26 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;

  // Totals Box on Bottom Right
  const totalsY = finalY + 10;
  const subtotal = Number(invoice?.subtotal_amount || invoice?.total_amount * 0.9259 || 0);
  const tax = Number(invoice?.tax_amount || invoice?.total_amount * 0.0741 || 0);
  const total = Number(invoice?.total_amount || 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(120, totalsY, 76, 34, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(neutralGray[0], neutralGray[1], neutralGray[2]);
  doc.text('Subtotal:', 125, totalsY + 8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`$${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 190, totalsY + 8, { align: 'right' });

  doc.setTextColor(neutralGray[0], neutralGray[1], neutralGray[2]);
  doc.text('Tax / VAT (8%):', 125, totalsY + 16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`$${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 190, totalsY + 16, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(125, totalsY + 20, 191, totalsY + 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('Grand Total:', 125, totalsY + 28);
  doc.text(`$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 190, totalsY + 28, { align: 'right' });

  // Fulfillment Policy / Reconciled Banner Footer
  const footerY = Math.min(totalsY + 45, 270);
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.roundedRect(14, footerY, 182, 14, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.', 105, footerY + 8.5, { align: 'center' });

  const fileName = `${invoice?.invoice_number || 'INVOICE'}_Quotation_Details.pdf`;
  doc.save(fileName);
}

/**
 * Export Invoice & Quotation breakdown as Microsoft Word (.docx) using docx + file-saver
 */
export async function exportInvoiceQuotationDOCX({ invoice, quotation }: ExportData) {
  const isPaid = invoice?.status === 'paid';
  const subtotal = Number(invoice?.subtotal_amount || invoice?.total_amount * 0.9259 || 0);
  const tax = Number(invoice?.tax_amount || invoice?.total_amount * 0.0741 || 0);
  const total = Number(invoice?.total_amount || 0);

  const items: DocumentItem[] = quotation?.items?.length
    ? quotation.items
    : invoice?.items?.length
    ? invoice.items
    : [];

  const tableHeader = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, color: 'FFFFFF' })] })],
        shading: { fill: '0F172A', type: ShadingType.CLEAR, color: 'auto' },
        width: { size: 8, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Product / Description', bold: true, color: 'FFFFFF' })] })],
        shading: { fill: '0F172A', type: ShadingType.CLEAR, color: 'auto' },
        width: { size: 42, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Type', bold: true, color: 'FFFFFF' })] })],
        shading: { fill: '0F172A', type: ShadingType.CLEAR, color: 'auto' },
        width: { size: 15, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Qty', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
        shading: { fill: '0F172A', type: ShadingType.CLEAR, color: 'auto' },
        width: { size: 10, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Unit Price', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.RIGHT })],
        shading: { fill: '0F172A', type: ShadingType.CLEAR, color: 'auto' },
        width: { size: 12, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.RIGHT })],
        shading: { fill: '0F172A', type: ShadingType.CLEAR, color: 'auto' },
        width: { size: 13, type: WidthType.PERCENTAGE },
      }),
    ],
  });

  const tableRows = (items.length > 0 ? items : [{ description: 'General Contract Fulfillment', line_type: 'standard', quantity: 1, unit_price: total, line_total: total }]).map((item, idx) => {
    const desc = item.description || item.product_name || `Line #${idx + 1}`;
    const type = (item.line_type || item.item_type || 'standard').toUpperCase();
    const qty = item.quantity || 1;
    const unitPrice = Number(item.calculated_unit_price || item.unit_price || 0);
    const lineTotal = Number(item.line_total || unitPrice * qty);

    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: String(idx + 1) })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: desc, bold: true })] })],
        }),
        new TableCell({
          children: [new Paragraph({ text: type })],
        }),
        new TableCell({
          children: [new Paragraph({ text: String(qty), alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          children: [new Paragraph({ text: `$${unitPrice.toFixed(2)}`, alignment: AlignmentType.RIGHT })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `$${lineTotal.toFixed(2)}`, bold: true })], alignment: AlignmentType.RIGHT })],
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'DEALFLOW 360',
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: ' | SALES OPERATIONS & REVENUE LEDGER',
                size: 24,
                color: '64748B',
              }),
            ],
          }),
          new Paragraph({
            text: `Invoice Statement: ${invoice?.invoice_number || 'INV-DRAFT'}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Customer / Account: ', bold: true }),
              new TextRun({ text: invoice?.customer_name || quotation?.customer_company_name || 'Acme Client' }),
              new TextRun({ text: '    |    Status: ', bold: true }),
              new TextRun({
                text: isPaid ? 'PAID' : 'UNPAID',
                bold: true,
                color: isPaid ? '16A34A' : 'DC2626',
              }),
              new TextRun({ text: '    |    Due Date: ', bold: true }),
              new TextRun({ text: invoice?.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Immediate' }),
            ],
            spacing: { after: 200 },
          }),
          ...(quotation?.quotation_code
            ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Origin Quotation: ', bold: true }),
                    new TextRun({ text: quotation.quotation_code }),
                    new TextRun({ text: '    |    Contract Pipeline: ', bold: true }),
                    new TextRun({ text: 'Order Confirmed → Shipped → Invoiced' }),
                  ],
                  spacing: { after: 300 },
                }),
              ]
            : []),
          new Paragraph({
            text: 'Order Line Items & Delivery Reconciliation',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 150 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [tableHeader, ...tableRows],
          }),
          new Paragraph({
            spacing: { before: 300 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Subtotal: $${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` }),
              new TextRun({ text: `Estimated Tax (8%): $${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` }),
              new TextRun({
                text: `Grand Total: $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                bold: true,
                size: 28,
                color: 'FF3B30',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: 'POLICY NOTE: Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.',
                italics: true,
                bold: true,
                color: '92400E',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${invoice?.invoice_number || 'INVOICE'}_Quotation_Details.docx`;
  saveAs(blob, fileName);
}
