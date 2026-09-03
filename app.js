'use strict';

const ORG='남양주시장애인복지관';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const homeView=$('#homeView'), formView=$('#formView'), dynamicFields=$('#dynamicFields');
const donationForm=$('#donationForm'), formTitle=$('#formTitle'), formSub=$('#formSub');
const signatureCanvas=$('#signatureCanvas'), ctx=signatureCanvas.getContext('2d');
let currentType=null, isSigning=false, hasSignature=false, deferredPrompt=null;

const formMeta={
  general:{title:'비지정후원금 기탁서',sub:'비지정후원금 기탁 내용을 작성합니다.'},
  designated:{title:'지정후원금 기탁서',sub:'지정 후원 목적과 기탁 내용을 작성합니다.'},
  goods:{title:'현물 기탁신청서',sub:'현물 품목과 환산금액을 작성합니다.'},
  cms:{title:'CMS 후원 신청',sub:'비지정후원금 기탁서와 CMS 이용 신규신청서를 함께 작성합니다.'}
};

function field(name,label,type='text',required=false,full=false,placeholder=''){
  const req=required?'required':'';
  if(type==='textarea') return `<div class="field ${full?'full':''}"><label class="${required?'required':''}" for="${name}">${label}</label><textarea id="${name}" name="${name}" ${req} placeholder="${placeholder}"></textarea></div>`;
  return `<div class="field ${full?'full':''}"><label class="${required?'required':''}" for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" ${req} placeholder="${placeholder}"></div>`;
}

function donorSection({designated=false}={}){
  return `<section class="card"><h3>기부자 정보</h3><div class="field-grid">
    ${field('donorName','기부자(명칭/성명)','text',true)}
    ${field('bizNo','사업자등록번호 / 주민등록번호','text',false,false,'해당하는 번호를 입력')}
    ${field('address','주소','text',false,true)}
    ${field('representative','대표자(법인일 경우)')}
    ${field('contact','담당자 / 연락처','text',true)}
    ${field('email','이메일','email')}
    ${designated?field('useMethod','후원금 사용 방법','textarea',true,true,'특정 대상자 후원연계, 특정 사업 연계 등'):''}
  </div></section>`;
}

function moneySection(){
  return `<section class="card"><h3>기탁 내용</h3><div class="field-grid">
    <div class="field"><label class="required">기탁구분</label><select name="donationPeriod" required><option value="">선택</option><option>일시</option><option>정기</option></select></div>
    ${field('amount','기부금액(원)','number',true)}
    ${field('depositDate','입금(예정)일','date')}
    ${field('depositor','입금자명')}
  </div></section>`;
}

function goodsSection(){
  return `<section class="card"><h3>현물 기탁 정보</h3><div class="field-grid">
    ${field('goodsDesignation','지정내용','textarea',false,true,'특정 대상자 또는 사업 연계 내용')}
    ${field('goodsValue','기부가액(원)','number',false)}
    <div class="field"><label>환가증빙유무</label><select name="evidence"><option>유</option><option>무</option></select></div>
  </div>
  <h4>품목</h4><div class="table-wrap"><table class="items-table"><thead><tr><th>품목</th><th>규격</th><th>수량</th><th>단가</th><th></th></tr></thead><tbody id="itemsBody"></tbody></table></div>
  <div class="row-actions"><button type="button" class="ghost" id="addItemBtn">+ 품목 추가</button></div></section>`;
}

