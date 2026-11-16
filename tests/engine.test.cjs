const test=require('node:test');
const assert=require('node:assert/strict');
const {Game,neighborsFor,deductions}=require('../engine.js');

test('seeded generation is repeatable, first opening protected',()=>{
  const a=new Game({seed:'repeat'}),b=new Game({seed:'repeat'});a.reveal(40);b.reveal(40);
  assert.deepEqual(a.mineMask,b.mineMask);assert.equal(a.mineMask.filter(Boolean).length,10);assert.equal(a.numbers[40],0);
  assert(a.neighbors[40].every(i=>!a.mineMask[i]));
});
test('dense boards fall back to safe cell, never unsafe start',()=>{
  const a=new Game({width:3,height:3,mines:8,firstClick:'zero'});a.reveal(4);assert.equal(a.status,'won');assert(a.zeroFallback);assert(!a.mineMask[4]);
});
test('3BV distinguishes opening and isolated numbered squares',()=>{
  const a=Game.fromLayout(3,3,[0]);assert.equal(a.bbbv,1);a.reveal(8);assert.equal(a.status,'won');assert.equal(a.solvedBBBV,1);assert.equal(a.stats().efficiency,100);
  const b=Game.fromLayout(3,3,[4]);assert.equal(b.bbbv,8);assert.equal(b.stats().openings,0);assert.equal(b.stats().isolated,8);
});
test('flags can block flood; unflagging alone does not win',()=>{
  const g=Game.fromLayout(3,3,[0]);g.toggleFlag(8);g.reveal(6);assert.equal(g.status,'playing');assert.equal(g.solvedBBBV,0);g.toggleFlag(8);assert.equal(g.status,'playing');g.reveal(8);assert.equal(g.status,'won');assert.equal(g.clicks.right,2);assert.equal(g.solvedBBBV,1);
});
test('a wrong flag on an opening boundary also leaves its 3BV unit incomplete',()=>{
  const g=Game.fromLayout(3,3,[0]);g.toggleFlag(1);g.reveal(8);assert.equal(g.solvedBBBV,0);assert.equal(g.status,'playing');g.toggleFlag(1);g.reveal(1);assert.equal(g.solvedBBBV,1);assert.equal(g.status,'won');
});
test('a useful chord can exceed 100% efficiency; no-op actions count',()=>{
  const g=Game.fromLayout(3,3,[4]);g.reveal(0);g.toggleFlag(4);g.chord(0);assert.equal(g.solvedBBBV,3);g.chord(0);assert.equal(g.clicks.wasted,1);
  g.chord(1);g.chord(3);g.chord(5);assert.equal(g.status,'won');assert.equal(g.solvedBBBV,8);assert.equal(g.totalClicks,7);assert(g.stats().efficiency>100);
});
test('incorrect flags can make a chord detonate a mine',()=>{
  const g=Game.fromLayout(3,3,[4]);g.reveal(0);g.toggleFlag(1);g.chord(0);assert.equal(g.status,'lost');assert.equal(g.exploded,4);
});
test('no-flags ignores right click; action after end ignored',()=>{
  const g=Game.fromLayout(3,3,[0],{noFlags:true});g.toggleFlag(0);assert.equal(g.totalClicks,0);g.reveal(8);g.reveal(1);assert.equal(g.totalClicks,1);
});
test('cross and knight topology use exact intended neighbors',()=>{
  assert.deepEqual(neighborsFor(5,5,'cross')[12].sort((a,b)=>a-b),[7,11,13,17]);
  assert.deepEqual(neighborsFor(5,5,'knight')[12].sort((a,b)=>a-b),[1,3,5,9,15,19,21,23]);
  for(const topology of ['cross','knight']){const g=new Game({width:9,height:9,mines:10,topology,seed:topology});g.reveal(40);assert.equal(g.numbers[40],0);assert(!g.mineMask[40]);}
});
test('replay preserves board, actions, state, counters and time',()=>{
  const g=Game.fromLayout(3,3,[4]);g.reveal(0);g.toggleFlag(4);g.chord(0);const replay=g.exportReplay(),r=Game.fromReplay(replay);
  assert.deepEqual(r.revealed,g.revealed);assert.deepEqual(r.flags,g.flags);assert.deepEqual(r.clicks,g.clicks);assert.deepEqual(r.mineMask,g.mineMask);assert.equal(r.elapsedMs,replay.elapsedMs);
  const p=Game.fromReplay(replay,1);assert.equal(p.totalClicks,1);assert.equal(p.flagCount,0);
});
test('hints do not trust wrong flags or peek at unrevealed numbers',()=>{
  const g=Game.fromLayout(3,3,[0]);g.reveal(8); // win; use a constrained separate board
  const h=Game.fromLayout(4,4,[0,2,8]);h.reveal(15);h.toggleFlag(1);
  const a=h.hint();const saved=h.mineMask.slice();h.mineMask.fill(false);h.numbers=h.numbers.map((v,i)=>h.revealed[i]?v:999);const b=h.hint();assert.deepEqual(a,b);h.mineMask=saved;
  if(a.type==='reveal'||a.type==='unflag')assert(!saved[a.index]);if(a.type==='flag')assert(saved[a.index]);
});
test('solver hints are sound on many partially revealed boards',()=>{
  for(const topology of ['classic','cross','knight'])for(let seed=0;seed<35;seed++){
    const g=new Game({width:7,height:7,mines:8,seed,topology});g.reveal(0);
    for(let step=0;step<40&&g.status==='playing';step++){
      const h=g.hint();if(h.type==='none')break;
      if(h.type==='flag'){assert(g.mineMask[h.index]);g.toggleFlag(h.index);}
      else if(h.type==='unflag'){assert(!g.mineMask[h.index]);g.toggleFlag(h.index);}
      else {assert(!g.mineMask[h.index]);g.reveal(h.index);}
    }
    assert.notEqual(g.status,'lost');
  }
});
test('no-guess certification produces a solvable board, records mandatory start',async()=>{
  const g=new Game({seed:'certified',width:9,height:9,mines:10});const result=await g.generateNoGuess(0,{maxAttempts:30});assert(result.success);assert(g.certified);assert.equal(g.status,'ready');assert(g.reveal(1).ignored);g.reveal(0);
  for(let i=0;i<200&&g.status==='playing';i++){const h=g.hint();assert.notEqual(h.type,'none');if(h.type==='flag'||h.type==='unflag')g.toggleFlag(h.index);else g.reveal(h.index);}
  assert.equal(g.status,'won');
});
test('invalid inputs and malformed replay fail clearly',()=>{
  assert.throws(()=>new Game({width:0}));assert.throws(()=>Game.fromLayout(2,2,[0,0]));assert.throws(()=>Game.fromReplay({}));
});
test('replay rejects terminal trailing actions, no-flags actions and invalid times',()=>{
  const g=Game.fromLayout(3,3,[0]);g.reveal(8);const r=g.exportReplay();
  r.actions.push({type:'left',index:0,timeMs:r.elapsedMs});assert.throws(()=>Game.fromReplay(r),/could not accept/);
  const fresh=new Game({noFlags:true}).exportReplay();fresh.actions=[{type:'right',index:0,timeMs:0}];assert.throws(()=>Game.fromReplay(fresh),/could not accept/);
  const invalid=new Game().exportReplay();invalid.elapsedMs=-1;assert.throws(()=>Game.fromReplay(invalid),/time/);
  const backwards=new Game().exportReplay();backwards.actions=[{type:'right',index:0,timeMs:10},{type:'right',index:0,timeMs:0}];backwards.elapsedMs=20;assert.throws(()=>Game.fromReplay(backwards),/action/);
  const missingConfig=new Game().exportReplay();delete missingConfig.config;assert.throws(()=>Game.fromReplay(missingConfig),/configuration/);
});
test('no-guess search supports immediate and in-progress cancellation',async()=>{
  const a=new Game({seed:'cancel'}),controller=new AbortController();controller.abort();const first=await a.generateNoGuess(0,{signal:controller.signal});assert(first.cancelled);assert(!a.generated);assert.equal(a.status,'ready');
  const b=new Game({width:9,height:9,mines:60,seed:'cancel-progress'});let cancelled=false;
  const second=await b.generateNoGuess(0,{maxAttempts:50,isCancelled:()=>cancelled,onProgress:()=>{cancelled=true;}});assert(second.cancelled);assert(!b.generated);assert.equal(b.totalClicks,0);
});
test('all 3×3 revealed/hidden/mine states give sound direct and subset deductions',()=>{
  const neighbors=neighborsFor(3,3,'classic');
  for(let state=0;state<3**9;state++){
    let n=state;const mines=[],revealed=[];
    for(let i=0;i<9;i++){const v=n%3;n=Math.floor(n/3);mines.push(v===1);revealed.push(v===2);}
    const total=mines.filter(Boolean).length;if(total===9)continue;
    const visible=neighbors.map((ns,i)=>revealed[i]?ns.filter(j=>mines[j]).length:null);
    const d=deductions(3,3,total,revealed,visible,neighbors);assert(!d.inconsistent);
    for(const i of d.safe)assert(!mines[i],`unsafe deduction in state ${state}`);
    for(const i of d.mines)assert(mines[i],`false mine deduction in state ${state}`);
  }
});
