(function(){
const L=window.SitLogic,$=id=>document.getElementById(id),LS=localStorage;
let state=JSON.parse(LS.getItem('sit.state')||'null')||L.initial();
let sens=+(LS.getItem('sit.sens')||5),test=LS.getItem('sit.test')==='1';
let started=false,audio=null,wakeLock=null,lastG=null,lastMag=0,sensorOK='未授权',wakeTxt='未请求';
const cfg=()=>L.config(test);
// 阈值（m/s²，去重力后的帧间变化）：灵敏度1→3.0，10→0.3
const threshold=()=>+(3.3-sens*0.3).toFixed(2);
function save(){LS.setItem('sit.state',JSON.stringify(state));}
function fmt(ms){if(ms==null||ms<0)return'--';const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function beep(){try{if(!audio)return;const t=audio.currentTime;[0,0.4,0.8].forEach(d=>{const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=880;o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(0.0001,t+d);g.gain.exponentialRampToValueAtTime(0.8,t+d+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.3);o.start(t+d);o.stop(t+d+0.32);});}catch(e){}}
function fire(){$('alert').classList.add('on');beep();try{navigator.vibrate&&navigator.vibrate([400,200,400]);}catch(e){}}
function step(){const now=Date.now(),r=L.tick(state,now,cfg());state=r.state;if(r.alert)fire();if(r.autoReset)$('alert').classList.remove('on');save();render(now);}
function render(now){
 const names={idle:'空闲（等待移动）',timing:'计时中',alerting:'⚠️ 提醒中'};
 $('vPhase').textContent=started||state.phase!=='idle'?names[state.phase]:'未启动';
 $('vElapsed').textContent=state.start?fmt(now-state.start):'--';
 $('vSince').textContent=state.lastMotion?fmt(now-state.lastMotion):'--';
 let next=null;if(state.phase==='timing')next=state.start+cfg().remindAfter-now;if(state.phase==='alerting')next=state.nextAlert-now;
 $('vNext').textContent=fmt(next);$('vMag').textContent=lastMag.toFixed(2)+' / '+threshold();
 $('vSens').textContent=sens;$('alertInfo').textContent='已连续计时 '+(state.start?fmt(now-state.start):'');
 $('msg').textContent='屏幕常亮：'+wakeTxt+' ｜ 运动传感器：'+sensorOK+(test?' ｜ 测试模式':'');
}
function onMotion(e){
 let m=0;const a=e.acceleration,g=e.accelerationIncludingGravity;
 if(a&&a.x!=null){m=Math.hypot(a.x,a.y,a.z);}
 else if(g&&g.x!=null){if(lastG)m=Math.hypot(g.x-lastG.x,g.y-lastG.y,g.z-lastG.z);lastG={x:g.x,y:g.y,z:g.z};}
 lastMag=m;sensorOK='已工作';
 if(m>=threshold()){state=L.onMotion(state,Date.now());save();}
}
async function wake(){
 if(!('wakeLock' in navigator)){wakeTxt='❌ 不支持（需 iOS 16.4+）';return;}
 try{wakeLock=await navigator.wakeLock.request('screen');wakeTxt='✅ 已开启';wakeLock.addEventListener('release',()=>{wakeTxt='⚠️ 已释放';});}catch(e){wakeTxt='❌ 失败：'+e.name;}
}
$('startBtn').onclick=async()=>{
 try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();await audio.resume();const b=audio.createBuffer(1,1,22050),s=audio.createBufferSource();s.buffer=b;s.connect(audio.destination);s.start();}catch(e){}
 if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){
  try{const p=await DeviceMotionEvent.requestPermission();sensorOK=p==='granted'?'已授权，等待数据':'❌ 被拒绝';if(p!=='granted'){render(Date.now());return;}}catch(e){sensorOK='❌ '+e.name+'（需 HTTPS）';render(Date.now());return;}
 }else if(typeof DeviceMotionEvent==='undefined'){sensorOK='❌ 设备不支持';}
 else sensorOK='已监听，等待数据';
 if(!started){window.addEventListener('devicemotion',onMotion);started=true;}
 await wake();$('startBtn').textContent='已开始';render(Date.now());
};
const doReset=()=>{state=L.reset();save();$('alert').classList.remove('on');render(Date.now());};
$('resetBtn').onclick=doReset;$('ackBtn').onclick=doReset;$('hideBtn').onclick=()=>$('alert').classList.remove('on');
$('sens').value=sens;$('sens').oninput=e=>{sens=+e.target.value;LS.setItem('sit.sens',sens);render(Date.now());};
$('testMode').checked=test;$('testMode').onchange=e=>{test=e.target.checked;LS.setItem('sit.test',test?'1':'0');step();};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){step();if(started&&(!wakeLock||wakeLock.released))wake().then(()=>render(Date.now()));if(audio)audio.resume();}});
if(state.phase==='alerting')$('alert').classList.add('on');
setInterval(step,500);step();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
