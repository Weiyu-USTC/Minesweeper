const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../tutorial-data.js'),{Game}=require('../engine.js');
test('bounded patterns have the intended unique layout in all rotations',()=>{
  for(const kind of ['basics','121','1221','reduction'])for(let rotation=0;rotation<4;rotation++){
    const p=D.rotate(D.makePuzzle(kind),rotation),layouts=D.possibleLayouts(p);
    assert.equal(layouts.length,1,`${kind} / ${rotation}`);assert.deepEqual(layouts[0].slice().sort((a,b)=>a-b),p.mines.slice().sort((a,b)=>a-b));
    for(const i of p.unknown)assert(D.verdict(p,i,p.mines.includes(i)?'flag':'reveal').valid);
  }
});
test('raw clues and certified-mine reduction are geometrically correct',()=>{
  for(const [kind,numbers] of [['121',[1,2,1]],['1221',[1,2,2,1]],['reduction',[2,3,2]],['basics',[1,1,0]]]){const p=D.makePuzzle(kind);assert.deepEqual(p.clues.map(i=>D.clue(p,i)),numbers);}
  const p=D.makePuzzle('reduction');assert(p.clues.every(i=>D.neighbors(p.width,p.height,i).includes(7)));
});
test('subset starts with two layouts but has a proved safe reveal',()=>{
  const p=D.makePuzzle('subset');assert.equal(D.possibleLayouts(p).length,2);assert(D.verdict(p,2,'reveal').valid);assert(!D.verdict(p,0,'flag').valid);assert(!D.verdict(p,1,'reveal').valid);assert.equal(D.possibleLayouts(p,[2]).length,1);
});
test('genuine guess state admits neither safe reveal nor certain flag',()=>{
  const p=D.makePuzzle('uncertainty');assert.equal(D.possibleLayouts(p).length,2);for(const i of p.unknown)for(const action of ['reveal','flag'])assert(!D.verdict(p,i,action).valid);
});
test('domain recommendation respects prerequisites and uncertainty',()=>{
  assert.equal(D.recommend([-1,-1,-1,-1,-1,-1]).level,0);assert.equal(D.recommend([0,1,0,0,0,0]).level,1);assert.equal(D.recommend([0,0,0,0,1,0]).level,2);assert.equal(D.recommend([0,0,0,0,0,1]).level,2);assert.equal(D.recommend([0,0,0,0,0,0]).level,3);
});
test('opening exercise is one unit; chord route uses five actions',()=>{
  const g=Game.fromLayout(4,4,[0]);assert.equal(g.bbbv,1);g.reveal(15);assert.equal(g.status,'won');assert.equal(g.totalClicks,1);
  const c=Game.fromLayout(3,3,[4]);c.reveal(1);c.toggleFlag(4);c.chord(1);c.chord(3);c.chord(5);assert.equal(c.status,'won');assert.equal(c.totalClicks,5);assert.equal(c.bbbv,8);assert.equal(c.stats().efficiency,160);
});
test('seven-action training route matches saved exact-search example',()=>{
  const fixture=require('../data/exact-example.json');assert.deepEqual(D.exactTrace,fixture.trace.map(a=>[a.type,a.index]));const g=Game.fromLayout(4,4,[6,8,14]);for(const [type,index] of D.exactTrace)g[type==='flag'?'toggleFlag':type](index);assert.equal(g.status,'won');assert.equal(g.totalClicks,7);assert.equal(g.bbbv,10);
});
test('zero probability is bounded, favors fewer neighbors only under safe-first',()=>{
  const values=[3,5,8].map(d=>D.zeroProbability(81,10,d));assert(values[0]>values[1]&&values[1]>values[2]);assert(Math.abs(values[0]-.6663)<.0001);assert.equal(D.zeroProbability(81,78,8),0);for(const d of [3,5,8])assert.equal(D.zeroProbability(81,10,d,'zero'),1);
});