function cmsSection(){
  return `<section class="card"><h3>CMS 이용 신규신청서 정보</h3><p class="notice">업로드해주신 「CMS 이용 신규신청서」의 주요 작성항목을 그대로 전자화한 화면입니다.</p><div class="field-grid">
    <div class="field"><label>신청기관 구분</label><select name="cmsBusinessType"><option>법인사업자</option><option>개인사업자</option></select></div>
    ${field('cmsTradeName','상호','text',true)}
    ${field('cmsRep','대표자','text',true)}
    ${field('cmsRegNo','사업자(고유)등록번호')}
    ${field('cmsAddress','사업장주소','text',false,true)}
    <div class="field"><label>신청정보</label><select name="cmsTransferType"><option>출금이체</option><option>입금이체</option></select></div>
    <div class="field"><label>출금방식</label><select name="cmsTiming"><option>익일 출금</option><option>당일 출금</option></select></div>
    ${field('cmsBank','수납모계좌 금융기관명')}
    ${field('cmsAccount','수납모계좌 계좌번호')}
    ${field('cmsMemo','통장 기재내용','text',false,false,'상호 포함 8자 이내')}
    ${field('cmsFundType','자금종류','text',false,false,'예: 후원금')}
    ${field('cmsMonthlyLimit','월간출금한도(원)','number')}
    ${field('cmsPerLimit','건당출금한도(원)','number')}
    <div class="field"><label>보증수단</label><select name="cmsGuarantee"><option>보증보험</option><option>질권</option><option>금융기관 지급보증서</option><option>결제원담보금</option><option>협력사 책임제</option><option>당연직접접수</option><option>신용등급면제</option><option>보증수단 없음</option></select></div>
    ${field('cmsFeeBank','중계수수료 납부계좌 금융기관명')}
    ${field('cmsFeeAccount','중계수수료 납부계좌 계좌번호')}
    ${field('cmsFeeOwner','예금주')}
    ${field('cmsFeeBirth','예금주 생년월일/사업자등록번호')}
    ${field('cmsManager','CMS 담당자 성명')}
    ${field('cmsManagerTel','CMS 담당자 전화번호')}
    ${field('cmsManagerMobile','CMS 담당자 휴대전화번호')}
    ${field('cmsManagerEmail','CMS 담당자 이메일','email')}
  </div>
  <label class="check-row"><input type="checkbox" name="cmsCreditConsent" required> CMS 업무를 위한 개인(신용)정보 수집 및 이용에 동의합니다.</label>
  <label class="check-row"><input type="checkbox" name="cmsThirdConsent" required> CMS 업무를 위한 개인(신용)정보 제3자 제공에 동의합니다.</label>
  <label class="check-row"><input type="checkbox" name="cmsTermsConsent" required> CMS 이용약관 및 제한 용도를 이해하고 동의합니다.</label>
  </section>`;
}

function renderForm(type){
  currentType=type; formTitle.textContent=formMeta[type].title; formSub.textContent=formMeta[type].sub;
  if(type==='general') dynamicFields.innerHTML=donorSection()+moneySection();
  if(type==='designated') dynamicFields.innerHTML=donorSection({designated:true})+moneySection();
  if(type==='goods') dynamicFields.innerHTML=donorSection()+goodsSection();
  if(type==='cms') dynamicFields.innerHTML=donorSection()+moneySection()+cmsSection();
  homeView.classList.remove('active'); formView.classList.add('active');
  if(type==='goods'){addItemRow();$('#addItemBtn').addEventListener('click',addItemRow)}
  requestAnimationFrame(resizeSignature);
  window.scrollTo({top:0,behavior:'smooth'});
}

