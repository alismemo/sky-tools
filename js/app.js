const $ = (id)=>document.getElementById(id);
let skyData = null;
async function loadSky(){
  try{
    const res = await fetch('data/sky.json?ts='+Date.now());
    skyData = await res.json();
    render(skyData);
  }catch(e){
    document.body.insertAdjacentHTML('afterbegin','<div class="wrap"><div class="card warn">data/sky.jsonを読めませんでした。Actionsを実行してください。</div></div>');
  }
}
function arr(a){return Array.isArray(a)?a:[]}
function li(list){return arr(list).map(x=>`<div class="item">${escapeHtml(String(x))}</div>`).join('')||'<div class="muted">未取得</div>'}
function escapeHtml(s){return s.replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function render(d){
  $('updated').textContent = d.updatedAtJst || d.updatedAt || '未取得';
  $('status').textContent = d.status || 'unknown';
  $('status').className = d.status === 'ok' ? 'ok' : 'warn';
  const daily=d.daily||{};
  $('dailyMeta').innerHTML = `<span class="pill">エリア ${escapeHtml(daily.area||'未取得')}</span><span class="pill">${escapeHtml(daily.start||'')}</span><span class="pill">${escapeHtml(daily.end||'')}</span>`;
  $('dailyList').innerHTML = li(daily.quests);
  const c=d.bigCandles||{};
  $('candleMeta').innerHTML = `<span class="pill">${escapeHtml(c.area||'未取得')}</span><span class="pill">${escapeHtml(c.count||'')}</span><span class="pill">${escapeHtml(c.period||'')}</span>`;
  $('candleList').innerHTML = li(c.locations);
  const s=d.shards||{};
  $('shardMeta').innerHTML = `<span class="pill">${escapeHtml(s.type||'未取得')}</span><span class="pill">${escapeHtml(s.reward||'')}</span><span class="pill">${escapeHtml(s.period||'')}</span>`;
  $('shardPlace').textContent = s.location || '未取得';
  $('shardTimes').innerHTML = li(s.times);
  $('breadSchedule').innerHTML = arr(d.timers?.bread).map(t=>`<div class="timebox">${t}</div>`).join('');
  updateTimer();
}
function nextFromSchedule(times){
  const now = new Date();
  const today = new Date(now); today.setHours(0,0,0,0);
  const candidates = times.map(t=>{const [h,m]=t.split(':').map(Number); const d=new Date(today); d.setHours(h,m,0,0); if(d<now)d.setDate(d.getDate()+1); return d;});
  return candidates.sort((a,b)=>a-b)[0];
}
function updateTimer(){
  const times = skyData?.timers?.bread || [];
  if(!times.length){$('breadNext').textContent='未取得';$('breadCountdown').textContent='--:--:--';return}
  const next = nextFromSchedule(times);
  const diff = Math.max(0,next-new Date());
  const h = Math.floor(diff/3600000), m=Math.floor(diff%3600000/60000), s=Math.floor(diff%60000/1000);
  $('breadNext').textContent = next.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
  $('breadCountdown').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
setInterval(updateTimer,1000);loadSky();
