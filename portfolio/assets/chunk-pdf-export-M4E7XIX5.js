var g=n=>String(n).normalize("NFKD").replace(/[^\x20-\x7E]/g,"?"),$=n=>g(n).replace(/([\\()])/g,"\\$1");function h({product:n,type:i,options:d,price:p,dimensions:f}){let s=`${["DEKARA DESIGNS",i==="cut-list"?"Concept cut list":"Concept quotation","",`${n} - CONCEPT ONLY`,`Configuration: ${d.join(" | ")}`,`Indicative price: ${p}`,`Dimensions: ${f}`,"",...i==="cut-list"?["Part schedule:","Panel dimensions: TODO - confirm from approved shop drawings.","Material and thickness: TODO - confirm with manufacturer."]:["Not a live offer. Confirm price and scope in a written quote."],"","CONCEPT ONLY - NOT FOR PRODUCTION.","Confirm product data, materials, pricing and manufacturing details before use."].map((o,a)=>`BT /F1 ${a===0?18:11} Tf 52 ${748-a*36} Td (${$(o)}) Tj ET`).join(`
`)}
`,c=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",`<< /Length ${s.length} >>
stream
${s}endstream`],e=`%PDF-1.4
`,r=[0];c.forEach((o,a)=>{r.push(e.length),e+=`${a+1} 0 obj
${o}
endobj
`});let u=e.length;e+=`xref
0 ${c.length+1}
0000000000 65535 f 
`,r.slice(1).forEach(o=>{e+=`${String(o).padStart(10,"0")} 00000 n 
`}),e+=`trailer
<< /Size ${c.length+1} /Root 1 0 R >>
startxref
${u}
%%EOF`;let m=new Blob([e],{type:"application/pdf"}),l=URL.createObjectURL(m),t=document.createElement("a");t.href=l,t.download=`dekara-${i}.pdf`,document.body.append(t),t.click(),t.remove(),setTimeout(()=>URL.revokeObjectURL(l),4e3)}export{h as downloadPdf};
