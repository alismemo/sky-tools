async function loadSky(){
  const res = await fetch('data/sky.json?ts=' + Date.now());
  const data = await res.json();
  document.getElementById('updated').textContent = '更新: ' + (data.updatedAtJST || '未更新');
  document.getElementById('dailyArea').textContent = '対象エリア: ' + (data.daily?.area || '-');
  fill('dailyList', data.daily?.quests || []);
  document.getElementById('candleArea').textContent = 'エリア: ' + (data.candles?.area || '-');
  fill('candleList', data.candles?.locations || []);
  document.getElementById('shardPlace').textContent = '場所: ' + (data.shards?.place || '-');
  document.getElementById('shardType').textContent = `種類: ${data.shards?.type || '-'} / 報酬: ${data.shards?.reward || '-'}`;
  fill('shardTimes', data.shards?.times || []);
}
function fill(id, items){
  const el=document.getElementById(id); el.innerHTML='';
  (items.length?items:['未取得']).forEach(x=>{const li=document.createElement('li');li.textContent=x;el.appendChild(li);});
}
function updateBread(){
  const now = new Date();
  const next = new Date(now);
  const m = now.getMinutes();
  if(m < 30){ next.setMinutes(30,0,0); } else { next.setHours(next.getHours()+1,0,0,0); }
  const diff = Math.max(0, next-now);
  const mm = String(Math.floor(diff/60000)).padStart(2,'0');
  const ss = String(Math.floor(diff/1000)%60).padStart(2,'0');
  document.getElementById('breadNext').textContent = `次のパン焼き目安まで ${mm}:${ss}`;
}
loadSky().catch(e=>{document.getElementById('updated').textContent='読み込み失敗: '+e.message});
updateBread(); setInterval(updateBread,1000); setInterval(loadSky,5*60*1000);
