const ascii = (value) => String(value).normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
const pdfEscape = (value) => ascii(value).replace(/([\\()])/g, '\\$1');

export function downloadPdf({ product, type, options, price, dimensions }) {
  const label = type === 'cut-list' ? 'Concept cut list' : 'Concept quotation';
  const lines = [
    'DEKARA DESIGNS',
    label,
    '',
    `${product} - CONCEPT ONLY`,
    `Configuration: ${options.join(' | ')}`,
    `Indicative price: ${price}`,
    `Dimensions: ${dimensions}`,
    '',
    ...(type === 'cut-list'
      ? ['Part schedule:', 'Panel dimensions: TODO - confirm from approved shop drawings.', 'Material and thickness: TODO - confirm with manufacturer.']
      : ['Not a live offer. Confirm price and scope in a written quote.']),
    '',
    'CONCEPT ONLY - NOT FOR PRODUCTION.',
    'Confirm product data, materials, pricing and manufacturing details before use.'
  ];
  const text = lines.map((line, index) =>
    `BT /F1 ${index === 0 ? 18 : 11} Tf 52 ${748 - index * 36} Td (${pdfEscape(line)}) Tj ET`
  ).join('\n');
  const stream = `${text}\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dekara-${type}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
