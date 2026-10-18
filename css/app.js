const GAS_URL = 'https://script.google.com/macros/s/AKfycbyJcDTRpzpKZDEOcIye9PqfcxXj9i88WTxZDKSxxKEGG11CAuDmrBUVFen6lIK-TApR/exec';
let RECORDS = [], CURRENT = null, FILE_URL = '', REP = null;
const $ = id => document.getElementById(id);
const NUM = ['nListas','mPadron','hPadron','mVotaron','hVotaron','mCandidatas','hCandidatos','mElegidas','hElegidos','blancos','nulos'];
const TXT = ['institucion','eleccion','fecha','horaInicio','horaFin'];
const n = v => Number(v) || 0;

function showSection(s){document.querySelectorAll('.sec').forEach(x=>x.classList.toggle('show',x.id===s));updateActiveNav(s);$('side').classList.remove('open');}
function updateActiveNav(s){document.querySelectorAll('#side a').forEach(a=>a.classList.toggle('active',a.dataset.s===s));}
function formatDate(d){if(!d)return '';const p=String(d).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d;}
function formatTime(t){return t?String(t).slice(0,5):'';}
function showToast(m,t){const d=document.createElement('div');d.className='toast '+(t||'info');d.textContent=m;$('toast').appendChild(d);setTimeout(()=>d.remove(),3500);}
function showLoading(){$('spin').classList.remove('hidden');}
function hideLoading(){$('spin').classList.add('hidden');}
function debounce(f,d){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),d);};}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

async function gasGet(params){
  const r=await fetch(GAS_URL+'?'+new URLSearchParams(params),{redirect:'follow',method:'GET'});
  const j=await r.json(); if(!j.success)throw new Error(j.message); return j.data;
}
async function gasPost(payload){
  const r=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)});
  const j=await r.json(); if(!j.success)throw new Error(j.message); return j;
}
async function run(fn){showLoading();try{return await fn();}catch(e){showToast(e.message,'error');}finally{hideLoading();}}
const fetchAllRecords=()=>gasGet({action:'getAll'});
const fetchRecordById=id=>gasGet({action:'getById',id});
const fetchByDateRange=(from,to)=>gasGet({action:'getByDateRange',from,to});
const fetchByMonth=(month,year)=>gasGet({action:'getByMonth',month,year});
const createRecord=data=>gasPost({action:'create',data});
const updateRecord=data=>gasPost({action:'update',data});
const deleteRecord=id=>gasPost({action:'delete',id});
function uploadFile(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=async()=>{try{const j=await gasPost({action:'upload',fileName:file.name,mimeType:file.type,base64:fr.result.split(',')[1]});res(j.data.url);}catch(e){rej(e);}};fr.onerror=()=>rej(new Error('No se pudo leer el archivo'));fr.readAsDataURL(file);});}

function totals(r){return{padron:n(r.mPadron)+n(r.hPadron),votaron:n(r.mVotaron)+n(r.hVotaron),cand:n(r.mCandidatas)+n(r.hCandidatos),eleg:n(r.mElegidas)+n(r.hElegidos)};}
function votesSum(r){let s=n(r.blancos)+n(r.nulos);for(let i=1;i<=8;i++)s+=n(r['l'+i]);return s;}
function pct(r){const t=totals(r);return t.padron?(t.votaron/t.padron*100).toFixed(1)+'% de participación':'—';}
function renderBadge(s){return '<span class="badge b-'+esc(s).replace(' ','-')+'">'+esc(s)+'</span>';}
function renderAlertBadge(){return ' <span title="La suma de votos no coincide con los electores que votaron" style="cursor:help">⚠️</span>';}

