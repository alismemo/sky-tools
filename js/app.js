const $ = s => document.querySelector(s);
const isOverlay = document.body.classList.contains('overlay');
const state = { data:null };

async function loadData(){
  try{
    const res = await fetch(`data/sky.json?ts=${Date.now()}`, {cache:'no-store'});
    if(!res.ok) throw new Error('data/sky.json が読めません');
    state.data = await res.json();
  }catch(e){
    state.data = JSON.parse(localStorage.getItem('sky_manual_data') || 'null') || fallback(String(e.message||e));
  }
  render();
}
function fallback(msg){return {updatedAt:'未取得',status:'error',daily:{period:'',area:'未取得',quests:[msg]},candle:{period:'',area:'未取得',count:'',locations:[]},shard:{summary:'未取得',locations:[],times:[]},notes:[msg]}}
function list(items, empty='未取得'){return (items&&items.length?items:[empty]).map(x=>`<div class="item">${escapeHtml(x)}</div>`).join('')}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function render(){
 const d=state.data;
 $('#updated').textContent = d.updatedAt || '未取得';
 $('#status').textContent = d.status || 'unknown';
 $('#dailyArea').textContent = d.daily?.area || '未取得';
 $('#dailyPeriod').textContent = d.daily?.period || '';
 $('#dailyList').innerHTML = list(d.daily?.quests);
 $('#candleArea').textContent = d.candle?.area || '未取得';
 $('#candlePeriod').textContent = d.candle?.period || '';
 $('#candleCount').textContent = d.candle?.count || '';
 $('#candleList').innerHTML = list(d.candle?.locations);
 $('#shardSummary').textContent = d.shard?.summary || '未取得';
 $('#shardTimes').innerHTML = list(d.shard?.times, '時間情報なし');
 $('#shardList').innerHTML = list(d.shard?.locations, '場所情報なし');
 const notes = (d.notes||[]).filter(Boolean);
 $('#notes').innerHTML = notes.length ? notes.map(n=>`<div class="item">${escapeHtml(n)}</div>`).join('') : '<div class="item">正常に取得しています</div>';
}
function nextEveryTwoHours(minute){
  const now=new Date();
  const n=new Date(now);
  n.setSeconds(0,0); n.setMinutes(minute);
  if(n<=now) n.setHours(n.getHours()+1);
  while(n.getHours()%2!==0) n.setHours(n.getHours()+1);
  return n;
}
function fmt(ms){
  if(ms<0) ms=0; const s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60), sec=s%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function tickTimers(){
 const now=Date.now();
 const events=[['geyser','間欠泉',5],['bread','パン焼き',35],['turtle','タートル',50]];
 for(const [id,name,min] of events){
   const n=nextEveryTwoHours(min);
   $(`#${id}Next`).textContent = n.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
   $(`#${id}Count`).textContent = fmt(n-now);
 }
}
function manualSave(){
 const data = state.data || fallback('manual');
 data.updatedAt = new Date().toLocaleString('ja-JP');
 data.status = 'manual';
 data.daily.area = $('#mDailyArea').value || data.daily.area;
 data.daily.quests = $('#mDailyQuests').value.split('\n').map(s=>s.trim()).filter(Boolean) || data.daily.quests;
 data.candle.area = $('#mCandleArea').value || data.candle.area;
 data.candle.locations = $('#mCandleLocs').value.split('\n').map(s=>s.trim()).filter(Boolean) || data.candle.locations;
 data.shard.summary = $('#mShardSummary').value || data.shard.summary;
 data.shard.locations = $('#mShardLocs').value.split('\n').map(s=>s.trim()).filter(Boolean) || data.shard.locations;
 localStorage.setItem('sky_manual_data', JSON.stringify(data)); state.data=data; render();
}
window.addEventListener('DOMContentLoaded',()=>{
 loadData(); setInterval(loadData, isOverlay?300000:900000);
 tickTimers(); setInterval(tickTimers,1000);
 const b=$('#manualSave'); if(b) b.addEventListener('click',manualSave);
 const r=$('#reload'); if(r) r.addEventListener('click',loadData);
});
