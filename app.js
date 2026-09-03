import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const DOCS={
 general:{name:'비지정후원금 기탁서',files:['./templates/general.pdf']},
 designated:{name:'지정후원금 기탁서',files:['./templates/designated.pdf']},
 goods:{name:'현물 기탁신청서',files:['./templates/goods.pdf']},
 cms:{name:'CMS 후원',files:['./templates/general.pdf','./templates/cms.pdf']}
};

const $=id=>document.getElementById(id);
const home=$('homeView'),editor=$('editorView'),pdfCanvas=$('pdfCanvas'),inkCanvas=$('inkCanvas'),pageBox=$('pageBox');
const pctx=pdfCanvas.getContext('2d'),ictx=inkCanvas.getContext('2d');
let currentType=null,pdfParts=[],pageMap=[],pageIndex=0,strokes=[],drawing=false,currentStroke=null,deferredPrompt=null;

function status(t){$('status').textContent=t;}
function setInkSize(w,h){inkCanvas.width=w;inkCanvas.height=h;inkCanvas.style.width=w+'px';inkCanvas.style.height=h+'px';pageBox.style.width=w+'px';pageBox.style.height=h+'px';}
function clone(v){return JSON.parse(JSON.stringify(v));}

async function loadDocument(type){
 currentType=type; pageIndex=0; pdfParts=[]; pageMap=[]; strokes=[];
 home.hidden=true;editor.hidden=false;status('원본 기탁서를 불러오는 중입니다.');
 try{
   for(let fi=0;fi<DOCS[type].files.length;fi++){
     const url=DOCS[type].files[fi];
     const bytes=new Uint8Array(await (await fetch(url,{cache:'no-store'})).arrayBuffer());
     const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
     pdfParts.push({url,bytes,pdf});
     for(let p=1;p<=pdf.numPages;p++){pageMap.push({fi,page:p});strokes.push([]);}
   }
   await renderPage(); status('S펜으로 원본 서류의 빈칸에 직접 작성해 주세요.');
 }catch(e){console.error(e);status('원본 PDF를 찾을 수 없습니다. templates 폴더의 파일명을 확인해 주세요.');alert('기탁서 PDF 템플릿을 불러오지 못했습니다.\nREADME의 파일명대로 templates 폴더에 PDF를 넣어주세요.');}
}

async function renderPage(){
 if(!pageMap.length)return;
 const m=pageMap[pageIndex],page=await pdfParts[m.fi].pdf.getPage(m.page);
 const maxW=Math.min(window.innerWidth-34,1050); const natural=page.getViewport({scale:1}); const scale=Math.max(.6,Math.min(1.75,maxW/natural.width));
 const vp=page.getViewport({scale}); pdfCanvas.width=vp.width;pdfCanvas.height=vp.height;pdfCanvas.style.width=vp.width+'px';pdfCanvas.style.height=vp.height+'px';setInkSize(vp.width,vp.height);
 await page.render({canvasContext:pctx,viewport:vp}).promise; redraw(); $('pageLabel').textContent=`${pageIndex+1} / ${pageMap.length}`;$('prevBtn').disabled=pageIndex===0;$('nextBtn').disabled=pageIndex===pageMap.length-1;
}