function addItemRow(){
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><input name="itemName" placeholder="품목"></td><td><input name="itemSpec" placeholder="규격"></td><td><input name="itemQty" type="number" min="0"></td><td><input name="itemPrice" type="number" min="0"></td><td><button type="button" class="danger-btn remove-item">×</button></td>`;
  $('#itemsBody').appendChild(tr); tr.querySelector('.remove-item').onclick=()=>tr.remove();
}

function resizeSignature(){
  const rect=signatureCanvas.getBoundingClientRect(); const dpr=Math.max(1,window.devicePixelRatio||1);
  signatureCanvas.width=Math.floor(rect.width*dpr); signatureCanvas.height=Math.floor(rect.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.lineWidth=2.2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#111';
  hasSignature=false;
}
function pos(e){const r=signatureCanvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
signatureCanvas.addEventListener('pointerdown',e=>{isSigning=true;hasSignature=true;signatureCanvas.setPointerCapture(e.pointerId);const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y)});
signatureCanvas.addEventListener('pointermove',e=>{if(!isSigning)return;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke()});
['pointerup','pointercancel','pointerleave'].forEach(ev=>signatureCanvas.addEventListener(ev,()=>{isSigning=false}));
$('#clearSignBtn').addEventListener('click',()=>{ctx.clearRect(0,0,signatureCanvas.width,signatureCanvas.height);hasSignature=false;$('#signError').hidden=true});
window.addEventListener('resize',()=>{if(formView.classList.contains('active'))resizeSignature()});

$$('.type-card').forEach(b=>b.addEventListener('click',()=>renderForm(b.dataset.type)));
$('#backBtn').addEventListener('click',()=>{if(confirm('작성 중인 내용을 닫고 처음 화면으로 이동할까요?')){donationForm.reset();formView.classList.remove('active');homeView.classList.add('active');loadSaved();}});

function serialize(){
  const fd=new FormData(donationForm), data={};
  for(const [k,v] of fd.entries()){if(data[k]!==undefined){data[k]=Array.isArray(data[k])?[...data[k],v]:[data[k],v]}else data[k]=v;}
  ['consentPrivacy','consentThird','consentId','consentIdThird','finalConfirm','cmsCreditConsent','cmsThirdConsent','cmsTermsConsent'].forEach(k=>data[k]=fd.has(k));
  if(currentType==='goods'){
    data.items=$$('#itemsBody tr').map(tr=>({name:$('[name=itemName]',tr).value,spec:$('[name=itemSpec]',tr).value,qty:$('[name=itemQty]',tr).value,price:$('[name=itemPrice]',tr).value})).filter(x=>x.name||x.spec||x.qty||x.price);
  }
  data.type=currentType; data.createdAt=new Date().toISOString(); data.signature=signatureCanvas.toDataURL('image/png');
  return data;
}

function safeName(s){return (s||'기부자').replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'_').slice(0,60)}
function ymd(){const d=new Date();return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`}

function canvasPage(){const c=document.createElement('canvas');c.width=1240;c.height=1754;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);return {c,x}}
function txt(x,text,px=28,weight=400,align='left'){x.font=`${weight} ${px}px "Noto Sans KR","Malgun Gothic",sans-serif`;x.fillStyle='#111';x.textAlign=align;x.textBaseline='top';x.fillText(String(text??''),0,0)}
function wrap(x,text,left,top,maxWidth,lineHeight=40,px=25,weight=400){x.font=`${weight} ${px}px "Noto Sans KR","Malgun Gothic",sans-serif`;x.fillStyle='#111';x.textAlign='left';x.textBaseline='top';let line='',y=top;for(const ch of String(text??'')){const t=line+ch;if(x.measureText(t).width>maxWidth&&line){x.fillText(line,left,y);line=ch;y+=lineHeight}else line=t}if(line)x.fillText(line,left,y);return y+lineHeight}
function header(x,title){x.textAlign='center';x.font='700 44px "Malgun Gothic",sans-serif';x.fillStyle='#111';x.fillText(title,620,80);x.textAlign='left';x.font='24px "Malgun Gothic",sans-serif';x.fillStyle='#555';x.fillText(ORG,80,145);x.strokeStyle='#222';x.lineWidth=2;x.beginPath();x.moveTo(80,185);x.lineTo(1160,185);x.stroke()}
function line(x,label,value,y,{h=58}={}){x.font='700 24px "Malgun Gothic",sans-serif';x.fillStyle='#222';x.fillText(label,90,y+14);x.font='24px "Malgun Gothic",sans-serif';x.fillText(String(value||''),360,y+14);x.strokeStyle='#bbb';x.lineWidth=1;x.beginPath();x.moveTo(80,y+h);x.lineTo(1160,y+h);x.stroke();return y+h}
function drawSignature(x,data,y){x.font='700 24px "Malgun Gothic",sans-serif';x.fillText('기부자 서명',90,y);const img=new Image();return new Promise(resolve=>{img.onload=()=>{x.drawImage(img,360,y-20,520,150);x.strokeStyle='#aaa';x.strokeRect(350,y-30,540,170);resolve(y+190)};img.src=data.signature})}
function drawConsentPage(data,title){const {c,x}=canvasPage();header(x,title+' - 개인정보 동의');let y=230;x.font='700 28px "Malgun Gothic",sans-serif';x.fillText('개인정보 수집·활용 및 제3자 제공 동의',90,y);y+=60;y=wrap(x,'남양주시장애인복지관은 기부신청, 기부내역 확인, 확인서 발급, 기부자서비스 등 기부관련 업무를 위해 필요한 개인정보를 처리합니다. 기존 기탁서의 동의내용을 확인하고 아래와 같이 의사를 표시합니다.',90,y,1060,40,24);y+=20;const rows=[['개인정보 수집·이용',data.consentPrivacy],['개인정보 제3자 제공·이용',data.consentThird],['고유식별번호 수집·이용',data.consentId],['고유식별번호 제3자 제공·이용',data.consentIdThird]];for(const [label,v] of rows){x.font='26px "Malgun Gothic",sans-serif';x.fillText(`${v?'☑':'☐'} ${label} : ${v?'동의함':'해당없음/미동의'}`,100,y);y+=55}y+=25;y=wrap(x,'※ 주민등록번호는 기부금영수증 발급 등 해당 업무에 필요한 경우에 한하여 처리합니다. 보유기간과 제공기관 등 상세사항은 복지관의 기탁서 개인정보 동의 문구에 따릅니다.',90,y,1060,40,23);x.font='22px "Malgun Gothic",sans-serif';x.fillStyle='#555';x.fillText(`작성일시: ${new Date(data.createdAt).toLocaleString('ko-KR')}`,90,1540);return c}

