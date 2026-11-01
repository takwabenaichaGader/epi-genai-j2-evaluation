'use strict';
(() => {
const $=id=>document.getElementById(id), config=window.EPI_CONFIG||{};
const DEMO=Boolean(config.DEMO_MODE), STORAGE_KEY='epi-j2-session-v2-30q';
let exam=null, token='', endAt=0, answers={}, current=0, student={}, timer=null, sending=false;
const show=(id)=>$(id).classList.remove('hidden'),hide=id=>$(id).classList.add('hidden');
const html=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function alertError(msg){$('alert').textContent=msg;show('alert');$('alert').scrollIntoView({behavior:'smooth',block:'start'});}
function clearAlert(){hide('alert');$('alert').textContent='';}
function setScreen(name){for(const id of ['welcome','exam-view','review-view','result-view'])hide(id);show(name);window.scrollTo({top:0,behavior:'instant'});}
function snapshot(){if(!DEMO&&exam){try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify({exam,token,endAt,answers,current,student}));}catch(_){}}}
function dropSnapshot(){try{sessionStorage.removeItem(STORAGE_KEY)}catch(_){}}
function answered(q){const a=answers[q.id];if(q.kind==='multi')return Array.isArray(a)&&a.length>0;if(q.kind==='short')return typeof a==='string'&&a.trim().length>0;return a!==undefined&&String(a).trim()!=='';}
function countAnswered(){return exam.questions.filter(answered).length;}
function updateNav(){if(!exam)return;const grid=$('question-grid');grid.innerHTML='';for(let i=0;i<exam.questions.length;i++){
 const b=document.createElement('button');b.textContent=i+1;b.type='button';b.className=(answered(exam.questions[i])?'done ':'')+(i===current?'current':'');b.setAttribute('aria-label','Question '+(i+1)+(answered(exam.questions[i])?' répondue':''));b.setAttribute('aria-current',i===current?'step':'false');b.addEventListener('click',()=>{current=i;renderQuestion()});grid.appendChild(b);}
 const done=countAnswered();$('progress-text').textContent=`${done} / ${exam.questions.length}`;$('progress-fill').style.width=(100*done/exam.questions.length)+'%';$('progressbar').setAttribute('aria-valuenow',done);$('progressbar').setAttribute('aria-valuemax',exam.questions.length);}
function saveAnswer(q,value){answers[q.id]=value;snapshot();updateNav();}
function renderQuestion(){if(!exam)return;const q=exam.questions[current],root=$('question-content');
 const type=q.kind==='single'?'UNE SEULE RÉPONSE':q.kind==='multi'?'PLUSIEURS RÉPONSES':q.kind==='number'?'CALCUL NUMÉRIQUE':'MINI-CAS ARGUMENTÉ';
 root.innerHTML=`<div class="qtop"><span class="qindex">QUESTION ${String(current+1).padStart(2,'0')} / ${exam.questions.length}</span><span class="qpoints">${q.points} POINTS · ${type}</span></div><div class="qsection">${html(q.section).toUpperCase()} · NIVEAU ${html(q.level||"APPLICATION")}</div><h3>${html(q.prompt)}</h3>`;
 if(q.kind==='single'||q.kind==='multi'){
  const container=document.createElement('div');container.className='options';let selected=q.kind==='multi'?(Array.isArray(answers[q.id])?answers[q.id]:[]):answers[q.id];
  for(const [key,label] of q.options){const line=document.createElement('label');line.className='option'+((q.kind==='multi'?selected.includes(key):selected===key)?' selected':'');line.innerHTML=`<input type="${q.kind==='multi'?'checkbox':'radio'}" name="answer-${html(q.id)}" value="${html(key)}" ${q.kind==='multi'?(selected.includes(key)?'checked':''):(selected===key?'checked':'')}><span class="option-letter">${html(key.toUpperCase())}</span><span>${html(label)}</span>`;
  line.querySelector('input').addEventListener('change',ev=>{if(q.kind==='single'){saveAnswer(q,key);}else{const prev=Array.isArray(answers[q.id])?answers[q.id]:[];saveAnswer(q,ev.target.checked?[...prev,key]:prev.filter(x=>x!==key));}renderQuestion();});container.appendChild(line);}
  root.appendChild(container);
 }else if(q.kind==='number'){
  const help=document.createElement('p');help.className='qhelp';help.textContent='Saisissez un nombre, sans unité. Vous pouvez utiliser la virgule décimale.';root.appendChild(help);
  const input=document.createElement('input');input.className='number-input';input.setAttribute('inputmode','decimal');input.setAttribute('aria-label','Réponse numérique');input.placeholder='Votre résultat';input.value=answers[q.id]??'';input.addEventListener('input',()=>saveAnswer(q,input.value));root.appendChild(input);
 }else{
  const help=document.createElement('p');help.className='qhelp';help.textContent='Justifiez votre décision en quelques phrases. Votre réponse sera relue par le formateur.';root.appendChild(help);
  const area=document.createElement('textarea');area.className='answer-textarea';area.maxLength=2500;area.placeholder='Votre raisonnement, les vérifications à réaliser et vos précautions…';area.value=answers[q.id]??'';area.addEventListener('input',()=>saveAnswer(q,area.value));root.appendChild(area);
 }
 $('prev-btn').disabled=current===0;$('next-btn').textContent=current===exam.questions.length-1?'Vérifier ma copie →':'Suivant →';updateNav();snapshot();}
