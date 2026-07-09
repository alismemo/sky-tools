async function loadSky(){
  const res = await fetch('data/sky.json?ts=' + Date.now());
  const data = await res.json();
  document.getElementById('updated').textContent = `更新: ${data.updatedAtJst || '未取得'} / 状態: ${data.status || 'unknown'}`;
  setList('daily', data.daily);
  setList('candles', data.bigCandles);
  setList('shards', data.shards);
}
function setList(id, arr){
  const ul = document.getElementById(id); ul.innerHTML='';
  (arr && arr.length ? arr : ['データなし']).forEach(v=>{ const li=document.createElement('li'); li.textContent=v; ul.appendChild(li); });
}
function nextBread(){
  const now = new Date();
  const minutes = [35, 40, 45];
  const candidates=[];
  for(let h=-1; h<4; h++) for(const m of minutes){ const d=new Date(now); d.setHours(now.getHours()+h,m,0,0); if(d>now)candidates.push(d); }
  candidates.sort((a,b)=>a-b); return candidates[0];
}
function tick(){
  const n=nextBread(); const diff=Math.max(0,n-new Date());
  const mm=String(Math.floor(diff/60000)).padStart(2,'0'); const ss=String(Math.floor(diff/1000)%60).padStart(2,'0');
  document.getElementById('bread').textContent=`次のパン焼きまで ${mm}:${ss}`;
}
loadSky().catch(e=>{document.getElementById('updated').textContent='読み込み失敗: '+e.message;document.getElementById('updated').className='error'});
setInterval(tick,1000); tick();
setInterval(loadSky,5*60*1000);