async function renderGeneralPages(data,title='비지정후원금 기탁서'){
  const pages=[];const {c,x}=canvasPage();header(x,title);let y=220;y=line(x,'기부자(명칭/성명)',data.donorName,y);y=line(x,'사업자등록번호/주민등록번호',data.bizNo,y);y=line(x,'주소',data.address,y);y=line(x,'대표자',data.representative,y);y=line(x,'담당자/연락처',data.contact,y);y=line(x,'이메일',data.email,y);if(data.useMethod)y=line(x,'후원금 사용 방법',data.useMethod,y,{h:105});y=line(x,'기탁구분',data.donationPeriod,y);y=line(x,'기부금액',data.amount?`${Number(data.amount).toLocaleString()}원`:'',y);y=line(x,'입금(예정)일',data.depositDate,y);y=line(x,'입금자명',data.depositor,y);x.font='22px "Malgun Gothic",sans-serif';x.fillText('본인은 위와 같이 남양주시장애인복지관에 기탁하고자 신청합니다.',90,y+45);await drawSignature(x,data,y+120);x.font='22px "Malgun Gothic",sans-serif';x.fillText(`작성일: ${new Date(data.createdAt).toLocaleDateString('ko-KR')}`,90,1570);x.textAlign='center';x.font='700 24px "Malgun Gothic",sans-serif';x.fillText('남양주시장애인복지관 귀하',620,1640);pages.push(c,drawConsentPage(data,title));return pages
}

async function renderGoodsPages(data){const pages=[];const {c,x}=canvasPage();header(x,'현물 기탁신청서');let y=220;y=line(x,'기부자(명칭/성명)',data.donorName,y);y=line(x,'사업자등록번호/주민등록번호',data.bizNo,y);y=line(x,'주소',data.address,y);y=line(x,'대표자',data.representative,y);y=line(x,'담당자/연락처',data.contact,y);y=line(x,'이메일',data.email,y);y=line(x,'지정내용',data.goodsDesignation,y,{h:90});y=line(x,'기부가액',data.goodsValue?`${Number(data.goodsValue).toLocaleString()}원`:'',y);y=line(x,'환가증빙유무',data.evidence,y);x.font='700 24px "Malgun Gothic",sans-serif';x.fillText('품목 / 규격 / 수량 / 단가',90,y+30);y+=75;x.font='22px "Malgun Gothic",sans-serif';for(const item of (data.items||[]).slice(0,8)){const total=(Number(item.qty)||0)*(Number(item.price)||0);x.fillText(`${item.name||'-'} / ${item.spec||'-'} / ${item.qty||'-'} / ${item.price?Number(item.price).toLocaleString():'-'}원 / ${total.toLocaleString()}원`,100,y);y+=48}await drawSignature(x,data,1390);pages.push(c,drawConsentPage(data,'현물 기탁신청서'));return pages}