function redraw(){ictx.clearRect(0,0,inkCanvas.width,inkCanvas.height);ictx.lineCap='round';ictx.lineJoin='round';for(const s of strokes[pageIndex]||[]) drawStroke(s,false);}
function drawStroke(s,live){if(!s.points.length)return;ictx.beginPath();const first=s.points[0];ictx.moveTo(first.x*inkCanvas.width,first.y*inkCanvas.height);for(let i=1;i<s.points.length;i++){const p=s.points[i];ictx.lineTo(p.x*inkCanvas.width,p.y*inkCanvas.height);}ictx.strokeStyle='#111';ictx.lineWidth=s.size*(live && s.pressure?Math.max(.7,s.pressure*1.7):1);ictx.stroke();}
function pos(e){const r=inkCanvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,pressure:e.pressure||.5};}
inkCanvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.isPrimary===false)return; e.preventDefault();inkCanvas.setPointerCapture(e.pointerId);drawing=true;const p=pos(e);currentStroke={size:+$('penSize').value,pressure:p.pressure,points:[p]};strokes[pageIndex].push(currentStroke);});
inkCanvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=pos(e);currentStroke.points.push(p);redraw();});
function end(e){if(!drawing)return;drawing=false;currentStroke=null;try{inkCanvas.releasePointerCapture(e.pointerId)}catch{}}
inkCanvas.addEventListener('pointerup',end);inkCanvas.addEventListener('pointercancel',end);

$('undoBtn').onclick=()=>{strokes[pageIndex]?.pop();redraw();};
$('clearBtn').onclick=()=>{if(confirm('현재 페이지에 작성한 필기를 모두 지울까요?')){strokes[pageIndex]=[];redraw();}};
$('prevBtn').onclick=async()=>{if(pageIndex>0){pageIndex--;await renderPage();}};
$('nextBtn').onclick=async()=>{if(pageIndex<pageMap.length-1){pageIndex++;await renderPage();}};
$('backBtn').onclick=()=>{if(confirm('작성 중인 내용을 종료할까요? 저장되지 않은 필기는 사라집니다.')){editor.hidden=true;home.hidden=false;}};

async function createOverlayPng(pageStrokes,width,height){
 const c=document.createElement('canvas');c.width=Math.round(width);c.height=Math.round(height);const x=c.getContext('2d');x.lineCap='round';x.lineJoin='round';x.strokeStyle='#111';
 for(const s of pageStrokes){if(!s.points.length)continue;x.beginPath();x.moveTo(s.points[0].x*c.width,s.points[0].y*c.height);for(let i=1;i<s.points.length;i++)x.lineTo(s.points[i].x*c.width,s.points[i].y*c.height);x.lineWidth=s.size*1.35;x.stroke();}
 return new Uint8Array(await (await fetch(c.toDataURL('image/png'))).arrayBuffer());
}

$('saveBtn').onclick=async()=>{
 if(!window.PDFLib){alert('PDF 저장 라이브러리를 아직 불러오지 못했습니다. 인터넷 연결 후 다시 시도해 주세요.');return;}
 const btn=$('saveBtn');btn.disabled=true;status('필기 내용을 원본 PDF에 합치는 중입니다...');
 try{
   const {PDFDocument}=window.PDFLib; const out=await PDFDocument.create(); let globalPage=0;
   for(const part of pdfParts){
     const src=await PDFDocument.load(part.bytes); const copied=await out.copyPages(src,src.getPageIndices());
     for(const pg of copied){out.addPage(pg); const {width,height}=pg.getSize();const pngBytes=await createOverlayPng(strokes[globalPage]||[],width,height);const img=await out.embedPng(pngBytes);pg.drawImage(img,{x:0,y:0,width,height});globalPage++;}
   }
   out.setTitle(`남양주시장애인복지관 ${DOCS[currentType].name}`);out.setCreator('남양주시장애인복지관 전자 기탁서');
   const bytes=await out.save();const blob=new Blob([bytes],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');const d=new Date();const ds=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;a.href=url;a.download=`${ds}_${DOCS[currentType].name.replaceAll(' ','_')}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);status('완료되었습니다. 작성된 PDF가 기기에 저장되었습니다.');
 }catch(e){console.error(e);alert('PDF 저장 중 오류가 발생했습니다.');status('저장 오류가 발생했습니다.');}
 finally{btn.disabled=false;}
};

document.querySelectorAll('.doc-card').forEach(b=>b.onclick=()=>loadDocument(b.dataset.type));
window.addEventListener('resize',()=>{if(!editor.hidden&&pageMap.length)renderPage();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false;});
$('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true;};
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
