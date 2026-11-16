#!/usr/bin/env node
'use strict';
// Exact finite populations; Monte Carlo is only a secondary rejection-sampling check.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const enginePath=path.resolve(__dirname,'../../engine.js');
const {deductions,neighborsFor}=require(enginePath);
const WIDTH=4,HEIGHT=4,N=16,MINES=3,ALL=(1<<N)-1;
const neighbors=neighborsFor(WIDTH,HEIGHT,'classic');
function pop(x){let c=0;for(;x;x&=x-1)c++;return c;}
const neighborMasks=neighbors.map(a=>a.reduce((m,i)=>m|(1<<i),0));
const layouts=[];
for(let mask=0;mask<=ALL;mask++)if(pop(mask)===MINES)layouts.push({mask,numbers:neighborMasks.map(n=>pop(mask&n))});
function open(layout,visible,i){
  assert(!(layout.mask&(1<<i)),'solver attempted a mine');
  const queue=[i];
  while(queue.length){const j=queue.pop();if(visible&(1<<j))continue;visible|=1<<j;
    if(layout.numbers[j]===0)for(const k of neighbors[j])if(!(visible&(1<<k)))queue.push(k);}
  return visible;
}
function consistent(layout,visible,truth){
  if(layout.mask&visible)return false;
  for(let i=0;i<N;i++)if((visible&(1<<i))&&layout.numbers[i]!==truth.numbers[i])return false;
  return true;
}
function direct(visible,truth){
  let safe=0,mines=0;
  for(let pass=0;pass<100;pass++){
    const before=safe|0,oldMines=mines;
    const constraints=[[ALL&~visible,MINES]];
    for(let i=0;i<N;i++)if(visible&(1<<i))constraints.push([neighborMasks[i]&~visible,truth.numbers[i]]);
    for(let [cells,count] of constraints){count-=pop(cells&mines);cells&=~(safe|mines);assert(count>=0&&count<=pop(cells));
      if(count===0)safe|=cells;else if(count===pop(cells))mines|=cells;}
    if(safe===before&&mines===oldMines)break;
  }
  return {safe,mines};
}
function solve(layout,start,method){
  let visible=open(layout,0,start),steps=0;
  const initialCandidates=layouts.filter(x=>consistent(x,visible,layout));
  const initialVisible=visible;
  while(pop(visible)!==N-MINES&&steps++<N){
    let safe=0,mines=0;
    if(method==='direct')({safe,mines}=direct(visible,layout));
    else if(method==='subset'){
      const shown=Array.from({length:N},(_,i)=>!!(visible&(1<<i)));
      const d=deductions(WIDTH,HEIGHT,MINES,shown,layout.numbers.map((n,i)=>shown[i]?n:null),neighbors);
      assert(!d.inconsistent);safe=d.safe.reduce((m,i)=>m|(1<<i),0);mines=d.mines.reduce((m,i)=>m|(1<<i),0);
    }else{
      const candidates=layouts.filter(x=>consistent(x,visible,layout));assert(candidates.length>0);
      const union=candidates.reduce((m,x)=>m|x.mask,0);mines=candidates.reduce((m,x)=>m&x.mask,ALL);safe=ALL&~visible&~union;
    }
    assert(!(safe&layout.mask));assert((mines&layout.mask)===mines);
    if(!safe)break;
    for(let i=0;i<N;i++)if(safe&(1<<i))visible=open(layout,visible,i);
  }
  return {success:pop(visible)===N-MINES,initialCandidates:initialCandidates.length,initialVisible,finalVisible:visible,firstClue:layout.numbers[start]};
}
// Hash-counter stream is deterministic. Integer rejection avoids modulo bias,
// conditional on its 32-bit words being modeled as uniform; it does not prove iid.
function integerStream(seed){let counter=0,pool=Buffer.alloc(0),position=0;
  const word=()=>{if(position>=pool.length){pool=crypto.createHash('sha256').update(seed+':'+counter++).digest();position=0;}
    const n=pool.readUInt32LE(position);position+=4;return n;};
  return bound=>{const limit=Math.floor(4294967296/bound)*bound;let n;do{n=word();}while(n>=limit);return n%bound;};}