async function renderCmsPages(data){const pages=await renderGeneralPages(data,'비지정후원금 기탁서 (CMS 후원)');const {c,x}=canvasPage();header(x,'CMS 이용 신규신청서');let y=215;const cmsLines=[['신청기관 구분',data.cmsBusinessType],['상호',data.cmsTradeName],['대표자',data.cmsRep],['사업자(고유)등록번호',data.cmsRegNo],['사업장주소',data.cmsAddress],['신청정보',data.cmsTransferType],['출금방식',data.cmsTiming],['수납모계좌 금융기관명',data.cmsBank],['수납모계좌 계좌번호',data.cmsAccount],['통장 기재내용',data.cmsMemo],['자금종류',data.cmsFundType],['월간출금한도',data.cmsMonthlyLimit?Number(data.cmsMonthlyLimit).toLocaleString()+'원':''],['건당출금한도',data.cmsPerLimit?Number(data.cmsPerLimit).toLocaleString()+'원':''],['보증수단',data.cmsGuarantee],['중계수수료 납부 금융기관',data.cmsFeeBank],['중계수수료 납부 계좌번호',data.cmsFeeAccount],['예금주',data.cmsFeeOwner],['생년월일/사업자등록번호',data.cmsFeeBirth],['담당자',data.cmsManager],['담당자 전화번호',data.cmsManagerTel],['담당자 휴대전화번호',data.cmsManagerMobile],['담당자 이메일',data.cmsManagerEmail]];for(const [a,b] of cmsLines){if(y>1480){break}y=line(x,a,b,y,{h:55})}pages.push(c);const {c:c2,x:x2}=canvasPage();header(x2,'CMS 이용 신규신청서 - 동의');let yy=235;const crows=[['CMS 개인(신용)정보 수집·이용 동의',data.cmsCreditConsent],['CMS 개인(신용)정보 제3자 제공 동의',data.cmsThirdConsent],['CMS 이용약관 및 제한 용도 동의',data.cmsTermsConsent]];for(const [a,b] of crows){x2.font='26px "Malgun Gothic",sans-serif';x2.fillText(`${b?'☑':'☐'} ${a}`,100,yy);yy+=70}yy=wrap(x2,'CMS 이용 신규신청서의 신청정보, 전산처리정보, 중계수수료 납부계좌, 담당자 정보 및 이용약관 관련 내용을 확인하였으며 입력 내용이 일치함을 확인합니다.',90,yy+20,1060,42,24);await drawSignature(x2,data,yy+90);x2.textAlign='center';x2.font='700 24px "Malgun Gothic",sans-serif';x2.fillText('금융결제원 귀중',620,1610);pages.push(c2);return pages}

