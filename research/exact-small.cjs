#!/usr/bin/env node
'use strict';

// Exact unit-cost breadth-first search on small, fully known boards.
// The starting corner reveal is fixed; flag removals cannot improve an oracle solution.
const {board,solve}=require('./experiment.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

function exact(b) {
  assert(b.n<=16&&b.mines<=4,'bounded exact search');
  const safe=[],mines=[];
  for(let i=0;i<b.n;i++) (b.mine[i]?mines:safe).push(i);
  const goal=safe.reduce((mask,i)=>mask|(1<<i),0),required=new Int32Array(b.n);
  const opening=new Int32Array(b.n), chordOpening=new Int32Array(b.n);
  for(const i of safe) {
    required[i]=b.neighbors[i].reduce((mask,j)=>b.mine[j]?mask|(1<<mines.indexOf(j)):mask,0);
    const todo=[i];let mask=0;
    while(todo.length) {
      const j=todo.pop();if(mask&(1<<j))continue;
      mask|=1<<j;
      if(b.numbers[j]===0) for(const k of b.neighbors[j]) if(!b.mine[k])todo.push(k);
    }
    opening[i]=mask;
  }
  for(const i of safe)chordOpening[i]=b.neighbors[i].reduce((mask,j)=>b.mine[j]?mask:mask|opening[j],0);
  const capacity=1<<(b.n+b.mines),previous=new Int32Array(capacity).fill(-1),actions=new Int16Array(capacity);
  const queue=new Int32Array(capacity);let head=0,tail=0;
  const initial=opening[0];previous[initial]=initial;queue[tail++]=initial;
  function add(key,prior,action){if(previous[key]===-1){previous[key]=prior;actions[key]=action;queue[tail++]=key;}}
  while(head<tail) {
    const state=queue[head++],visible=state&((1<<b.n)-1),flags=state>>>b.n;
    if(visible===goal) {
      const trace=[];let k=state;
      while(previous[k]!==k) {
        const a=actions[k],type=a<16?'reveal':a<32?'flag':'chord',index=a%16;
        trace.push({type,index,x:index%b.width,y:Math.floor(index/b.width)});k=previous[k];
      }
      trace.push({type:'reveal',index:0,x:0,y:0});trace.reverse();
      return {clicks:trace.length,visitedStates:head,trace};
    }
    // Individual reveals, correct flags, and legal chords are all possible actions.
    for(const i of safe) {
      if(!(visible&(1<<i)))add((flags<<b.n)|(visible|opening[i]),state,i);
      else if(b.numbers[i]>0&&(flags&required[i])===required[i]&&(visible|chordOpening[i])!==visible)
        add((flags<<b.n)|(visible|chordOpening[i]),state,32+i);
    }
    for(let j=0;j<mines.length;j++)if(!(flags&(1<<j)))add(((flags|(1<<j))<<b.n)|visible,state,16+mines[j]);
  }
  throw Error('No solution');
}
function run() {
  for(let seed=1;seed<=100;seed++) {
    const b=board(4,4,3,seed),greedy=solve(b,'greedy-chord',seed),optimal=exact(b);
    assert(optimal.clicks<=greedy.clicks);
    if(optimal.clicks<greedy.clicks) {
      const output={description:'Small exact oracle counterexample to the conservative greedy heuristic',width:4,height:4,mines:3,seed,
        mineIndices:Array.from({length:b.n},(_,i)=>i).filter(i=>b.mine[i]),bbbv:b.bbbv,greedyClicks:greedy.clicks,
        exactClicks:optimal.clicks,exactEfficiency:100*b.bbbv/optimal.clicks,trace:optimal.trace,visitedStates:optimal.visitedStates,
        model:'Initial reveal at index 0 fixed; known mines; one action per individual reveal, correct flag placement, or chord. Exhaustive BFS finds minimum total actions for this board and model.'};
      fs.writeFileSync(path.resolve(__dirname,'../data/exact-example.json'),JSON.stringify(output,null,2)+'\n');
      console.log(JSON.stringify(output,null,2));return output;
    }
  }
  throw Error('No counterexample in the declared search range');
}
if(require.main===module)run();
module.exports={exact,run};