function renderDashboard(rs){
  $('cT').textContent=rs.length;
  ['Finalizado','Pendiente','En curso'].forEach((s,i)=>$(['cF','cP','cE'][i]).textContent=rs.filter(r=>r.estado===s).length);
  renderTable(rs);
}
function renderTable(rs){
  $('tbody').innerHTML=rs.length?rs.map(r=>'<tr><td>'+esc(r.id)+(r.inconsistencia?renderAlertBadge():'')+'</td><td>'+esc(r.institucion)+'</td><td>'+esc(String(r.eleccion).slice(0,50))+'</td><td>'+formatDate(r.fecha)+'</td><td>'+renderBadge(r.estado)+'</td><td>'+pct(r)+'</td><td><button class="btn" data-a="ver" data-id="'+esc(r.id)+'">Ver</button> <button class="btn ok" data-a="edit" data-id="'+esc(r.id)+'">Editar</button> <button class="btn pri" data-a="del" data-id="'+esc(r.id)+'">Eliminar</button></td></tr>').join(''):'<tr><td colspan="7">No hay registros.</td></tr>';
}
async function loadAll(){const d=await run(fetchAllRecords);if(d){RECORDS=d;renderDashboard(d);fillReportSelect();}}
function fillReportSelect(){$('repSel').innerHTML=RECORDS.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.id)+' - '+esc(r.institucion)+'</option>').join('');}

function onListCountChange(v){
  const c=Math.min(8,Math.max(1,n(v)||1));
  for(let i=1;i<=8;i++){const w=$('wl'+i);if(w)w.classList.toggle('hidden',i>c);}
  calculateTotals();
}
function buildListFields(){$('listas').innerHTML=[1,2,3,4,5,6,7,8].map(i=>'<div id="wl'+i+'"><label>Lista '+i+'</label><input type="number" min="0" id="l'+i+'" class="calc"></div>').join('');}
function calculateTotals(){
  const g=id=>n($(id).value);
  $('tPadron').value=g('mPadron')+g('hPadron');$('tVotaron').value=g('mVotaron')+g('hVotaron');
  $('tCandidatos').value=g('mCandidatas')+g('hCandidatos');$('tElegidos').value=g('mElegidas')+g('hElegidos');
  const c=Math.min(8,Math.max(1,g('nListas')||1));let s=g('blancos')+g('nulos');for(let i=1;i<=c;i++)s+=g('l'+i);
  $('tVotos').value=s;validateConsistency();
}
function validateConsistency(){
  const a=n($('tVotos').value),b=n($('tVotaron').value),w=$('warn');
  const bad=a!==b&&(a>0||b>0);w.classList.toggle('hidden',!bad);
  if(bad)w.textContent='⚠️ La suma de votos ('+a+') no coincide con el total de electores que votaron ('+b+')';
  return !bad;
}
function handleFileSelect(e){
  const f=e.target.files[0];if(!f)return;$('fileInfo').textContent='Archivo seleccionado: '+f.name;
  if(f.type.indexOf('image/')===0){$('prev').src=URL.createObjectURL(f);$('prev').classList.remove('hidden');}else $('prev').classList.add('hidden');
}
async function renderForm(rec){
  CURRENT=rec||null;FILE_URL=rec?rec.archivoUrl||'':'';
  $('archivo').value='';$('prev').classList.add('hidden');$('fileInfo').textContent=FILE_URL?'Archivo ya subido: '+FILE_URL:'';
  TXT.concat(NUM).forEach(k=>$(k).value=rec?rec[k]:'');
  for(let i=1;i<=8;i++)$('l'+i).value=rec?rec['l'+i]:'';
  if(!rec)$('nListas').value=1;
  if(rec)$('id').value=rec.id;else{const d=await run(()=>gasGet({action:'getNextId'}));$('id').value=d?d.id:'';}
  $('formTitle').textContent=rec?'Editar Registro #'+rec.id:'Nuevo Registro';
  onListCountChange($('nListas').value);showSection('form');
}
async function saveRecord(){
  for(const k of TXT.concat(NUM.filter(x=>x!=='nListas'))){if($(k).value===''){showToast('Complete todos los campos obligatorios','error');$(k).focus();return;}}
  const c=n($('nListas').value);if(c<1||c>8){showToast('El N° de listas debe estar entre 1 y 8','error');return;}
  const data={};TXT.concat(NUM).forEach(k=>data[k]=$(k).value);
  for(let i=1;i<=8;i++)data['l'+i]=i<=c&&$('l'+i).value!==''?n($('l'+i).value):'';
  data.archivoUrl=FILE_URL;
  if(!validateConsistency()&&!confirm('La suma de votos no coincide con los electores que votaron. ¿Guardar de todas formas?'))return;
  await run(async()=>{
    const f=$('archivo').files[0];if(f)data.archivoUrl=await uploadFile(f);
    if(CURRENT){data.id=CURRENT.id;await updateRecord(data);}else await createRecord(data);
    showToast('Registro guardado','success');await loadAll();showSection('dash');
  });
}

