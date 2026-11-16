const test = require('node:test');
const assert = require('node:assert/strict');
const {Game} = require('../engine.js');

test('safe-cell sampling allows a numbered one-cell start', () => {
  let found = false;
  for (let seed=0; seed<20; seed++) {
    const g = new Game({seed:String(seed),firstClick:'safe'});
    g.reveal(0);
    assert(!g.mineMask[0]);
    if (g.numbers[0]>0) { assert.equal(g.revealedCount,1); found=true; break; }
  }
  assert(found);
});

test('action budget charges no-change actions and freezes an exhausted run', async () => {
  const g = Game.fromLayout(3,3,[4],{actionLimit:3});
  g.reveal(1); g.reveal(1); g.toggleFlag(4);
  assert.equal(g.status,'exhausted');
  assert.equal(g.totalClicks,3); assert.equal(g.clicks.wasted,1);
  assert.equal(g.stats().actionsRemaining,0);
  const elapsed=g.elapsedMs;
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(g.elapsedMs,elapsed);
  assert(g.chord(1).ignored);
  assert.equal(g.totalClicks,3);
});

test('winning on the last budget action takes precedence over exhaustion', () => {
  const g = Game.fromLayout(3,3,[4],{actionLimit:5});
  g.reveal(1);g.toggleFlag(4);g.chord(1);g.chord(3);g.chord(5);
  assert.equal(g.status,'won');assert.equal(g.totalClicks,5);assert.equal(g.stats().efficiency,160);
});

test('exhausted games round-trip through replay, including before first reveal', () => {
  for(const firstMove of ['reveal','toggleFlag']){
    const g=new Game({seed:'budget',actionLimit:1,firstClick:'safe'});g[firstMove](0);
    assert.equal(g.status,'exhausted');
    const r=Game.fromReplay(g.exportReplay());
    assert.equal(r.status,'exhausted');assert.equal(r.actionLimit,1);
    assert.deepEqual(r.flags,g.flags);assert.deepEqual(r.revealed,g.revealed);
  }
  const old=new Game({seed:'old'}).exportReplay();delete old.config.actionLimit;
  assert.equal(Game.fromReplay(old).actionLimit,null);
  old.config.actionLimit=-1;assert.throws(()=>Game.fromReplay(old),/budget/);
});

test('NG certification honors a safe-only proposal and still certifies its output', async()=>{
  const g=new Game({width:9,height:9,mines:10,seed:'safe-only-ng',firstClick:'safe'});
  const result=await g.generateNoGuess(0,{maxAttempts:100});
  assert(result.success);assert.equal(g.firstClick,'safe');
  g.reveal(0);
  for(let step=0;step<200&&g.status==='playing';step++){
    const hint=g.hint();assert.notEqual(hint.type,'none');
    g[hint.type==='reveal'?'reveal':'toggleFlag'](hint.index);
  }
  assert.equal(g.status,'won');
});