function review(){if(!exam)return;const completed=countAnswered();$('review-content').innerHTML=`<div class="review-overview"><div><strong>${completed} / ${exam.questions.length}</strong><br><span>réponses renseignées</span></div><span>${exam.questions.length-completed===0?'Votre copie est complète.':'Attention : '+(exam.questions.length-completed)+' question(s) sans réponse.'}</span></div><div class="review-list">${exam.questions.map((q,i)=>`<div class="review-item"><span><strong>${String(i+1).padStart(2,'0')}</strong> · ${html(q.skill)} <small>(${q.points} pts)</small></span><button type="button" data-go="${i}">${answered(q)?'Modifier':'À répondre'}</button></div>`).join('')}</div>`;
 $('review-content').querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>{current=Number(el.dataset.go);setScreen('exam-view');renderQuestion()}));
 $('submit-exam').textContent=DEMO?'Terminer l’aperçu sans envoi':'Envoyer définitivement ma copie ↗';setScreen('review-view');}
function tick(){if(!endAt)return;const seconds=Math.max(0,Math.ceil((endAt-Date.now())/1000));$('countdown').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('countdown').classList.toggle('urgent',seconds<300);
 if(seconds===0&&!DEMO&&!sending){clearInterval(timer);submit(true)}else if(seconds===0&&DEMO){clearInterval(timer);$('countdown').textContent='00:00';}}