function showConfirmModal(msg,onConfirm,expectedId){
  const h=$('modalHost');
  h.innerHTML='<div class="modal"><div><p>'+msg+'</p>'+(expectedId?'<input id="mIn" placeholder="Escriba el ID" style="margin-top:10px">':'')+'<div class="row"><button class="btn sec2" id="mNo">Cancelar</button><button class="btn pri" id="mYes"'+(expectedId?' disabled':'')+'>'+(expectedId?'Confirmar eliminación':'Sí, eliminar')+'</button></div></div></div>';
  $('mNo').onclick=()=>h.innerHTML='';
  if(expectedId)$('mIn').oninput=e=>$('mYes').disabled=e.target.value.trim()!==expectedId;
  $('mYes').onclick=()=>{h.innerHTML='';onConfirm();};
}
function askDelete(r){
  showConfirmModal('¿Está seguro de eliminar el registro '+esc(r.id)+' - '+esc(r.institucion)+'?',()=>{
    showConfirmModal('Esta acción es IRREVERSIBLE. Escriba el ID <b>'+esc(r.id)+'</b> para confirmar:',async()=>{
      await run(async()=>{await deleteRecord(r.id);showToast('Registro eliminado','success');await loadAll();});
    },r.id);
  });
}

function renderReport(r){
  REP=r;const t=totals(r),cnt=Math.min(8,n(r.nListas)||8);
  let rows='';for(let i=1;i<=cnt;i++)if(n(r['l'+i])>0)rows+='<tr><td>Lista '+i+'</td><td>'+n(r['l'+i])+'</td></tr>';
  const sum=votesSum(r),bad=sum!==t.votaron;
  $('repOut').innerHTML='<div class="rep"><h2>SIGEL</h2><h3>Sistema de Gestión Electoral</h3><p><b>Institución:</b> '+esc(r.institucion)+'</p><p><b>Elección:</b> '+esc(r.eleccion)+'</p><p><b>Fecha:</b> '+formatDate(r.fecha)+'</p><p><b>Horario:</b> '+formatTime(r.horaInicio)+' a '+formatTime(r.horaFin)+'</p><p><b>Estado:</b> '+renderBadge(r.estado)+'</p><p><b>Participación:</b> '+pct(r)+'</p><br><h3>INDICADORES ELECTORALES</h3><div class="tw"><table><thead><tr><th>INDICADOR</th><th>MUJERES</th><th>HOMBRES</th><th>TOTAL</th></tr></thead><tbody><tr><td>Electores en padrón</td><td>'+n(r.mPadron)+'</td><td>'+n(r.hPadron)+'</td><td>'+t.padron+'</td></tr><tr><td>Electores que votaron</td><td>'+n(r.mVotaron)+'</td><td>'+n(r.hVotaron)+'</td><td>'+t.votaron+'</td></tr><tr><td>Candidatos</td><td>'+n(r.mCandidatas)+'</td><td>'+n(r.hCandidatos)+'</td><td>'+t.cand+'</td></tr><tr><td>Elegidos</td><td>'+n(r.mElegidas)+'</td><td>'+n(r.hElegidos)+'</td><td>'+t.eleg+'</td></tr></tbody></table></div><br><h3>RESULTADOS GENERALES: '+esc(r.eleccion)+'</h3><div class="tw"><table><thead><tr><th>LISTAS</th><th>TOTAL</th></tr></thead><tbody>'+rows+'<tr><td>Votos en blanco</td><td>'+n(r.blancos)+'</td></tr><tr><td>Votos nulos</td><td>'+n(r.nulos)+'</td></tr><tr><td><b>TOTAL</b></td><td><b>'+sum+'</b></td></tr></tbody></table></div>'+(bad?'<div class="alert">⚠️ ALERTA: La suma de votos no coincide con los electores que votaron</div>':'')+'</div>';
  $('bXls').classList.remove('hidden');
}
function exportToExcel(r){
  const t=totals(r),cnt=Math.min(8,n(r.nListas)||8);
  const aoa=[['SIGEL - Sistema de Gestión Electoral'],['Institución: '+r.institucion],['Elección: '+r.eleccion+' | Fecha: '+formatDate(r.fecha)+' | Horario: '+formatTime(r.horaInicio)+' a '+formatTime(r.horaFin)],[],['INDICADOR','MUJERES','HOMBRES','TOTAL'],['Electores en padrón',n(r.mPadron),n(r.hPadron),t.padron],['Electores que votaron',n(r.mVotaron),n(r.hVotaron),t.votaron],['Candidatos',n(r.mCandidatas),n(r.hCandidatos),t.cand],['Elegidos',n(r.mElegidas),n(r.hElegidos),t.eleg],[],['RESULTADOS GENERALES: '+r.eleccion],['LISTAS','TOTAL']];
  for(let i=1;i<=cnt;i++)if(n(r['l'+i])>0)aoa.push(['Lista '+i,n(r['l'+i])]);
  aoa.push(['Votos en blanco',n(r.blancos)],['Votos nulos',n(r.nulos)],['TOTAL',votesSum(r)]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:30},{wch:12},{wch:12},{wch:12}];
  const thin={style:'thin',color:{rgb:'000000'}},bd={top:thin,bottom:thin,left:thin,right:thin};
  const head={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1B3A5C'}},alignment:{horizontal:'center'},border:bd};
  const set=(a,s)=>{if(ws[a])ws[a].s=s;};
  ['A5','B5','C5','D5','A12','B12'].forEach(a=>set(a,head));set('A1',{font:{bold:true,sz:16}});
  for(let R=6;R<=9;R++)['A','B','C','D'].forEach(c=>set(c+R,{border:bd,alignment:{horizontal:c==='A'?'left':'center'}}));
  for(let R=13;R<=aoa.length;R++){const bold=R===aoa.length;['A','B'].forEach(c=>set(c+R,{border:bd,font:{bold:bold},alignment:{horizontal:c==='A'?'left':'center'}}));}
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Reporte');
  XLSX.writeFile(wb,'SIGEL_Reporte_'+r.id+'_'+String(r.institucion).replace(/[^\w\-]+/g,'_')+'.xlsx');
}

