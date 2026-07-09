const DATA_URL = './data/sky.json?ts=' + Date.now();
const $ = (id) => document.getElementById(id);
function setText(id, v){ const el=$(id); if(el) el.textContent = v || '未取得'; }
function list(id, arr){ const el=$(id); if(!el) return; el.innerHTML=''; (arr&&arr.length?arr:['未取得']).forEach(x=>{const li=document.createElement('li');li.textContent=x;el.appendChild(li);}); }
function nextTime(times){ const now=new Date(); const nowMin=now.getHours()*60+now.getMinutes(); let best=null; for(const t of times||[]){const [h,m]=t.split(':').map(Number); let min=h*60+m; let diff=min-nowMin; if(diff<=0) diff+=1440; if(best===null||diff<best.diff) best={t,diff};} return best; }
function renderTimer(id,times){ const n=nextTime(times); if(!n){setText(id,'--:--');return;} setText(id,`${n.t} まで ${Math.floor(n.diff/60)}時間${n.diff%60}分`); }
async function load(){
 try{ const data=await fetch(DATA_URL).then(r=>r.json());
  setText('status', data.status); setText('updated', data.updatedAtJst);
  setText('dailyArea', data.daily?.area); list('dailyList', data.daily?.quests);
  setText('candleArea', data.bigCandles?.area); setText('candlePeriod', data.bigCandles?.period); list('candleList', data.bigCandles?.locations);
  setText('shardLocation', data.shards?.location); setText('shardType', data.shards?.type); list('shardNotes', [...(data.shards?.times||[]), ...(data.shards?.notes||[])]);
  renderTimer('breadTimer', data.timers?.bread); renderTimer('geyserTimer', data.timers?.geyser); renderTimer('turtleTimer', data.timers?.turtle);
 }catch(e){ setText('status','読み込み失敗'); console.error(e); }
}
load(); setInterval(load, 60000);
