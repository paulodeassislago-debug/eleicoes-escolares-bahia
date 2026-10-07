const categories=['Geral','Quilombola','LGBTQIAPN+','do Campo','PCD'];
const title=round=>round===1?'Líderes de classe':round===2?'Líderes escolares':'Jovens ouvidores';
const role=(round,category)=>category===0?(round===1?'Líder da Turma':round===2?'Líder Escolar':'Jovem Ouvidor Geral'):(round===1?'Líder de Classe ':round===2?'Líder Escolar ':'Jovem Ouvidor ')+categories[category];

// Use the same class scope and category order as the electronic ballot.
export function colinhas(school){
  const round=school.round,state=school.rounds[round];
  return school.classes.flatMap(turma=>state.tokens.filter(token=>token.classId===turma.id&&!token.used).map(token=>{
    const candidates=state.candidates.filter(c=>round!==1||c.classId===turma.id);
    const offices=[...new Set(candidates.map(c=>c.category))].sort((a,b)=>a-b).map(category=>({
      label:role(round,category),
      digits:Math.max(...candidates.filter(c=>c.category===category).map(c=>String(c.number).length))
    }));
    return {classId:turma.id,className:turma.name,code:String(token.code),offices};
  }));
}

export async function downloadColinhas(school){
  const cards=colinhas(school);
  if(!cards.length)throw Error('Não há códigos disponíveis para imprimir neste turno.');
  await import('./jspdf.umd.min.js');
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
  pdf.setProperties({title:`Colinhas — ${school.name} — ${school.round}º turno`,subject:'Códigos individuais e campos em branco para anotar os números dos candidatos',creator:'Eleições Escolares Bahia'});
  let slot=0,currentClass=cards[0].classId,page=1;
  const startPage=()=>{pdf.addPage();page++;slot=0;};
  for(const card of cards){
    if(slot===8||(slot&&card.classId!==currentClass))startPage();
    currentClass=card.classId;
    const x=10+(slot%2)*96,y=10+Math.floor(slot/2)*69,width=94;
    pdf.setDrawColor(130);pdf.setLineWidth(.2);pdf.setLineDashPattern([1.2,1.2],0);pdf.rect(x,y,width,67);pdf.setLineDashPattern([],0);
    pdf.setTextColor(25);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
    pdf.text(`MINHA COLINHA · ${school.round}º TURNO`,x+4,y+5);
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);
    pdf.text(pdf.splitTextToSize(school.name,86).slice(0,2),x+4,y+9);
    pdf.setFont('helvetica','bold');pdf.setFontSize(9);
    pdf.text(pdf.splitTextToSize(`Turma: ${card.className}`,86).slice(0,1),x+4,y+17);
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('Código individual:',x+4,y+24);
    pdf.setFont('courier','bold');pdf.setFontSize(16);pdf.text(card.code,x+34,y+24);
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.text(title(school.round)+' · Anote seus números:',x+4,y+29);
    card.offices.forEach((office,index)=>{
      const row=y+31+index*6.6;
      pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(office.label,55).slice(0,2),x+4,row+3.5);
      pdf.setDrawColor(50);pdf.setLineWidth(.25);
      for(let digit=0;digit<office.digits;digit++)pdf.rect(x+61+digit*5.6,row,5.2,5.2);
    });
    pdf.setFontSize(6.5);pdf.setTextColor(65);pdf.text('Um código por estudante. Preencha antes de entrar na urna.',x+4,y+64.5);
    slot++;
  }
  for(let i=1;i<=page;i++){
    pdf.setPage(i);pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.setTextColor(65);
    pdf.text('Imprima em A4, tamanho real (100%). Recorte nas linhas pontilhadas.',10,292);
    pdf.text(`${i} / ${page}`,200,292,{align:'right'});
  }
  pdf.save(`colinhas-turno-${school.round}.pdf`);
}