function jpgBytes(canvas){const b64=canvas.toDataURL('image/jpeg',0.92).split(',')[1];const bin=atob(b64);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function enc(s){return new TextEncoder().encode(s)}
function concat(arrs){let n=0;for(const a of arrs)n+=a.length;const out=new Uint8Array(n);let o=0;for(const a of arrs){out.set(a,o);o+=a.length}return out}
function makePdf(canvases){
  const objs=[];const add=(chunks)=>{objs.push(chunks);return objs.length};
  const catalog=add([]), pagesObj=add([]);const kids=[];
  canvases.forEach((canvas,idx)=>{const jpg=jpgBytes(canvas);const img=add([enc(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,enc('\nendstream')]);const contentStr='q 595 0 0 842 0 0 cm /Im0 Do Q';const content=add([enc(`<< /Length ${contentStr.length} >>\nstream\n${contentStr}\nendstream`)]);const page=add([enc(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${content} 0 R >>`)]);kids.push(page)});
  objs[catalog-1]=[enc(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`)];objs[pagesObj-1]=[enc(`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`)];
  const parts=[enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')], offsets=[0];let offset=parts[0].length;
  objs.forEach((chunks,i)=>{offsets[i+1]=offset;const head=enc(`${i+1} 0 obj\n`),tail=enc('\nendobj\n');parts.push(head,...chunks,tail);offset+=head.length+chunks.reduce((s,a)=>s+a.length,0)+tail.length});
  const xrefStart=offset;let xref=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objs.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';xref+=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  parts.push(enc(xref));return new Blob(parts,{type:'application/pdf'});
}

async function generatePdf(data){let pages;if(data.type==='general')pages=await renderGeneralPages(data);if(data.type==='designated')pages=await renderGeneralPages(data,'지정후원금 기탁서');if(data.type==='goods')pages=await renderGoodsPages(data);if(data.type==='cms')pages=await renderCmsPages(data);return makePdf(pages)}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}

const DB_NAME='nyjwelDonationDB', STORE='records';
function dbOpen(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbPut(rec){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(rec);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function dbAll(){const db=await dbOpen();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));r.onerror=()=>rej(r.error)})}
async function dbDelete(id){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}

async function loadSaved(){const box=$('#savedList');try{const rows=await dbAll();if(!rows.length){box.innerHTML='<div class="empty">이 기기에 저장된 신청서가 없습니다.</div>';return}box.innerHTML='';for(const r of rows){const div=document.createElement('div');div.className='saved-item';div.innerHTML=`<div><strong>${escapeHtml(r.donorName||'기부자')} · ${escapeHtml(formMeta[r.type]?.title||r.type)}</strong><small>${new Date(r.createdAt).toLocaleString('ko-KR')} · ${escapeHtml(r.filename)}</small></div><div class="saved-actions"><button class="ghost re-download">PDF 다시 저장</button><button class="danger-btn delete-record">삭제</button></div>`;div.querySelector('.re-download').onclick=()=>downloadBlob(r.pdf,r.filename);div.querySelector('.delete-record').onclick=async()=>{if(confirm('이 기기에서 해당 신청서를 삭제할까요?')){await dbDelete(r.id);loadSaved()}};box.appendChild(div)}}catch(e){box.innerHTML='<div class="empty">저장 목록을 불러오지 못했습니다.</div>'}}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
$('#refreshSavedBtn').onclick=loadSaved;

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}

donationForm.addEventListener('submit',async e=>{e.preventDefault();if(!hasSignature){$('#signError').hidden=false;signatureCanvas.scrollIntoView({behavior:'smooth',block:'center'});return}$('#signError').hidden=true;const btn=$('#completeBtn');btn.disabled=true;btn.textContent='PDF 생성 중…';try{const data=serialize();const pdf=await generatePdf(data);const typeName=currentType==='cms'?'CMS후원_비지정기탁서포함':formMeta[currentType].title.replace(/\s+/g,'_');const filename=`${ymd()}_${safeName(data.donorName)}_${typeName}.pdf`;const id=crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();await dbPut({id,createdAt:data.createdAt,donorName:data.donorName,type:currentType,filename,pdf});downloadBlob(pdf,filename);toast('신청서가 저장되었습니다. PDF 다운로드를 확인해 주세요.');donationForm.reset();ctx.clearRect(0,0,signatureCanvas.width,signatureCanvas.height);hasSignature=false;formView.classList.remove('active');homeView.classList.add('active');loadSaved()}catch(err){console.error(err);alert('저장 중 오류가 발생했습니다. 브라우저 저장공간과 다운로드 권한을 확인해 주세요.')}finally{btn.disabled=false;btn.textContent='작성 완료 · PDF 저장'}});

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true});
window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true;toast('앱 설치가 완료되었습니다.')});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
loadSaved();
