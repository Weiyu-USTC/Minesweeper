#!/usr/bin/env node
'use strict';
// Independent first-reveal experiment; does not import the game or earlier study.
// Usage: node initial-position-study.cjs [replicates per condition, default 5000]
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function generator(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return(t^(t>>>14))>>>0;};}
function integer(next,n){const limit=Math.floor(4294967296/n)*n;let x;do{x=next();}while(x>=limit);return x%n;}
function neighbors(w,h){return Array.from({length:w*h},(_,i)=>{const ns=[],x=i%w,y=Math.floor(i/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)ns.push((y+dy)*w+x+dx);return ns;});}
function sample(w,h,m,start,mode,seed,ns){
 const protectedCells=new Set([start,...(mode==='zero-safe'?ns[start]:[])]),candidates=[];
 for(let i=0;i<w*h;i++)if(!protectedCells.has(i))candidates.push(i);
 assert(candidates.length>=m);const next=generator(seed);
 for(let i=candidates.length-1;i>0;i--){const j=integer(next,i+1);[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 const mines=new Uint8Array(w*h);for(let k=0;k<m;k++)mines[candidates[k]]=1;
 assert(!mines[start]);assert.equal(mines.reduce((a,b)=>a+b,0),m);
 const numbers=ns.map(xs=>xs.reduce((a,i)=>a+mines[i],0)),seen=new Uint8Array(w*h),stack=[start];let count=0;
 while(stack.length){const i=stack.pop();if(seen[i])continue;assert(!mines[i]);seen[i]=1;count++;if(numbers[i]===0)for(const j of ns[i])if(!seen[j])stack.push(j);}
 if(mode==='zero-safe')assert.equal(numbers[start],0);
 return {zero:numbers[start]===0?1:0,revealed:count};
}
function theory(n,m,d){let p=1;for(let j=0;j<d;j++)p*=1-m/(n-1-j);return p;}
function summary(xs){const n=xs.length,mean=xs.reduce((a,b)=>a+b,0)/n,variance=xs.reduce((a,x)=>a+(x-mean)**2,0)/(n-1),se=Math.sqrt(variance/n);return {mean,sd:Math.sqrt(variance),se,ci95:[mean-1.96*se,mean+1.96*se]};}
function wilson(successes,n){const z=1.96,p=successes/n,den=1+z*z/n,center=(p+z*z/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;return [center-half,center+half];}
function run(replicates=5000){
 assert(Number.isInteger(replicates)&&replicates>=100&&replicates<=100000);
 assert.equal(theory(81,0,8),1);assert(theory(81,10,3)>theory(81,10,5));
 const rows=[],raw=['difficulty,mode,position,seed,zero,revealed'];
 const levels=[['Beginner',9,9,10],['Intermediate',16,16,40],['Expert',30,16,99]];
 for(let level=0;level<3;level++){
  const [difficulty,width,height,mines]=levels[level],ns=neighbors(width,height);
  const starts=[['corner',0],['edge',Math.floor(width/2)],['center',Math.floor(height/2)*width+Math.floor(width/2)]];
  for(let modeIndex=0;modeIndex<2;modeIndex++)for(let positionIndex=0;positionIndex<3;positionIndex++){
   const mode=['safe-only','zero-safe'][modeIndex],[position,start]=starts[positionIndex],samples=[];
   const base=(0x7C190000+level*2000000+modeIndex*500000+positionIndex*100000)>>>0;
   for(let j=0;j<replicates;j++){const seed=(base+j)>>>0,result=sample(width,height,mines,start,mode,seed,ns);samples.push(result);raw.push([difficulty,mode,position,seed,result.zero,result.revealed].join(','));}
   const successes=samples.reduce((a,x)=>a+x.zero,0),mean=summary(samples.map(x=>x.revealed));
   rows.push({difficulty,width,height,mines,mode,position,start,degree:ns[start].length,replicates,seedBase:base,zeroCount:successes,zeroEstimate:successes/replicates,zeroTheory:mode==='zero-safe'?1:theory(width*height,mines,ns[start].length),zeroCI95:mode==='zero-safe'?[1,1]:wilson(successes,replicates),revealed:mean});
  }
 }
 const output={study:'Initial reveal by starting position and protection rule',date:'2026-10-26',replicatesPerCondition:replicates,totalBoards:18*replicates,seedScheme:'uint32(0x7C190000 + level*2000000 + modeIndex*500000 + positionIndex*100000 + replicate)',generator:'Mulberry32 uint32, rejection-sampled bounded integers, Fisher-Yates shuffle. Rejection avoids bounded-integer modulo bias under ideal uniform uint32 draws; finite deterministic PRNG limitations remain.',positions:'corner=(0,0); edge=(floor(width/2),0); center=(floor(width/2),floor(height/2)); coordinates zero-based (x,y)',models:'Uniform mines on all cells except clicked cell (safe-only), or clicked cell plus its neighbors (zero-safe). These are different conditional layout distributions.',intervals:'Zero probability: Wilson 95% (z=1.96) for safe-only; zero-safe [1,1] is an exact design property. Mean revealed count: mean +/-1.96 sample SE. Intervals reflect Monte Carlo variation under the model, not human outcome uncertainty.',results:rows};
 fs.writeFileSync(path.join(__dirname,'initial-position-results.json'),JSON.stringify(output,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'initial-position-raw.csv'),raw.join('\n')+'\n');
 fs.writeFileSync(path.join(__dirname,'initial-position-plot.dat'),'level position safe_mean safe_lo safe_hi zero_mean zero_lo zero_hi\n'+levels.flatMap(([difficulty],level)=>['corner','edge','center'].map((position,pi)=>{const a=rows.find(x=>x.difficulty===difficulty&&x.position===position&&x.mode==='safe-only'),b=rows.find(x=>x.difficulty===difficulty&&x.position===position&&x.mode==='zero-safe');return[level,pi,a.revealed.mean,...a.revealed.ci95,b.revealed.mean,...b.revealed.ci95].join(' ');})).join('\n')+'\n');
 const panels=levels.map(([difficulty],level)=>'\\nextgroupplot[title={'+difficulty+'}'+(level===0?',ylabel={Mean cells revealed},legend to name=openinglegend':'')+']\n'+['safe-only','zero-safe'].map((mode,mi)=>'\\addplot+['+(mi===0?'blue!70!black,mark=square*':'green!45!black,mark=*')+',error bars/.cd,y dir=both,y explicit] coordinates {\n'+rows.filter(x=>x.difficulty===difficulty&&x.mode===mode).map((x,pi)=>`(${pi},${x.revealed.mean.toFixed(4)}) +- (0,${(1.96*x.revealed.se).toFixed(4)})`).join('\n')+'\n};\n'+(level===0?'\\addlegendentry{'+(mi===0?'Safe cell only':'Zero guaranteed')+'}\n':'')).join('')).join('\n');
 fs.writeFileSync(path.join(__dirname,'initial-reveal-figure.tex'),'\\begin{tikzpicture}\n\\begin{groupplot}[group style={group size=3 by 1,horizontal sep=0.45cm},width=0.32\\textwidth,height=5.2cm,xmin=-0.2,xmax=2.2,ymin=0,ymax=73,xtick={0,1,2},xticklabels={Corner,Edge,Center},tick label style={font=\\footnotesize},title style={font=\\small},label style={font=\\small},grid=major,grid style={gray!15},legend columns=2,legend style={font=\\small,draw=none}]\n'+panels+'\\end{groupplot}\n\\end{tikzpicture}\n\\par\\smallskip\\ref{openinglegend}\n');
 console.log(JSON.stringify(rows.map(x=>({difficulty:x.difficulty,mode:x.mode,position:x.position,p:x.zeroEstimate,theory:x.zeroTheory,pCI:x.zeroCI95,mean:x.revealed.mean,meanCI:x.revealed.ci95})),null,2));return output;
}
if(require.main===module)run(process.argv[2]===undefined?5000:Number(process.argv[2]));
module.exports={run,theory,sample,neighbors};