function marginal(rows){return Array.from({length:N},(_,i)=>rows.reduce((s,r)=>s+!!(r.mask&(1<<i)),0)/rows.length);}
function mc(rows,accepted,samples=10000){
  const draw=integerStream('no-guess-rejection-v1'),acceptedSet=new Set(accepted.map(r=>r.mask));
  const frequencies=Object.fromEntries(accepted.map(r=>[r.mask,0])),marginalCounts=Array(N).fill(0),attempts=[];
  for(let r=0;r<samples;r++){let t=0,layout;do{t++;layout=rows[draw(rows.length)];}while(!acceptedSet.has(layout.mask));
    attempts.push(t);frequencies[layout.mask]++;for(let i=0;i<N;i++)marginalCounts[i]+=!!(layout.mask&(1<<i));}
  const p=accepted.length/rows.length,exactMarginal=marginal(accepted),empiricalMarginal=marginalCounts.map(c=>c/samples);
  const k=3,capDraw=integerStream('no-guess-cap-v1');let failures=0,capTotal=0;
  for(let r=0;r<samples;r++){let success=false;for(let t=1;t<=k;t++){capTotal++;if(acceptedSet.has(rows[capDraw(rows.length)].mask)){success=true;break;}}if(!success)failures++;}
  return {samples,seed:'no-guess-rejection-v1',p,meanAttempts:attempts.reduce((s,x)=>s+x,0)/samples,theoreticalMeanAttempts:1/p,
    attemptHistogram:Array.from({length:12},(_,j)=>({attempts:j+1,count:attempts.filter(t=>t===j+1).length,expected:samples*p*(1-p)**j})),tailCount:attempts.filter(t=>t>12).length,
    empiricalMarginal,exactMarginal,maxAbsoluteMarginalError:Math.max(...empiricalMarginal.map((v,i)=>Math.abs(v-exactMarginal[i]))),
    totalVariationOnLayouts:.5*Object.values(frequencies).reduce((s,c)=>s+Math.abs(c/samples-1/accepted.length),0),frequencies,
    cap:{K:k,samples,failures,empiricalFailure:failures/samples,theoreticalFailure:(1-p)**k,empiricalMeanAttempts:capTotal/samples,theoreticalMeanAttempts:(1-(1-p)**k)/p}};
}
const scenarios=[];let nonuniqueExample=null,strongerExample=null;
for(const [startLabel,start] of [['corner',0],['interior',5]])for(const protection of ['safe','zero']){
  const excluded=(1<<start)|(protection==='zero'?neighborMasks[start]:0),eligible=layouts.filter(x=>!(x.mask&excluded));
  const records=eligible.map(layout=>({mask:layout.mask,solvers:Object.fromEntries(['direct','subset','exact'].map(method=>[method,solve(layout,start,method)]))}));
  const methods={};
  for(const method of ['direct','subset','exact']){
    const accepted=records.filter(r=>r.solvers[method].success),row={accepted:accepted.length,total:eligible.length,p:accepted.length/eligible.length,
      meanAttempts:accepted.length?eligible.length/accepted.length:null,
      positiveStartAccepted:accepted.filter(r=>r.solvers[method].firstClue>0).length,
      zeroStartAccepted:accepted.filter(r=>r.solvers[method].firstClue===0).length,
      marginal:accepted.length?marginal(accepted):null,acceptedMasks:accepted.map(r=>r.mask)};
    methods[method]=row;
  }
  for(const r of records){assert(!r.solvers.direct.success||r.solvers.subset.success);assert(!r.solvers.subset.success||r.solvers.exact.success);
    if(!nonuniqueExample&&r.solvers.subset.success&&r.solvers.subset.initialCandidates>1)nonuniqueExample={start,protection,...r};
    if(!strongerExample&&!r.solvers.subset.success&&r.solvers.exact.success)strongerExample={start,protection,...r};}
  scenarios.push({startLabel,start,protection,excludedMask:excluded,eligible:eligible.length,baselineMarginal:marginal(eligible),methods});
}
const primary=scenarios.find(s=>s.startLabel==='corner'&&s.protection==='zero');
const primaryRows=layouts.filter(x=>!(x.mask&primary.excludedMask)),primaryAccepted=primaryRows.filter(x=>primary.methods.subset.acceptedMasks.includes(x.mask));
const simulation=mc(primaryRows,primaryAccepted);
let posteriorExample=null;
for(const truth of primaryAccepted){
  const visible=open(truth,0,primary.start);
  const c=primaryRows.filter(l=>consistent(l,visible,truth)),a=primaryAccepted.filter(l=>consistent(l,visible,truth));
  const p=marginal(c),q=marginal(a),delta=Math.max(...p.map((v,i)=>Math.abs(v-q[i])));
  if(!posteriorExample||delta>posteriorExample.maxChange)posteriorExample={mask:truth.mask,visibleMask:visible,
    clueConsistentLayouts:c.length,ngConsistentLayouts:a.length,clueOnlyMarginal:p,generatorAwareMarginal:q,maxChange:delta};
}
const standardOpeningProbabilities=[['Beginner',81,10],['Intermediate',256,40],['Expert',480,99]].map(([name,n,m])=>{
  let p=1;for(let j=0;j<3;j++)p*=(n-1-m-j)/(n-1-j);
  return {name,N:n,mines:m,cornerZeroGivenSafe:p,idealProposalSpeedup:1/p};
});
const output={date:'2026-10-26',width:WIDTH,height:HEIGHT,mines:MINES,layoutPopulation:layouts.length,
  engineSha256:crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex'),
  deductionsSha256:crypto.createHash('sha256').update(String(deductions)).digest('hex'),
  method:'Exact enumeration over every fixed-mine layout; classic 8-neighborhood; zero flood; public total count. Direct rules and exact consistency solver are independent; subset calls the app deductions function.',
  scenarios,nonuniqueExample,strongerExample,posteriorExample,standardOpeningProbabilities,simulation};
fs.mkdirSync(path.join(__dirname,'data'),{recursive:true});fs.writeFileSync(path.join(__dirname,'data/results.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({scenarios:scenarios.map(s=>({start:s.startLabel,protection:s.protection,eligible:s.eligible,methods:Object.fromEntries(Object.entries(s.methods).map(([k,v])=>[k,{accepted:v.accepted,p:v.p,positiveStartAccepted:v.positiveStartAccepted}]))})),nonuniqueExample,strongerExample,simulation:{meanAttempts:simulation.meanAttempts,theoreticalMeanAttempts:simulation.theoreticalMeanAttempts,maxAbsoluteMarginalError:simulation.maxAbsoluteMarginalError,cap:simulation.cap}},null,2));