function init(){
  buildListFields();
  $('fMes').innerHTML=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i)=>'<option value="'+(i+1)+'">'+m+'</option>').join('');
  $('fAnio').value=new Date().getFullYear();$('fMes').value=new Date().getMonth()+1;
  $('burger').onclick=()=>$('side').classList.toggle('open');
  document.querySelectorAll('#side a').forEach(a=>a.onclick=()=>{if(a.dataset.s==='form')renderForm();else showSection(a.dataset.s);});
  $('btnNew').onclick=()=>renderForm();
  $('bCancel').onclick=()=>showSection('dash');$('bSave').onclick=saveRecord;
  $('nListas').addEventListener('input',e=>onListCountChange(e.target.value));
  document.addEventListener('input',e=>{if(e.target.classList.contains('calc'))calculateTotals();});
  $('archivo').onchange=handleFileSelect;
  const byId=debounce(()=>{},300);void byId;
  $('bId').onclick=async()=>{const id=$('fId').value.trim();if(!id)return;const d=await run(()=>fetchRecordById(('000'+id).slice(-3)));if(d)renderDashboard([d]);};
  $('bRange').onclick=async()=>{if(!$('fFrom').value||!$('fTo').value){showToast('Indique las fechas','error');return;}const d=await run(()=>fetchByDateRange($('fFrom').value,$('fTo').value));if(d)renderDashboard(d);};
  $('bMes').onclick=async()=>{const d=await run(()=>fetchByMonth($('fMes').value,$('fAnio').value));if(d)renderDashboard(d);};
  $('bClear').onclick=()=>{$('fId').value='';$('fFrom').value='';$('fTo').value='';loadAll();};
  $('tbody').onclick=e=>{const b=e.target.closest('button');if(!b)return;const r=RECORDS.find(x=>x.id===b.dataset.id);if(!r)return;
    if(b.dataset.a==='edit')renderForm(r);else if(b.dataset.a==='del')askDelete(r);else{$('repSel').value=r.id;renderReport(r);showSection('rep');}};
  $('bRep').onclick=()=>{const r=RECORDS.find(x=>x.id===$('repSel').value);if(r)renderReport(r);else showToast('Seleccione un registro','error');};
  $('bXls').onclick=()=>REP&&exportToExcel(REP);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  loadAll();
}
document.addEventListener('DOMContentLoaded',init);
