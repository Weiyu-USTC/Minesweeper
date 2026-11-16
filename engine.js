/* Minesweeper Lab: dependency-free deterministic game model. */
(function (root) {
  'use strict';
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  function hash(seed) {
    let h = 2166136261;
    for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function random(seed) {
    let a = hash(seed);
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function neighborsFor(width, height, topology) {
    const offsets = topology === 'cross' ? [[1,0],[-1,0],[0,1],[0,-1]] : topology === 'knight' ? [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]] : [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    return Array.from({length: width * height}, (_, i) => {
      const x = i % width, y = Math.floor(i / width);
      return offsets.map(([dx, dy]) => [x+dx,y+dy]).filter(([a,b]) => a>=0 && b>=0 && a<width && b<height).map(([a,b]) => b*width+a);
    });
  }
  function boardBenchmark(mineMask, numbers, neighbors) {
    const seen = new Set(), openings = [], border = new Set(), singles = [];
    for (let i=0; i<mineMask.length; i++) {
      if (mineMask[i] || numbers[i] !== 0 || seen.has(i)) continue;
      const cells = [], stack = [i]; seen.add(i);
      while (stack.length) {
        const v=stack.pop(); cells.push(v);
        for (const n of neighbors[v]) {
          if (mineMask[n]) continue;
          if (numbers[n] === 0 && !seen.has(n)) { seen.add(n); stack.push(n); }
          else if (numbers[n] > 0) border.add(n);
        }
      }
      openings.push(cells);
    }
    for (let i=0;i<mineMask.length;i++) if (!mineMask[i] && numbers[i] > 0 && !border.has(i)) singles.push(i);
    const openingAreas=openings.map(cells=>Array.from(new Set(cells.flatMap(i=>[i,...neighbors[i].filter(n=>!mineMask[n])]))));
    return {bbbv:openings.length+singles.length, openings, openingAreas, singles};
  }
  // Only revealed clues and the public total mine count enter this solver.
  // User flags are deliberately ignored: a mistaken flag cannot make a hint unsafe.
  function deductions(width, height, totalMines, revealed, visibleNumbers, neighbors) {
    const safe = new Set(), mines = new Set();
    const hidden = Array.from({length:width*height},(_,i)=>i).filter(i=>!revealed[i]);
    let inconsistent = false;
    for (let pass=0; pass<100; pass++) {
      let changed=false;
      const constraints=[], keys=new Set();
      function add(cells, count) {
        cells=cells.filter(i=>!safe.has(i));
        count-=cells.reduce((a,i)=>a+(mines.has(i)?1:0),0);
        cells=cells.filter(i=>!mines.has(i)).sort((a,b)=>a-b);
        if (count<0 || count>cells.length) { inconsistent=true; return; }
        if (!cells.length) return;
        if (count===0 || count===cells.length) {
          const set=count===0?safe:mines;
          for (const i of cells) if (!set.has(i)) {set.add(i);changed=true;}
        } else {
          const key=cells.join(',')+':'+count;
          if (!keys.has(key)) {keys.add(key);constraints.push({cells,count,set:new Set(cells)});}
        }
      }
      for(let i=0;i<revealed.length;i++) if(revealed[i]) add(neighbors[i].filter(n=>!revealed[n]),visibleNumbers[i]);
      add(hidden,totalMines);
      if(inconsistent) break;
      if(changed) continue;
      // A subset of one clue's unknowns can be subtracted from another clue.
      // Limit derived constraints, never infer facts when that limit is reached.
      const initialLength=constraints.length;
      for(let a=0;a<initialLength && constraints.length<1600;a++) {
        for(let b=0;b<initialLength && constraints.length<1600;b++) {
          if(a===b)continue;
          const A=constraints[a],B=constraints[b];
          if(A.cells.length>=B.cells.length || !A.cells.every(i=>B.set.has(i)))continue;
          add(B.cells.filter(i=>!A.set.has(i)), B.count-A.count);
        }
      }
      if(!changed) break;
    }
    return {safe:Array.from(safe),mines:Array.from(mines),inconsistent};
  }
  class Game {
    constructor(options={}) {
      this.width=Number(options.width ?? 9); this.height=Number(options.height ?? 9); this.mines=Number(options.mines ?? 10);
      if(!Number.isInteger(this.width)||!Number.isInteger(this.height)||this.width<1||this.height<1||this.width>80||this.height>80)throw new Error('Board dimensions must be whole numbers from 1 to 80.');
      this.size=this.width*this.height;
      if(!Number.isInteger(this.mines)||this.mines<0||this.mines>=this.size)throw new Error('Mine count must be a whole number below the number of cells.');
      this.seed=String(options.seed ?? Math.floor(Math.random()*0xFFFFFFFF).toString(36));
      this.topology=['classic','cross','knight'].includes(options.topology)?options.topology:'classic';
      this.firstClick=options.firstClick==='safe'?'safe':'zero'; this.noFlags=!!options.noFlags;
      this.actionLimit=options.actionLimit??null;
      if(this.actionLimit!==null&&(!Number.isInteger(this.actionLimit)||this.actionLimit<1||this.actionLimit>100000))throw new Error('Action budget must be a whole number from 1 to 100,000.');
      this.neighbors=neighborsFor(this.width,this.height,this.topology);
      this.mineMask=Array(this.size).fill(false);this.numbers=Array(this.size).fill(0);
      this.revealed=Array(this.size).fill(false);this.flags=Array(this.size).fill(false);
      this.status='ready';this.generated=false;this.clicks={left:0,right:0,chord:0,wasted:0};this.actions=[];
      this.bbbv=0;this._benchmark={openings:[],openingAreas:[],singles:[]};this._start=null;this._end=null;this._frozenElapsed=null;
      this.exploded=-1;this.firstIndex=null;this.certified=false;this.requiredStart=null;this.zeroFallback=false;this.preset=options.mineIndices!==undefined;
      if(options.mineIndices!==undefined)this._setLayout(options.mineIndices);
    }
    get elapsedMs(){if(this._frozenElapsed!==null)return this._frozenElapsed;return this._start===null?0:Math.max(0,(this._end??now())-this._start);}
    get solvedBBBV(){return this._benchmark.openingAreas.filter(cells=>cells.every(i=>this.revealed[i])).length+this._benchmark.singles.filter(i=>this.revealed[i]).length;}
    get totalClicks(){return this.clicks.left+this.clicks.right+this.clicks.chord;}
    get flagCount(){return this.flags.filter(Boolean).length;}
    get revealedCount(){return this.revealed.filter((v,i)=>v&&!this.mineMask[i]).length;}
    _setLayout(indices){
      if(!Array.isArray(indices)||indices.length!==this.mines||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=this.size))throw new Error('Invalid mine layout.');
      this.mineMask=Array(this.size).fill(false);for(const i of indices)this.mineMask[i]=true;
      this.numbers=this.neighbors.map(ns=>ns.reduce((n,i)=>n+(this.mineMask[i]?1:0),0));
      this._benchmark=boardBenchmark(this.mineMask,this.numbers,this.neighbors);this.bbbv=this._benchmark.bbbv;this.generated=true;
    }
    _generate(index){
      let excluded=new Set([index,...(this.firstClick==='zero'?this.neighbors[index]:[])]);
      if(this.size-excluded.size<this.mines){excluded=new Set([index]);this.zeroFallback=true;}
      const available=Array.from({length:this.size},(_,i)=>i).filter(i=>!excluded.has(i)),rng=random(this.seed);
      for(let i=available.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
      this._setLayout(available.slice(0,this.mines));
    }
    _valid(index){return Number.isInteger(index)&&index>=0&&index<this.size&&['ready','playing'].includes(this.status);}
    _begin(index){if(this._start===null){this._start=now();this.firstIndex=index;this.status='playing';}}
    _open(indices){
      const changed=[],queue=indices.slice();
      while(queue.length && this.status!=='lost'){
        const i=queue.pop();if(this.revealed[i]||this.flags[i])continue;
        this.revealed[i]=true;changed.push(i);
        if(this.mineMask[i]){this.exploded=i;this.status='lost';this._end=now();break;}
        if(this.numbers[i]===0)for(const n of this.neighbors[i])if(!this.revealed[n]&&!this.flags[n])queue.push(n);
      }
      if(this.status!=='lost'&&this.revealedCount===this.size-this.mines){this.status='won';this._end=now();}
      return changed;
    }
    _record(type,index,changed,before){
      if(!changed.length)this.clicks.wasted++;
      if(this.actionLimit!==null&&this.totalClicks>=this.actionLimit&&['ready','playing'].includes(this.status)){this.status='exhausted';this._end=now();}
      const action={type,index,timeMs:Math.round(this.elapsedMs*1000)/1000,changed:changed.slice(),bbbvGain:this.solvedBBBV-before,status:this.status};
      this.actions.push(action);return {changed,status:this.status,action,bbbvGain:action.bbbvGain};
    }
    reveal(index){
      if(!this._valid(index))return {changed:[],ignored:true,status:this.status};
      if(this.requiredStart!==null&&this.status==='ready'&&index!==this.requiredStart)return {changed:[],ignored:true,requiredStart:this.requiredStart,status:this.status};
      const before=this.solvedBBBV;this.clicks.left++;
      if(this.flags[index]||this.revealed[index])return this._record('left',index,[],before);
      if(!this.generated)this._generate(index);this._begin(index);
      return this._record('left',index,this._open([index]),before);
    }
    toggleFlag(index){
      if(!this._valid(index)||this.noFlags)return {changed:[],ignored:true,status:this.status};
      const before=this.solvedBBBV;this.clicks.right++;
      if(this.revealed[index])return this._record('right',index,[],before);
      this.flags[index]=!this.flags[index];return this._record('right',index,[index],before);
    }
    chord(index){
      if(!this._valid(index))return {changed:[],ignored:true,status:this.status};
      const before=this.solvedBBBV;this.clicks.chord++;
      if(!this.revealed[index]||this.numbers[index]===0||this.neighbors[index].filter(i=>this.flags[i]).length!==this.numbers[index])return this._record('chord',index,[],before);
      return this._record('chord',index,this._open(this.neighbors[index].filter(i=>!this.flags[i]&&!this.revealed[i])),before);
    }
    stats(){
      const seconds=this.elapsedMs/1000,total=this.totalClicks,solved=this.solvedBBBV;
      return {status:this.status,width:this.width,height:this.height,mines:this.mines,seed:this.seed,topology:this.topology,noFlags:this.noFlags,
        elapsedMs:this.elapsedMs,seconds,time:seconds,bbbv:this.bbbv,solvedBBBV:solved,
        efficiency:total?100*solved/total:0,bbbvs:seconds?solved/seconds:0,cps:seconds?total/seconds:0,
        clicks:total,left:this.clicks.left,right:this.clicks.right,chord:this.clicks.chord,wasted:this.clicks.wasted,effective:total-this.clicks.wasted,
        ioe:total>this.clicks.wasted?solved/(total-this.clicks.wasted):0,
        flags:this.flagCount,revealed:this.revealedCount,safeCells:this.size-this.mines,
        openings:this._benchmark.openings.length,isolated:this._benchmark.singles.length,certified:this.certified,firstIndex:this.firstIndex,
        actionLimit:this.actionLimit,actionsRemaining:this.actionLimit===null?null:Math.max(0,this.actionLimit-total),firstClick:this.firstClick};
    }
    hint(){
      if(this.status==='ready')return this.preset&&this.requiredStart===null?{type:'none',reason:'This preset has a fixed layout, so first-click protection does not apply.'}:{type:'reveal',index:this.requiredStart??0,reason:'Start here. The first reveal is protected.',initial:true};
      if(this.status!=='playing')return {type:'none',reason:'This game has finished.'};
      const d=deductions(this.width,this.height,this.mines,this.revealed,this.numbers.map((n,i)=>this.revealed[i]?n:null),this.neighbors);
      if(d.inconsistent)return {type:'none',reason:'The visible constraints are inconsistent.'};
      const safe=d.safe.find(i=>!this.flags[i]);
      if(safe!==undefined)return {type:'reveal',index:safe,reason:'This cell is safe by visible clue constraints (including subset and total-mine deductions).',assumesFlags:false};
      const wrong=d.safe.find(i=>this.flags[i]);
      if(wrong!==undefined)return {type:'unflag',index:wrong,reason:'This flagged cell is provably safe from the visible clues.',assumesFlags:false};
      const mine=d.mines.find(i=>!this.flags[i]);
      if(mine!==undefined&&!this.noFlags)return {type:'flag',index:mine,reason:'This cell must contain a mine by the visible clues.',assumesFlags:false};
      return {type:'none',reason:'No forced move was found by the direct and subset solver. Stronger reasoning or a guess may be needed.',assumesFlags:false};
    }
    async generateNoGuess(start=0,{maxAttempts=150,onProgress,signal,isCancelled}={}){
      if(!Number.isInteger(start)||start<0||start>=this.size)throw new Error('Invalid starting cell.');
      if(this.totalClicks||this.status!=='ready')throw new Error('Start a fresh game before generating a no-guess board.');
      if(!Number.isInteger(maxAttempts)||maxAttempts<0||maxAttempts>10000)throw new Error('Search limit must be a whole number from 0 to 10,000.');
      const baseSeed=this.seed;
      const cancelled=()=>!!(signal?.aborted||isCancelled?.());
      for(let attempt=0;attempt<maxAttempts;attempt++){
        // Yield for paint/input each attempt; a cancelled search never installs its board.
        await new Promise(resolve=>setTimeout(resolve,0));
        if(cancelled())return {success:false,cancelled:true,attempts:attempt,start,seed:baseSeed};
        const candidate=new Game({width:this.width,height:this.height,mines:this.mines,seed:baseSeed+':ng:'+attempt,topology:this.topology,firstClick:this.firstClick,noFlags:true});
        candidate.reveal(start);
        let steps=0,lastYield=now();
        while(candidate.status==='playing'&&steps++<this.size){
          const d=deductions(candidate.width,candidate.height,candidate.mines,candidate.revealed,candidate.numbers.map((n,i)=>candidate.revealed[i]?n:null),candidate.neighbors);
          if(!d.safe.length||d.inconsistent)break;
          for(const i of d.safe)if(candidate.status==='playing')candidate.reveal(i);
          if(now()-lastYield>8){await new Promise(resolve=>setTimeout(resolve,0));lastYield=now();}
          if(cancelled())return {success:false,cancelled:true,attempts:attempt+1,start,seed:baseSeed};
        }
        if(cancelled())return {success:false,cancelled:true,attempts:attempt+1,start,seed:baseSeed};
        if(candidate.status==='won'){
          this.seed=candidate.seed;this._setLayout(candidate.mineMask.flatMap((v,i)=>v?[i]:[]));this.zeroFallback=candidate.zeroFallback;
          this.certified=true;this.requiredStart=start;
          return {success:true,attempts:attempt+1,start,seed:this.seed};
        }
        if(onProgress)onProgress({attempts:attempt+1,maxAttempts});
      }
      return {success:false,attempts:maxAttempts,start,seed:baseSeed};
    }
    exportReplay(){return {format:'minesweeper-lab',version:1,config:{width:this.width,height:this.height,mines:this.mines,seed:this.seed,topology:this.topology,firstClick:this.firstClick,noFlags:this.noFlags,actionLimit:this.actionLimit},mineIndices:this.generated?this.mineMask.flatMap((v,i)=>v?[i]:[]):null,certified:this.certified,requiredStart:this.requiredStart,actions:this.actions.map(a=>({type:a.type,index:a.index,timeMs:a.timeMs})),elapsedMs:Math.max(this.elapsedMs,this.actions.at(-1)?.timeMs??0)};}
    static fromLayout(width,height,mineIndices,options={}){return new Game({...options,width,height,mines:mineIndices.length,mineIndices});}
    static fromReplay(replay,upto){
      if(!replay||replay.format!=='minesweeper-lab'||replay.version!==1||!Array.isArray(replay.actions)||replay.actions.length>100000)throw new Error('Unsupported or invalid replay.');
      const config=replay.config;
      if(!config||!Number.isInteger(config.width)||!Number.isInteger(config.height)||!Number.isInteger(config.mines)||typeof config.seed!=='string'||!['classic','cross','knight'].includes(config.topology)||!['safe','zero'].includes(config.firstClick)||typeof config.noFlags!=='boolean'||(replay.mineIndices!==null&&!Array.isArray(replay.mineIndices)))throw new Error('Invalid replay configuration.');
      const game=new Game({...replay.config,...(replay.mineIndices?{mineIndices:replay.mineIndices}:{})});
      if(replay.requiredStart!==null&&replay.requiredStart!==undefined&&(!Number.isInteger(replay.requiredStart)||replay.requiredStart<0||replay.requiredStart>=game.size))throw new Error('Invalid replay starting cell.');
      if(!Number.isFinite(replay.elapsedMs)||replay.elapsedMs<0)throw new Error('Invalid replay time.');
      let previousTime=0;
      for(const action of replay.actions){
        if(!action||!['left','right','chord'].includes(action.type)||!Number.isInteger(action.index)||action.index<0||action.index>=game.size||!Number.isFinite(action.timeMs)||action.timeMs<previousTime)throw new Error('Invalid replay action.');
        previousTime=action.timeMs;
      }
      if(replay.elapsedMs<previousTime)throw new Error('Replay duration precedes its last action.');
      game.certified=!!replay.certified;game.requiredStart=replay.requiredStart??null;
      const count=upto===undefined?replay.actions.length:Math.max(0,Math.min(replay.actions.length,Math.floor(upto)));
      let elapsed=0;
      for(const action of replay.actions.slice(0,count)){
        const result=game[action.type==='left'?'reveal':action.type==='right'?'toggleFlag':'chord'](action.index);
        if(result.ignored)throw new Error('Replay contains an action that the game could not accept.');
        elapsed=action.timeMs;if(game.actions.length)game.actions[game.actions.length-1].timeMs=elapsed;
      }
      game._frozenElapsed=count===replay.actions.length?replay.elapsedMs:elapsed;
      return game;
    }
  }
  const api={Game,random,neighborsFor,boardBenchmark,deductions,version:'1.0.0'};
  root.MinesEngine=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
