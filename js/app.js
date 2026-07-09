const $=s=>document.querySelector(s);let DATA={};
async function loadData(){try{const r=await fetch('data/sky.json?ts='+Date.now());DATA=await r.json();}catch(e){DATA=JSON.parse(localStorage.skyManual||'{}')}render();}
function li(arr){return (arr||['未取得']).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}
function escapeHtml(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function render(){
 $('#updated').textContent=DATA.updatedAt||'未取得';
 $('#dailyArea').textContent=DATA.daily?.area||'未取得'; $('#dailyPeriod').textContent=DATA.daily?.period||''; $('#dailyList').innerHTML=li(DATA.daily?.quests);
 $('#candleArea').textContent=DATA.candles?.area||'未取得'; $('#candlePeriod').textContent=DATA.candles?.period||''; $('#candleCount').textContent=DATA.candles?.count||''; $('#candleList').innerHTML=li(DATA.candles?.places);
 $('#shardArea').textContent=DATA.shards?.area||'未取得'; $('#shardType').textContent=DATA.shards?.type||''; $('#shardTimes').innerHTML=li(DATA.shards?.times); $('#shardPlaces').innerHTML=li(DATA.shards?.places);
}
function nextAt(hours){const n=new Date(), a=[]; for(let d=0;d<2;d++) for(const h of hours){const t=new Date(n);t.setDate(n.getDate()+d);t.setHours(h,0,0,0); if(t>n)a.push(t)} return a.sort((a,b)=>a-b)[0];}
const bakeryHours=[0,2,4,6,8,10,12,14,16,18,20,22]; const geyserHours=[1,3,5,7,9,11,13,15,17,19,21,23]; const turtleHours=[0,2,4,6,8,10,12,14,16,18,20,22];
function tick(){const fmt=t=>{let ms=t-new Date();if(ms<0)ms=0;let h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}; $('#bakery').textContent=fmt(nextAt(bakeryHours)); $('#geyser').textContent=fmt(nextAt(geyserHours)); $('#turtle').textContent=fmt(nextAt(turtleHours)); const reset=new Date(); reset.setHours(16,0,0,0); if(reset<new Date())reset.setDate(reset.getDate()+1); $('#reset').textContent=fmt(reset)}
function saveManual(){const obj=DATA; obj.daily=obj.daily||{}; obj.candles=obj.candles||{}; obj.shards=obj.shards||{}; obj.daily.quests=$('#mDaily').value.split('\n').filter(Boolean); obj.candles.places=$('#mCandles').value.split('\n').filter(Boolean); obj.shards.places=$('#mShards').value.split('\n').filter(Boolean); obj.updatedAt='手動補正 '+new Date().toLocaleString('ja-JP'); localStorage.skyManual=JSON.stringify(obj); DATA=obj; render();}
window.addEventListener('DOMContentLoaded',()=>{loadData();setInterval(tick,1000);tick(); if($('#saveManual'))$('#saveManual').onclick=saveManual;});
