
const $=id=>document.getElementById(id);
let apiKeys=[], records=[], isRunning=false;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function renderKeys(){
  $("apiBadge").textContent=`(${apiKeys.length})`;
}

$("add").onclick=()=>{const key=$("apiKey").value.trim();if(!key)return alert("Isi API Key dulu.");if(apiKeys.length>=50)return alert("Maksimal 50 API key.");apiKeys.push({name:$("apiName").value.trim()||`Akun API ${apiKeys.length+1}`,key,selected:true});$("apiName").value="";$("apiKey").value="";renderKeys();};
$("clear").onclick=()=>{if(isRunning)return alert("Tunggu task selesai dulu.");apiKeys=[];renderKeys();};
$("file").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const lines=(await f.text()).split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith("#"));for(const key of lines){if(apiKeys.length>=50)break;apiKeys.push({name:`Imported ${apiKeys.length+1}`,key,selected:true});}renderKeys();e.target.value="";};
$("agent").onchange=()=>{const isCua=$("agent").value==="cua";$("reason").disabled=!isCua;if(isCua){$("model").value="gpt-6-astra";}else if($("agent").value==="browserUse"){$("model").value="gemini-2.0-flash";}else{$("model").value="custom";$("customModel").classList.remove("hide");}};
$("model").onchange=()=>{$("customModel").classList.toggle("hide",$("model").value!=="custom");};
function getModel(){return $("model").value==="custom"?$("customModel").value.trim():$("model").value;}
function statusClass(s){return ["success","failed","running","queued"].includes(s)?s:"queued";}
function cleanText(value){return String(value??"").replace(/\bHyperbrowser\b[:：]?\s*/gi,"").replace(/\n{3,}/g,"\n\n").trim();}
function render(){
  const finished=records.filter(r=>["success","failed"].includes(r.status)).length;
  const ok=records.filter(r=>r.status==="success").length, bad=records.filter(r=>r.status==="failed").length;
  $("summary").textContent=`${ok} sukses · ${bad} gagal · ${records.length-finished} proses`;
  $("bar").style.width=(records.length?finished/records.length*100:0)+"%";
  $("results").innerHTML=records.map(r=>`<div class="card"><div class="between"><strong>${esc(r.name)}</strong><span class="pill status ${statusClass(r.status)}">${esc(r.status.toUpperCase())}</span></div><div class="hint">${esc(r.finishedAt||r.startedAt||"")}</div><pre>${esc(cleanText(r.output||r.error||"Tidak ada detail hasil dari server."))}</pre><div class="row"><button class="alt" data-copy="${r.id}">Salin hasil</button>${r.liveUrl?`<a target="_blank" rel="noopener" href="${esc(r.liveUrl)}" class="hint">Live View</a>`:""}</div></div>`).join("")||`<div class="hint">Belum ada hasil.</div>`;
}
$("results").onclick=e=>{const b=e.target.closest("[data-copy]");if(!b)return;const r=records.find(x=>x.id===b.dataset.copy);if(r)navigator.clipboard.writeText(`${r.name} — ${r.status.toUpperCase()}\n${cleanText(r.output||r.error||"")}`);};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function post(path,data){const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});let body={};try{body=await response.json();}catch{}if(!response.ok)throw new Error(body.error||`HTTP ${response.status}`);return body;}
async function runOne(rec,task,agent,llm,reasoningEffort,maxSteps){
  try{
    const started=await post("/api/start",{apiKey:rec.key,task,agent,llm,reasoningEffort,maxSteps});
    rec.jobId=started.jobId;rec.liveUrl=started.liveUrl;rec.startedAt=new Date().toLocaleTimeString();rec.status="running";
    let tries=0;
    while(tries++<180){
      await sleep(3500);
      try{
        const check=await post("/api/status",{apiKey:rec.key,agent,jobId:rec.jobId});
        if(check.terminal){rec.status=check.status;rec.output=check.output||"";rec.error=check.error||"";rec.steps=check.steps;rec.finishedAt=check.finishedAt;return;}
        rec.status="running";rec.progress=check.status||"running";
      }catch(err){rec.pollError=err.message;await sleep(2500);}
    }
    rec.status="failed";rec.error="Polling berhenti setelah 10 menit. Periksa status job pada dashboard penyedia.";
  }catch(err){rec.status="failed";rec.error=err.message;}
}
$("run").onclick=async()=>{
  if(isRunning)return;
  const task=$("prompt").value.trim();if(!task)return alert("Tulis prompt dulu.");
  const selected=apiKeys;const count=selected.length;
  if(!count)return alert("Tambahkan API key dulu.");
  const agent=$("agent").value,llm=getModel(),maxSteps=Number($("steps").value);
  if(!llm)return alert("Pilih/isi model ID.");if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>100)return alert("Max steps harus 1–100.");
  const chosen=selected.slice();
  records=chosen.map((k,i)=>({id:`${Date.now()}-${i}`,name:k.name,key:k.key,status:"queued",output:"Menunggu giliran...",startedAt:""}));
  isRunning=true;$("run").disabled=true;$("info").textContent=`Memproses ${count} API…`;$("summary").textContent="Sedang berjalan";$("bar").style.width="0%";$("results").innerHTML=`<div class="loader"><span class="spinner"></span><div><strong>Memproses permintaan…</strong><div class="hint">Hasil seluruh API akan muncul setelah semua proses selesai.</div></div></div>`;
  // Keep a small concurrency window so a large key list does not immediately overwhelm the account.
  let cursor=0;const workers=Array.from({length:Math.min(4,records.length)},async()=>{while(cursor<records.length){const i=cursor++;await runOne(records[i],task,agent,llm,$("reason").value,maxSteps);}});
  await Promise.all(workers);isRunning=false;$("run").disabled=false;$("info").textContent="Semua proses selesai.";render();
};
$("reset").onclick=()=>{if(isRunning)return alert("Task masih berjalan. Tunggu sampai selesai.");records=[];$("summary").textContent="Belum berjalan";$("bar").style.width="0";$("info").textContent="Monitor dibersihkan.";render();};
function allText(){return records.map(r=>`${r.name} | ${r.status.toUpperCase()}${r.jobId?" | Job: "+r.jobId:""}\n${cleanText(r.output||r.error||"")}`).join("\n\n==============================\n\n");}
$("copyAll").onclick=()=>{if(!records.length)return alert("Belum ada hasil.");navigator.clipboard.writeText(allText());};
$("download").onclick=()=>{if(!records.length)return alert("Belum ada hasil.");const blob=new Blob([allText()],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="dhenlee-ai-results.txt";a.click();URL.revokeObjectURL(url);};
renderKeys();render();
