const $=id=>document.getElementById(id);
let sky=null;
async function loadData(){
  try{const res=await fetch(`data/sky.json?ts=${Date.now()}`); sky=await res.json(); render();}
  catch(e){console.error(e);}
}
function list(items){return (items||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')||'<li>未取得</li>'}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function render(){
  $('updated').textContent=`更新：${sky.updatedAtJst||'未取得'} / 状態：${sky.status||'unknown'}`;
  $('dailyMeta').innerHTML=`<span class="badge">${escapeHtml(sky.daily?.area||'未取得')}</span><div class="meta">${escapeHtml(sky.daily?.start||'')} ${escapeHtml(sky.daily?.end?`〜 ${sky.daily.end}`:'')}</div>`;
  $('dailyList').innerHTML=list(sky.daily?.quests);
  $('candlesMeta').innerHTML=`<span class="badge">${escapeHtml(sky.bigCandles?.area||'未取得')}</span><div class="meta">${escapeHtml(sky.bigCandles?.period||'')} ${escapeHtml(sky.bigCandles?.count||'')}</div>`;
  $('candlesList').innerHTML=list(sky.bigCandles?.locations);
  $('shardsMeta').innerHTML=`<span class="badge">${escapeHtml(sky.shards?.location||'未取得')}</span><div class="meta">${escapeHtml(sky.shards?.period||'')} / ${escapeHtml(sky.shards?.type||'')} / ${escapeHtml(sky.shards?.reward||'')}</div>`;
  $('shardsList').innerHTML=list(sky.shards?.times);
  tick();
}
function nextFrom(times){
  const now=new Date();
  const cand=[];
  for(const t of times||[]){const [h,m]=t.split(':').map(Number);const d=new Date(now);d.setHours(h,m,0,0); if(d<=now)d.setDate(d.getDate()+1); cand.push(d)}
  cand.sort((a,b)=>a-b);return cand[0];
}
function fmt(ms){if(ms<0)ms=0;const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function tick(){if(!sky)return; for(const key of ['bread','geyser','turtle']){const n=nextFrom(sky.timers?.[key]);$(key+'Next').textContent=n?n.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):'--:--';$(key+'Count').textContent=n?fmt(n-new Date()):'--:--:--';}}
setInterval(tick,1000); loadData(); setInterval(loadData,300000);
