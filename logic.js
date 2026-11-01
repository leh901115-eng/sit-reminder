// 纯状态机：无 DOM 依赖，可在 node 中测试
(function (root) {
  const MIN = 60000;
  function config(test) {
    return test ? { remindAfter: 30000, repeat: 5000, idleReset: 30000 }
                : { remindAfter: 30 * MIN, repeat: 5 * MIN, idleReset: 30 * MIN };
  }
  function initial() { return { phase: 'idle', start: null, lastMotion: null, nextAlert: null, alertCount: 0 }; }
  function onMotion(s, now) {
    s = Object.assign({}, s, { lastMotion: now });
    if (s.phase === 'idle') { s.phase = 'timing'; s.start = now; s.nextAlert = null; s.alertCount = 0; }
    return s;
  }
  // 返回 {state, alert:boolean}
  function tick(s, now, cfg) {
    s = Object.assign({}, s); let alert = false;
    if (s.phase === 'timing') {
      // 离开时刻早于(或等于)应提醒时刻且已到达 → 判定离开清零（后台恢复时也按时间先后判断）
      const leaveAt = s.lastMotion + cfg.idleReset;
      if (now >= leaveAt && leaveAt <= s.start + cfg.remindAfter) {
        return { state: initial(), alert: false, autoReset: true };
      }
      if (now - s.start >= cfg.remindAfter) {
        s.phase = 'alerting'; alert = true; s.alertCount = 1;
        s.nextAlert = s.start + cfg.remindAfter + cfg.repeat;
      }
    }
    if (s.phase === 'alerting' && now >= s.nextAlert) {
      alert = true; s.alertCount++;
      // 跳过后台期间错过的多次，只响一次
      const missed = Math.floor((now - s.nextAlert) / cfg.repeat) + 1;
      s.nextAlert += missed * cfg.repeat;
    }
    return { state: s, alert };
  }
  function reset() { return initial(); }
  const api = { config, initial, onMotion, tick, reset };
  if (typeof module !== 'undefined') module.exports = api; else root.SitLogic = api;
})(this);
