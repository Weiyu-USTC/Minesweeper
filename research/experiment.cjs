#!/usr/bin/env node
'use strict';

// A board-known action-economy study, independent of the playable game's engine.
// Run: node research/experiment.cjs [boards per difficulty, default 500]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function adjacency(width, height) {
  return Array.from({length: width * height}, (_, i) => {
    const out = [], x = i % width, y = Math.floor(i / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || x+dx<0 || x+dx>=width || y+dy<0 || y+dy>=height) continue;
      out.push((y+dy)*width+x+dx);
    }
    return out;
  });
}
function board(width, height, mines, seed, fixtureMines) {
  const neighbors = adjacency(width, height), n = width * height;
  const mine = new Uint8Array(n), random = rng(seed);
  if (fixtureMines) fixtureMines.forEach(i => mine[i] = 1);
  else {
    const protectedCells = new Set([0, ...neighbors[0]]);
    const candidates = Array.from({length:n}, (_, i) => i).filter(i => !protectedCells.has(i));
    assert(mines <= candidates.length);
    for (let i = candidates.length-1; i > 0; i--) {
      const j = Math.floor(random()*(i+1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.slice(0, mines).forEach(i => mine[i] = 1);
  }
  const numbers = neighbors.map(ns => ns.reduce((sum,j) => sum+mine[j],0));
  const unitOf = new Int32Array(n).fill(-1), openingSeeds = [], isolated = [];
  let units = 0;
  for (let i = 0; i < n; i++) {
    if (mine[i] || numbers[i] !== 0 || unitOf[i] !== -1) continue;
    openingSeeds.push(i);
    unitOf[i] = units;
    const stack = [i];
    while (stack.length) {
      const j = stack.pop();
      for (const k of neighbors[j]) if (!mine[k] && numbers[k] === 0 && unitOf[k] === -1) {
        unitOf[k] = units; stack.push(k);
      }
    }
    units++;
  }
  for (let i = 0; i < n; i++) {
    if (mine[i] || numbers[i] === 0 || neighbors[i].some(j => !mine[j] && numbers[j] === 0)) continue;
    unitOf[i] = units++; isolated.push(i);
  }
  return {width,height,mines,n,mine,numbers,neighbors,unitOf,openingSeeds,isolated,bbbv:units};
}
function solve(b, policy, seed) {
  const revealed = new Uint8Array(b.n), flags = new Uint8Array(b.n);
  let totalRevealed = 0, left = 0, right = 0, chord = 0;
  function open(i) {
    assert(!b.mine[i], 'oracle never chooses a mine');
    if (revealed[i]) return;
    const stack = [i];
    while (stack.length) {
      const j = stack.pop();
      if (revealed[j]) continue;
      assert(!b.mine[j]);
      revealed[j] = 1; totalRevealed++;
      if (b.numbers[j] === 0) for (const k of b.neighbors[j]) if (!revealed[k]) stack.push(k);
    }
  }
  const nfOrder = [...b.openingSeeds, ...b.isolated];
  left++; open(0);
  if (policy === 'random-safe') {
    const random = rng(seed ^ 0xC0FFEE);
    const order = Array.from({length:b.n},(_,i)=>i).filter(i=>!b.mine[i]);
    for (let i = order.length-1; i > 0; i--) {
      const j = Math.floor(random()*(i+1));
      [order[i],order[j]]=[order[j],order[i]];
    }
    for (const i of order) if (!revealed[i]) {left++; open(i);}
  } else {
    while (totalRevealed < b.n-b.mines) {
      let best = null;
      if (policy === 'greedy-chord') {
        for (let i = 0; i < b.n; i++) {
          if (!revealed[i] || b.numbers[i] === 0) continue;
          const newFlags = b.neighbors[i].filter(j=>b.mine[j]&&!flags[j]);
          const safe = b.neighbors[i].filter(j=>!b.mine[j]&&!revealed[j]);
          // A zero component is one NF action even if several zero cells touch this chord.
          // Border numbers belong to no unit and cannot count as independent NF savings.
          const units = new Set(safe.map(j=>b.unitOf[j]).filter(j=>j>=0)).size;
          const gain = units-newFlags.length-1;
          if (gain>0 && (!best || gain>best.gain)) best={i,newFlags,safe,gain};
        }
      }
      if (best) {
        for (const i of best.newFlags) {flags[i]=1;right++;}
        chord++;
        best.safe.forEach(open);
      } else {
        const i = nfOrder.find(j=>!revealed[j]);
        assert(i!==undefined, 'remaining safe cells have a remaining NF unit');
        left++;open(i);
      }
    }
  }
  assert.equal(totalRevealed,b.n-b.mines);
  const clicks = left+right+chord;
  if (policy==='opening-first') assert.equal(clicks,b.bbbv);
  if (policy==='greedy-chord') assert(clicks<=b.bbbv);
  return {clicks,left,right,chord,efficiency:100*b.bbbv/clicks};
}
function mean(xs) {return xs.reduce((a,b)=>a+b,0)/xs.length;}
function round(x) {return +x.toFixed(6);}
function ci(xs) {
  const m=mean(xs), variance=xs.length>1?xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1):0;
  const e=1.96*Math.sqrt(variance/xs.length);
  return [round(m-e),round(m+e)];
}
function quantile(xs,p) {
  const a=[...xs].sort((a,b)=>a-b), k=(a.length-1)*p, lo=Math.floor(k);
  return a[lo]+(a[Math.ceil(k)]-a[lo])*(k-lo);
}
function selfTest() {
  const blank=board(4,4,0,1,[]);
  assert.equal(blank.bbbv,1);
  for(const p of ['random-safe','opening-first','greedy-chord']) assert.equal(solve(blank,p,1).clicks,1);
  const centerMine=board(3,3,1,1,[4]);
  assert.equal(centerMine.bbbv,8);
  for(const p of ['random-safe','opening-first','greedy-chord']) solve(centerMine,p,1);
  for(let seed=1;seed<=50;seed++) {
    const a=board(9,9,10,seed),b=board(9,9,10,seed);
    assert.deepEqual(a.mine,b.mine);
    assert.equal(a.numbers[0],0);
    assert.equal(a.mine.reduce((s,x)=>s+x,0),10);
    for(const p of ['random-safe','opening-first','greedy-chord']) solve(a,p,seed);
  }
}

function run(sampleSize=500) {
  assert(Number.isInteger(sampleSize)&&sampleSize>=2&&sampleSize<=100000);
  selfTest();
  const policies=['random-safe','opening-first','greedy-chord'];
  const levels=[['Beginner',9,9,10],['Intermediate',16,16,40],['Expert',30,16,99]];
  const raw=[],results=[];
  for(let level=0;level<levels.length;level++) {
    const [difficulty,width,height,mines]=levels[level], rows=[];
    for(let k=0;k<sampleSize;k++) {
      const seed=(0x51A7E000+level*100000+k)>>>0;
      const b=board(width,height,mines,seed);
      const scores=Object.fromEntries(policies.map(p=>[p,solve(b,p,seed)]));
      const row={difficulty,seed,bbbv:b.bbbv,scores};
      rows.push(row);raw.push(row);
    }
    const summary={difficulty,width,height,mines,boards:sampleSize,mean3BV:round(mean(rows.map(r=>r.bbbv))),policies:{}};
    for(const p of policies) {
      const clicks=rows.map(r=>r.scores[p].clicks), efficiency=rows.map(r=>r.scores[p].efficiency);
      summary.policies[p]={
        mean3BV:summary.mean3BV,meanClicks:round(mean(clicks)),meanEfficiency:round(mean(efficiency)),
        pooledEfficiency:round(100*rows.reduce((s,r)=>s+r.bbbv,0)/clicks.reduce((s,x)=>s+x,0)),
        minEfficiency:round(Math.min(...efficiency)),maxEfficiency:round(Math.max(...efficiency)),
        medianEfficiency:round(quantile(efficiency,.5)),p10Efficiency:round(quantile(efficiency,.1)),p90Efficiency:round(quantile(efficiency,.9)),
        meanLeft:round(mean(rows.map(r=>r.scores[p].left))),meanRight:round(mean(rows.map(r=>r.scores[p].right))),meanChord:round(mean(rows.map(r=>r.scores[p].chord)))
      };
    }
    const deltas=rows.map(r=>r.scores['greedy-chord'].efficiency-r.scores['opening-first'].efficiency);
    const clickSavings=rows.map(r=>r.scores['opening-first'].clicks-r.scores['greedy-chord'].clicks);
    summary.paired={
      comparator:'greedy-chord minus opening-first on identical boards',
      meanEfficiencyGainPercentagePoints:round(mean(deltas)),approximate95PercentCI:ci(deltas),
      meanClicksSaved:round(mean(clickSavings)),approximate95PercentClicksSavedCI:ci(clickSavings),
      percentBoardsAbove100:round(100*deltas.filter(d=>d>1e-10).length/sampleSize),
      percentClicksSavedPooled:round(100*(1-summary.policies['greedy-chord'].meanClicks/summary.policies['opening-first'].meanClicks))
    };
    results.push(summary);
  }
  const output={
    study:'Oracle comparison of Minesweeper action economy',version:1,sampleSizePerDifficulty:sampleSize,
    totalBoards:raw.length,firstClick:0,firstClickPolicy:'zero-safe corner: clicked cell and its three neighbors excluded from mine placement',
    seedScheme:'uint32(0x51A7E000 + difficultyIndex*100000 + boardIndex)',
    generator:'Mulberry32 with Fisher-Yates shuffle via Math.floor(rng*(i+1)); finite PRNG precision applies',
    information:'All policies know every mine and zero component. Results measure click mechanics, not a solver or player under uncertainty.',
    actions:'1 per left reveal, flag placement, or chord. No no-op or unflag actions; random-safe can reveal opening borders prematurely. Flags are charged when placed, even if reused.',
    ciMethod:'Paired board differences, sample mean ± 1.96 sample standard error; an approximate sampling interval under the generator.',
    results
  };
  const destination=path.resolve(__dirname,'../data');fs.mkdirSync(destination,{recursive:true});
  fs.writeFileSync(path.join(destination,'results.json'),JSON.stringify(output,null,2)+'\n');
  fs.writeFileSync(path.join(destination,'paired-results.json'),JSON.stringify({metadata:output,boards:raw},null,2)+'\n');
  fs.writeFileSync(path.join(destination,'results.js'),'globalThis.MinesweeperExperiment = '+JSON.stringify(output,null,2)+';\n');
  console.log(JSON.stringify(output,null,2));
  return output;
}
if(require.main===module) run(process.argv[2]===undefined?500:Number(process.argv[2]));
module.exports={board,solve,run,selfTest};