function startTimer(){clearInterval(timer);tick();timer=setInterval(tick,1000);}
async function api(route,data){if(!config.API_BASE)throw new Error('API non configurée. Le formateur doit renseigner Site/config.js.');let res;try{res=await fetch(config.API_BASE.replace(/\/$/,'')+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}catch(_){throw new Error('Connexion au serveur indisponible. Vérifiez votre réseau ou contactez le formateur.');}let response;try{response=await res.json()}catch(_){throw new Error('Réponse illisible du serveur.');}if(!res.ok)throw new Error(response.error||'Le serveur a refusé la requête.');return response;}
async function begin(event){event.preventDefault();clearAlert();const form=$('identity-form');if(!form.reportValidity())return;
 const fd=new FormData(form);const person={firstName:String(fd.get('firstName')||'').trim(),lastName:String(fd.get('lastName')||'').trim(),group:String(fd.get('group')||'').trim(),email:String(fd.get('email')||'').trim().toLowerCase(),consent:fd.get('consent')==='on'};
 if(!person.consent){alertError('Veuillez accepter la notice de confidentialité.');return;}
 const btn=$('start-btn');btn.disabled=true;btn.textContent='Ouverture de la session…';
 try{
  if(DEMO){exam=window.EPI_DEMO_EXAM;token='';endAt=Date.now()+exam.durationMinutes*60000;}
  else{const turnstileToken=window.turnstile?.getResponse?.()||'';const data=await api('/start',{...person,turnstileToken});exam=data.exam;token=data.session;endAt=data.expiresAt;}
  if(!exam||!Array.isArray(exam.questions)||exam.questions.length!==30)throw new Error('Banque de questions incompatible.');
  student=person;answers={};current=0;snapshot();$('student-name').textContent=`${student.firstName} ${student.lastName} · ${student.group}`;setScreen('exam-view');renderQuestion();startTimer();
 }catch(e){alertError(e.message||'Impossible de commencer.')}finally{btn.disabled=false;btn.innerHTML='Commencer l’évaluation <span>↗</span>';}
}
async function submit(auto=false){if(sending)return;clearAlert();if(!DEMO&&!auto&&!window.confirm('Confirmer l’envoi définitif de cette copie ?'))return;
 if(DEMO){clearInterval(timer);setScreen('result-view');$('result-title').textContent='Aperçu terminé — aucun envoi';$('result-description').textContent='Vous avez testé la présentation du quiz. Aucune note n’a été calculée et aucune copie n’a été transmise.';$('receipt-id').textContent='MODE APERÇU';$('receipt-time').textContent=new Date().toLocaleString('fr-FR');$('receipt-score').textContent='Non calculée';$('receipt-manual').textContent='Non applicable';return;}
 sending=true;const btn=$('submit-exam');btn.disabled=true;btn.textContent='Archivage en cours…';
 try{const r=await api('/submit',{session:token,answers});if(!r.receiptId||r.status!=='RECU')throw new Error('Accusé de réception absent.');clearInterval(timer);dropSnapshot();setScreen('result-view');$('result-title').textContent='Votre copie a été enregistrée.';$('result-description').textContent='L’archivage sur le serveur privé est confirmé. Conservez votre identifiant de reçu.';$('receipt-id').textContent=r.receiptId;$('receipt-time').textContent=new Date(r.receivedAt).toLocaleString('fr-FR');$('receipt-score').textContent=`${r.automaticScore} / ${r.automaticMaximum} (provisoire)`;$('receipt-manual').textContent=`En attente (${r.manualMaximum} pts)`;
 }catch(e){alertError((auto?'Temps écoulé. ':'')+(e.message||'Envoi impossible.'));if(auto){setScreen('review-view')} }finally{sending=false;btn.disabled=false;btn.textContent='Envoyer définitivement ma copie ↗';}
}
function restore(){if(DEMO)return false;try{const s=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null');if(!s||!s.exam||!s.token||s.exam.id!=='EPI-GENAI-J2-2026-V2-30Q'||!Array.isArray(s.exam.questions))return false;({exam,token,endAt,answers,current,student}=s);if(!Number.isFinite(endAt))return false;current=Math.min(Math.max(0,current),exam.questions.length-1);$('student-name').textContent=`${student.firstName} ${student.lastName} · ${student.group}`;setScreen('exam-view');renderQuestion();startTimer();return true;}catch(_){return false;}}
function setupTurnstile(){if(DEMO||!config.TURNSTILE_SITEKEY)return;show('turnstile-area');const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=()=>window.turnstile?.render('#turnstile-widget',{sitekey:config.TURNSTILE_SITEKEY});document.head.appendChild(script);}
function initialize(){if(DEMO){$('mode-notice').textContent='MODE APERÇU — ce site fonctionne ici sans backend pour examiner le design et les questions. Aucun score ni copie ne sont enregistrés. Pour la session officielle, configurer l’API privée.';show('mode-notice');}
 else if(!config.API_BASE){$('mode-notice').textContent='ÉPREUVE NON CONFIGURÉE — le responsable pédagogique doit renseigner l’URL du Worker dans config.js.';show('mode-notice');$('start-btn').disabled=true;}
 $('identity-form').addEventListener('submit',begin);$('prev-btn').addEventListener('click',()=>{if(current>0){current--;renderQuestion()}});$('next-btn').addEventListener('click',()=>{if(current<exam.questions.length-1){current++;renderQuestion()}else review()});$('review-btn').addEventListener('click',review);$('back-exam').addEventListener('click',()=>{setScreen('exam-view');renderQuestion()});$('submit-exam').addEventListener('click',()=>submit(false));$('print-receipt').addEventListener('click',()=>window.print());
 const dialog=$('privacy-dialog');$('privacy-open').onclick=()=>dialog.showModal();$('privacy-close').onclick=()=>dialog.close();$('privacy-ok').onclick=()=>dialog.close();setupTurnstile();restore();}
document.addEventListener('DOMContentLoaded',initialize);
})();
