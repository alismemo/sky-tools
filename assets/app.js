const $ = (q)=>document.querySelector(q);
const state = { data:null, manual: JSON.parse(localStorage.getItem('skyManual')||'{}'), settings: JSON.parse(localStorage.getItem('skySettings')||'{"scale":100,"opacity":92}') };
function jstDate(d=new Date()){ return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d); }
async function load(){
  try{ const r=await fetch('data/sky.json?ts='+Date.now(), {cache:'no-store'}); state.data=await r.json(); }
  catch(e){ state.data={updatedAt:'取得失敗',errors:[String(e)],daily:{area:'取得失敗',quests:[]},candle:{area:'取得失敗',places:[]},shard:{place:'取得失敗',times:[],notes:[]},timers:{bakery:{next:'',memo:''}}}; }
  render();
}
function val(path, fallback=''){
  const man = path.split('.').reduce((o,k)=>o&&o[k], state.manual);
  if(man && (Array.isArray(man)?man.length:String(man).trim())) return man;
  const dat = path.split('.').reduce((o,k)=>o&&o[k], state.data);
  return dat ?? fallback;
}
function list(arr){ arr = Array.isArray(arr)?arr:[]; return arr.length ? arr.map(x=>`<li>${escapeHtml(x)}</li>`).join('') : '<li>未取得</li>'; }
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function nextCountdown(){
  const next = val('timers.bakery.next','');
  let target = next ? new Date(next) : null;
  const now = new Date();
  if(!target || isNaN(target) || target < now){
    const mins=[0,15,30,45]; target=new Date(now); target.setSeconds(0,0);
    let m=mins.find(x=>x>now.getMinutes());
    if(m==null){ target.setHours(target.getHours()+1); m=0; }
    target.setMinutes(m);
  }
  const diff=Math.max(0,target-now); const mm=Math.floor(diff/60000), ss=Math.floor(diff/1000)%60;
  return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
function render(){
  const d=state.data||{};
  $('#updated').textContent = d.updatedAt && d.updatedAt!=='未取得' ? '更新: '+jstDate(new Date(d.updatedAt)) : '未取得';
  $('#dailyArea').textContent = val('daily.area','未取得'); $('#dailyList').innerHTML=list(val('daily.quests',[]));
  $('#candleArea').textContent = val('candle.area','未取得'); $('#candleList').innerHTML=list(val('candle.places',[]));
  $('#shardPlace').textContent = val('shard.place','未取得'); $('#shardList').innerHTML=list([...val('shard.times',[]), val('shard.reward',''), ...val('shard.notes',[])].filter(Boolean));
  $('#bakeryTimer').textContent = nextCountdown(); $('#bakeryMemo').textContent = val('timers.bakery.memo','毎時 00 / 15 / 30 / 45 分目安');
  document.documentElement.style.setProperty('--scale', state.settings.scale/100); document.documentElement.style.setProperty('--panelOpacity', state.settings.opacity/100);
  if($('#manualDaily')) $('#manualDaily').value = (state.manual.daily?.quests||[]).join('\n');
}
function saveManual(){
  const q=$('#manualDaily').value.split('\n').map(x=>x.trim()).filter(Boolean);
  const ca=$('#manualCandleArea').value.trim(), cp=$('#manualCandlePlaces').value.split('\n').map(x=>x.trim()).filter(Boolean);
  const sp=$('#manualShardPlace').value.trim(), sn=$('#manualShardNotes').value.split('\n').map(x=>x.trim()).filter(Boolean);
  state.manual={}; if(q.length) state.manual.daily={quests:q}; if(ca||cp.length) state.manual.candle={area:ca,places:cp}; if(sp||sn.length) state.manual.shard={place:sp,notes:sn};
  localStorage.setItem('skyManual',JSON.stringify(state.manual)); render(); alert('手動補正を保存しました');
}
function clearManual(){ localStorage.removeItem('skyManual'); state.manual={}; render(); }
setInterval(()=>{ if($('#bakeryTimer')) $('#bakeryTimer').textContent=nextCountdown(); },1000);
window.addEventListener('DOMContentLoaded',()=>{ load(); $('#saveManual')?.addEventListener('click',saveManual); $('#clearManual')?.addEventListener('click',clearManual); $('#reload')?.addEventListener('click',load); });
