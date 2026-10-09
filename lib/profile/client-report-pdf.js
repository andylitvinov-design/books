// In-browser PDF writer for confidential assessment reports.
// Renders unicode text (including Cyrillic) to local canvas then embeds each
// A4 page in a standards-compliant PDF. No third-party service receives results.
// This intentionally does not embed fonts or add npm dependencies.
const W=1240,H=1754, L=90,R=W-90, BODY=R-L, TOP=158, BOTTOM=1615;
const COLORS={ink:'#37322F',paper:'#FFFDF9',cream:'#F8F1E7',terra:'#BE4C2D',green:'#2C7364',sage:'#E2EFE7',muted:'#73685F',line:'#E5D7C8',blue:'#DDEBF2'};
const C={
 en:{brand:'HOLISTIC HOUSE',series:'PERSONAL ASSESSMENT',privacy:'PRIVATE · CLIENT COPY',created:'Prepared',period:'Testing period',summary:'YOUR ASSESSMENT AT A GLANCE',tests:'TESTS',attempts:'ATTEMPTS',scales:'SCALES',profile:'PROFILE LAYERS',measurements:'Latest profile measurements',observations:'What the results show',guidance:'Personal next steps',source:'Measurement source',byTest:'ASSESSMENT BREAKDOWN',result:'Recorded scales',earlier:'EARLIER ATTEMPTS',disclaimer:'Educational self-observation; not a diagnosis or medical advice.',empty:'No completed measurements yet.',cont:'Continued'},
 ru:{brand:'HOLISTIC HOUSE',series:'ПЕРСОНАЛЬНЫЙ ОТЧЁТ',privacy:'КОНФИДЕНЦИАЛЬНО · КОПИЯ КЛИЕНТА',created:'Составлен',period:'Период тестирования',summary:'ОБЗОР РЕЗУЛЬТАТОВ',tests:'ТЕСТОВ',attempts:'ПРОХОЖДЕНИЙ',scales:'ШКАЛ',profile:'СЛОЁВ ПРОФИЛЯ',measurements:'Все последние шкалы профиля',observations:'Что показывают результаты',guidance:'Рекомендации',source:'Источник измерения',byTest:'РЕЗУЛЬТАТЫ ПО ТЕСТАМ',result:'Показатели по шкалам',earlier:'ПРЕДЫДУЩИЕ ИЗМЕРЕНИЯ',disclaimer:'Самонаблюдение; не является диагнозом или медицинской рекомендацией.',empty:'Завершённых измерений пока нет.',cont:'Продолжение'},
};
const tidy=x=>String(x??'').replace(/[\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim();
const shown=x=>Number.isFinite(Number(x))?Number(x).toLocaleString('en-US',{maximumFractionDigits:2}):'—';
const rect=(ctx,x,y,w,h,color,r=0)=>{
 ctx.fillStyle=color;ctx.beginPath();if(r && typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fill();
};
const serif=(ctx,size,weight=400)=>{ctx.font=weight+' '+size+'px Georgia, "Times New Roman", serif';ctx.textBaseline='top'};
const sans=(ctx,size,weight=400)=>{ctx.font=weight+' '+size+'px system-ui, -apple-system, Arial, sans-serif';ctx.textBaseline='top'};
function line(ctx,txt,x,y,{size=27,color=COLORS.ink,bold=false,ser=false}={}) {
 (ser?serif:sans)(ctx,size,bold?700:400);ctx.fillStyle=color;ctx.fillText(tidy(txt),x,y);return y+size*1.37;
}
function wrap(ctx,text,width,size=27,weight=400,ser=false) {
 (ser?serif:sans)(ctx,size,weight);
 const words=tidy(text).split(' ').filter(Boolean),rows=[];let current='';
 for(let word of words){
  if(ctx.measureText(word).width>width){
   if(current){rows.push(current);current=''}
   let piece='';
   for(const character of word){
    if(piece && ctx.measureText(piece+character).width>width){rows.push(piece);piece=character}else piece+=character;
   }
   word=piece;
  }
  if(!current)current=word;
  else if(ctx.measureText(current+' '+word).width<=width)current+=' '+word;
  else {rows.push(current);current=word}
 }
 if(current)rows.push(current);return rows;
}
function paragraph(ctx,text,x,y,width,{size=27,step=38,color=COLORS.ink,weight=400,ser=false}={}){
 const rows=wrap(ctx,text,width,size,weight,ser);
 for(const row of rows)line(ctx,row,x,y,{size,color,bold:weight===700,ser}),y+=step;
 return y;
}
function drawHeader(ctx,copy,pageNumber,category){
 rect(ctx,0,0,W,H,COLORS.paper);
 rect(ctx,0,0,W,19,COLORS.terra);
 sans(ctx,21,700);ctx.fillStyle=COLORS.terra;ctx.fillText(copy.brand,L,61);
 sans(ctx,18,600);ctx.fillStyle=COLORS.muted;ctx.fillText(tidy(category),R-ctx.measureText(tidy(category)).width,62);
 rect(ctx,L,109,BODY,2,COLORS.line);
 rect(ctx,L,1663,BODY,1,COLORS.line);
 line(ctx,copy.disclaimer,L,1680,{size:17,color:COLORS.muted});
 sans(ctx,17,600);ctx.fillStyle=COLORS.green;ctx.fillText(String(pageNumber),R-18,1680);
}
const cover=(ctx,copy,report)=>{
 rect(ctx,0,0,W,H,COLORS.cream);
 rect(ctx,0,0,W,27,COLORS.terra);
 rect(ctx,0,245,W,16,COLORS.sage);
 rect(ctx,900,365,170,170,COLORS.sage,85);rect(ctx,1025,475,98,98,'#E9D8C6',49);
 line(ctx,copy.brand,L,119,{size:31,bold:true,color:COLORS.terra});
 let y=367;
 y=paragraph(ctx,report.title,L,y,820,{size:67,step:86,ser:true});
 y+=22;y=paragraph(ctx,report.accountName,L,y,900,{size:40,step:53,color:COLORS.green,ser:true});
 rect(ctx,L,800,BODY,4,COLORS.terra);
 line(ctx,copy.privacy,L,848,{size:25,bold:true,color:COLORS.terra});
 let yy=920;
 yy=line(ctx,copy.created+': '+report.generatedAt,L,yy,{size:26,color:COLORS.muted})+24;
 yy=paragraph(ctx,copy.period+': '+report.measuredRange,L,yy,BODY,{size:27,step:39,color:COLORS.muted});
 rect(ctx,L,1315,BODY,150,COLORS.paper,23);
 paragraph(ctx,report.disclaimer,L+25,1350,BODY-50,{size:23,step:35,color:COLORS.muted});
 line(ctx,copy.brand,L,1649,{size:20,color:COLORS.green,bold:true});
};
function stats(ctx,copy,report,y){
 let cards=[
  [copy.tests,report.counts.tests],[copy.attempts,report.counts.attempts],
  [copy.scales,report.counts.scales],[copy.profile,report.counts.covered+'/5']
 ];
 const gap=17,w=(BODY-gap*3)/4;
 cards.forEach(([label,value],i)=>{
  const x=L+i*(w+gap);rect(ctx,x,y,w,130,COLORS.sage,14);
  line(ctx,String(value),x+20,y+16,{size:51,bold:true,color:COLORS.green});
  paragraph(ctx,label,x+20,y+91,w-32,{size:19,step:22,color:COLORS.muted,weight:700});
 });
 return y+153;
}
function meter(ctx,x,y,w,dimension) {
 const min=Number(dimension.min),max=Number(dimension.max),value=Number(dimension.value);
 if(![min,max,value].every(Number.isFinite)||max<=min)return;
 const pct=Math.max(0,Math.min(1,(value-min)/(max-min)));
 rect(ctx,x,y,w,10,COLORS.line,5);
 if(pct>0)rect(ctx,x,y,Math.max(3,w*pct),10,COLORS.green,5);
}
export async function generateClientPdf(report) {
 if(!report || !Array.isArray(report.tests) || !report.tests.length)throw new Error('NO_COMPLETED_RESULTS');
 const copy=C[report.language==='ru'?'ru':'en'];const images=[];let page=0,ctx,canvas,y=TOP;
 function newPage(label) {
  // The previous page is flushed before creating a new canvas; browser retains
  // only encoded JPEG byte buffers, not dozens of full-resolution canvases.
  if(canvas)images.push(canvas);
  if(images.length>240)throw new Error('REPORT_TOO_LARGE');
  canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('CANVAS_UNAVAILABLE');
  page++;drawHeader(ctx,copy,page,label);y=TOP;
 }
 const need=(height,label)=>{
  if(y+height>BOTTOM)newPage(label);
 };
 const rule=()=>{rect(ctx,L,y,BODY,2,COLORS.line);y+=23;};
 const header=(title,subtitle,section)=>{
  const label=section||title;need(125,label);
  y=line(ctx,title,L,y,{size:44,ser:true,color:COLORS.ink})+12;
  if(subtitle)y=paragraph(ctx,subtitle,L,y,BODY,{size:25,step:36,color:COLORS.muted})+8;
  rule();
 };
 const para=(txt,{size=26,color=COLORS.ink,step=37,pad=13,weight=400}={})=>{
  const rows=wrap(ctx,txt,BODY,size,weight);need(rows.length*step+pad,txt.slice(0,30));
  y=paragraph(ctx,txt,L,y,BODY,{size,color,step,weight})+pad;
 };
 const scaleRow=(scale,withSource=false)=>{
  const label=scale.label||scale.key||'',value=shown(scale.value),min=shown(scale.min),max=shown(scale.max);
  const lineCount=wrap(ctx,label,BODY-310,24,650).length;
  const rowHeight=Math.max(85,42+lineCount*31+(withSource?25:0));
  need(rowHeight,'Measurements');
  rect(ctx,L,y,BODY,rowHeight-8,'#FBF8F1',12);
  paragraph(ctx,label,L+19,y+13,BODY-300,{size:24,step:31,weight:700});
  if(withSource)line(ctx,scale.date||'',L+19,y+52,{size:18,color:COLORS.muted});
  const right=value+' / '+max;
  sans(ctx,24,700);ctx.fillStyle=COLORS.green;ctx.fillText(right,R-25-ctx.measureText(right).width,y+15);
  meter(ctx,L+20,y+rowHeight-29,BODY-40,scale);
  y+=rowHeight;
 };
 const separator=()=>{need(48,'Assessment');rect(ctx,L,y,BODY,2,COLORS.line);y+=28};
 const resultTitle=(name)=>{
  const rows=wrap(ctx,name,BODY,37,400,true);need(rows.length*47+40,'Assessments');
  y=paragraph(ctx,name,L,y,BODY,{size:37,ser:true,step:47})+8;
 };
 const note=(label,text)=>{
  const rows=wrap(ctx,text,BODY,25,400);
  need(53+rows.length*35,'Assessment');y=line(ctx,label,L,y,{size:21,color:COLORS.green,bold:true})+9;
  y=paragraph(ctx,text,L,y,BODY,{size:25,step:35})+16;
 };
 newPage(copy.series);cover(ctx,copy,report);
 newPage(copy.summary);
 header(copy.summary,report.accountName+' · '+report.measuredRange,copy.summary);
 y=stats(ctx,copy,report,y);
 header(copy.observations,'',copy.summary);
 report.overall.forEach(p=>para(p,{size:27,pad:13}));
 header(copy.guidance,'',copy.summary);
 report.recommendations.forEach(p=>para(p,{size:26,color:COLORS.ink,pad:13}));
 newPage(copy.measurements);
 header(copy.measurements,'',copy.measurements);
 if(report.latestScales.length){
  for(const s of report.latestScales)scaleRow(s,true);
 }else para(copy.empty);
 newPage(copy.byTest);
 header(copy.byTest,report.tests.length+' '+copy.tests,copy.byTest);
 for(const [index,test] of report.tests.entries()){
  const begin='0'+(index+1);
  separator();
  need(85,'Assessment '+(index+1));
  line(ctx,begin.slice(-2),L,y,{size:22,color:COLORS.terra,bold:true});
  y+=41;
  resultTitle(test.title);
  para((test.description||'')+'  ·  '+test.date,{size:24,color:COLORS.muted,pad:10});
  para(copy.source+': '+test.source,{size:19,color:COLORS.muted,pad:17});
  need(65,'Assessment '+(index+1));
  y=line(ctx,copy.result,L,y,{size:24,color:COLORS.green,bold:true})+10;
  for(const s of test.dimensions)scaleRow(s);
  note(report.language==='ru'?'Вывод по тесту':'Assessment conclusion',test.conclusion);
  if(test.attempts.length>1){
   need(58,'History');y=line(ctx,copy.earlier,L,y,{size:23,color:COLORS.green,bold:true})+15;
   // Show every recorded attempt, including the latest; no history silently omitted.
   for(const previous of test.attempts){
    const num=previous.scales.length;
    const txt=previous.date+' · '+num+' '+copy.scales;
    need(52,copy.earlier);y=line(ctx,txt,L,y,{size:22,color:COLORS.muted,bold:true})+6;
    previous.scales.forEach(s=>scaleRow(s));
   }
  }
 }
 const pdfPages=[];
 for(const c of images.concat(canvas)){
  const jpeg=await new Promise((resolve,reject)=>{
   c.toBlob(async b=>{
    if(!b){reject(new Error('CANVAS_EXPORT_FAILED'));return}
    try{resolve(new Uint8Array(await b.arrayBuffer()))}catch(e){reject(e)}
   },'image/jpeg',.84)
  });
  pdfPages.push(jpeg);
 }
 return rasterPagesToPdf(pdfPages,{width:W,height:H});
}
// Build a valid PDF with page-sized JPEG XObjects; all UTF-8 labels were rasterized
// with device fonts, avoiding broken Cyrillic text in platform PDF viewers.
export function rasterPagesToPdf(images,{width=1240,height=1754}={}){
 if(!Array.isArray(images)||!images.length||images.length>241)throw new Error('INVALID_PAGE_COUNT');
 const encoder=new TextEncoder(),chunks=[];let offset=0;const xref=[0];
 const put=(value)=>{const bin=typeof value==='string'?encoder.encode(value):value;chunks.push(bin);offset+=bin.length};
 const obj=(id,text)=>{xref[id]=offset;put(id+' 0 obj\n'+text+'\nendobj\n')};
 put('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 const ids=images.map((_,i)=>3+i*3);
 obj(2,'<< /Type /Pages /Kids ['+ids.map(n=>n+' 0 R').join(' ')+'] /Count '+ids.length+' >>');
 const A4W=595,A4H=842;
 images.forEach((source,i)=>{
  const im=source instanceof Uint8Array?source:new Uint8Array(source);
  if(im.length<4||im[0]!==0xff||im[1]!==0xd8)throw new Error('EXPECTED_JPEG');
  const pid=3+i*3,iid=pid+1,cid=pid+2;
  obj(pid,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+A4W+' '+A4H+'] /Resources << /XObject << /PageImage '+iid+' 0 R >> >> /Contents '+cid+' 0 R >>');
  xref[iid]=offset;
  put(iid+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.length+' >>\nstream\n');
  put(im);put('\nendstream\nendobj\n');
  const stream='q\n'+A4W+' 0 0 '+A4H+' 0 0 cm\n/PageImage Do\nQ\n';
  xref[cid]=offset;
  put(cid+' 0 obj\n<< /Length '+encoder.encode(stream).length+' >>\nstream\n'+stream+'endstream\nendobj\n');
 });
 const index=offset,max=2+images.length*3;
 put('xref\n0 '+(max+1)+'\n0000000000 65535 f \n');
 for(let i=1;i<=max;i++)put(String(xref[i]).padStart(10,'0')+' 00000 n \n');
 put('trailer\n<< /Size '+(max+1)+' /Root 1 0 R >>\nstartxref\n'+index+'\n%%EOF\n');
 return new Blob(chunks,{type:'application/pdf'});
}
