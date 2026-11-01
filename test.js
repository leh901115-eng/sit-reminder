const L=require('./logic.js'),a=require('assert');const c=L.config(true);let s=L.initial(),r;
r=L.tick(s,1000,c);a.equal(r.state.phase,'idle');
s=L.onMotion(s,0);a.equal(s.phase,'timing');
r=L.tick(s,29999,c);a.equal(r.state.phase,'timing');a.ok(!r.alert);
// 无移动30s：idleReset 与 remindAfter 同时到期 → 判离开清零
r=L.tick(s,30000,c);a.equal(r.state.phase,'idle');
// 持续移动 → 30s 提醒
s=L.initial();s=L.onMotion(s,0);s=L.onMotion(s,20000);r=L.tick(s,30000,c);a.equal(r.state.phase,'alerting');a.ok(r.alert);s=r.state;
r=L.tick(s,34000,c);a.ok(!r.alert);r=L.tick(s,35000,c);a.ok(r.alert);s=r.state;a.equal(s.nextAlert,40000);
// 提醒阶段不自动清零
r=L.tick(s,200000,c);a.equal(r.state.phase,'alerting');a.ok(r.alert);a.ok(r.state.nextAlert>200000);
s=L.onMotion(r.state,200001);a.equal(s.phase,'alerting');
a.equal(L.reset().phase,'idle');
const p=L.config(false);a.equal(p.remindAfter,1800000);a.equal(p.repeat,300000);
console.log('全部单元测试通过');
