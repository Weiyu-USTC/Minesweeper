(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const presets = { beginner: [9,9,10], intermediate: [16,16,40], expert: [30,16,99] };
  const names = {classic:'Classic',ng:'No guess',nf:'No flags',budget:'Click budget',cross:'Crossfield',knight:'Knightfield'};
  const STORAGE = 'field-notes-minesweeper-v1'+(new URLSearchParams(location.search).has('qa')?'-qa':'');
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch (_) {}
  let history = Array.isArray(saved.history) ? saved.history.slice(0,1000) : [];
  let game, meta, cells=[], recorded=false, generation=0, busy=false, replay=null, suspended=null;
  let touchFlag=false, gesture=null, longPress=null, lastPointer=null, distance=0, toastTimer, hinted=-1;
  const fieldIds=['difficulty','mode','first-click','seed','action-budget','width','height','mines','cell-size','single-chord','press-mode','show-neighbors','sound'];
  for (const id of fieldIds) {
    const el=$(id), value=saved.settings?.[id];
    if(value!==undefined) { if(el.type==='checkbox')el.checked=!!value; else el.value=String(value); }
  }
  const launch=new URLSearchParams(location.search);
  if(Object.hasOwn(names,launch.get('mode')))$('mode').value=launch.get('mode');
  if(['safe','zero'].includes(launch.get('first')))$('first-click').value=launch.get('first');
  if(Object.hasOwn(presets,launch.get('difficulty')))$('difficulty').value=launch.get('difficulty');
  function modeSettings(){ $('budget-settings').hidden=$('mode').value!=='budget'; }
  $('mode').onchange=()=>{modeSettings();persist();};
  function settings() { return Object.fromEntries(fieldIds.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value])); }
  function persist() {
    try { localStorage.setItem(STORAGE,JSON.stringify({settings:settings(),history})); }
    catch (_) { toast('Browser storage is unavailable or full. Export your results to keep them.'); }
  }
  function toast(message) { $('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500); }
  function showTab(name) {
    if(!['play','learn','history','variants'].includes(name))name='play';
    document.querySelectorAll('.tab-panel').forEach(el=>el.hidden=el.id!=='tab-'+name);
    document.querySelectorAll('[data-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.tab===name);el.setAttribute('aria-current',el.dataset.tab===name?'page':'false');});
    if(name==='history')renderHistory();
    try { window.history.replaceState(null,'','#'+name); } catch (_) {}
  }
  document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>showTab(el.dataset.tab));
  document.querySelectorAll('[data-goto]').forEach(el=>el.onclick=()=>showTab(el.dataset.goto));
  function applySize() { const size=Math.max(18,Math.min(36,Number($('cell-size').value)||24));document.documentElement.style.setProperty('--cell',size+'px');$('size-label').value=size+'px'; }
  $('cell-size').oninput=()=>{applySize();persist();};
  $('difficulty').onchange=()=>{ $('custom-fields').hidden=$('difficulty').value!=='custom';persist(); };
  for (const id of ['single-chord','press-mode','show-neighbors','sound'])$(id).onchange=persist;
  $('focus-mode').onclick=()=>{document.body.classList.toggle('focus');toast('Focus view. Press Escape to return.');};
  function configFromForm() {
    const difficulty=$('difficulty').value;
    const [width,height,mines]=presets[difficulty]||['width','height','mines'].map(id=>Number($(id).value));
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<5||width>60||height<5||height>40)throw new Error('Choose a width from 5–60 and a height from 5–40, using whole numbers.');
    const mode=$('mode').value,topology=['cross','knight'].includes(mode)?mode:'classic';
    const firstClick=$('first-click').value;
    const reserve=firstClick==='zero'?(topology==='cross'?5:9):1;
    if(!Number.isInteger(mines)||mines<1||mines>width*height-reserve)throw new Error('Use 1–'+(width*height-reserve)+' mines so the selected first-reveal protection fits anywhere.');
    if(mode==='ng'&&(width*height>480||mines/(width*height)>.25))throw new Error('No-guess generation supports at most 480 cells and 25% mine density. Reduce the custom field or choose Classic.');
    const actionLimit=mode==='budget'?Number($('action-budget').value):null;
    if(actionLimit!==null&&(!Number.isInteger(actionLimit)||actionLimit<1||actionLimit>100000))throw new Error('Choose a whole action budget from 1 to 100,000.');
    return {width,height,mines,actionLimit,seed:$('seed').value.trim()||freshSeed(),topology,firstClick,noFlags:mode==='nf',mode,difficulty};
  }
  function freshSeed(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID().slice(0,13):Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);}
  function resetLocal() {recorded=false;hinted=-1;distance=0;lastPointer=null;gesture=null;clearTimeout(longPress);$('hint-message').hidden=true;$('replay-controls').hidden=true;touchFlag=false;renderFlagMode();}
  function record(outcome) {
    if(recorded||replay||!game||!game.totalClicks)return;
    recorded=true;
    const stats=game.stats();
    history.unshift({id:freshSeed(),date:new Date().toISOString(),outcome,mode:meta.mode,difficulty:meta.difficulty,assisted:meta.assisted,retried:meta.retried,pointerDistance:Math.round(distance),...stats,status:outcome,replay:game.exportReplay()});
    history=history.slice(0,1000);persist();
  }
  async function newGame(config, retryData) {
    let cfg;
    try {cfg=config||configFromForm();}catch(error){toast(error.message);return;}
    if(replay)exitReplay(false);
    record('abandoned');
    const token=++generation;busy=false;resetLocal();
    meta={mode:cfg.mode||'classic',difficulty:cfg.difficulty||'custom',assisted:false,retried:!!retryData};
    game=new MinesEngine.Game({...cfg,...(retryData?.mineIndices?{mineIndices:retryData.mineIndices}:{})});
    if(retryData){game.certified=!!retryData.certified;game.requiredStart=retryData.requiredStart??retryData.actions.find(a=>a.type==='left')?.index??null;}
    createBoard();render();persist();
    if(meta.mode==='ng'&&!retryData) {
      busy=true;setStatus('Finding a field solvable by visible logic…');$('run-indicator').textContent='◌ GENERATING';
      await new Promise(resolve=>setTimeout(resolve,20));
      const current=game;
      try {
        const result=await current.generateNoGuess(0,{maxAttempts:250,isCancelled:()=>token!==generation,onProgress:({attempts})=>{if(token===generation)setStatus('Checking no-guess field '+attempts+' / 250…');}});
        if(token!==generation)return;
        busy=false;
        if(!result.success){setStatus('No certified field found. Choose New field to try another seed.');busy=true;toast('No-guess search ended without a certified board. No uncertified game was started.');return;}
        render();setStatus('Logic-certified field. Start at the green dot in the top-left corner.');
      } catch(error){if(token===generation){busy=true;setStatus('Generation failed: '+error.message);}}
    }
  }
  function createBoard() {
    const board=$('board');board.replaceChildren();board.style.gridTemplateColumns='repeat('+game.width+', var(--cell))';board.setAttribute('aria-rowcount',game.height);board.setAttribute('aria-colcount',game.width);
    cells=Array.from({length:game.size},(_,i)=>{
      const el=document.createElement('button');el.type='button';el.className='cell';el.dataset.index=i;el.setAttribute('role','gridcell');el.setAttribute('aria-rowindex',Math.floor(i/game.width)+1);el.setAttribute('aria-colindex',i%game.width+1);el.tabIndex=i===0?0:-1;board.append(el);return el;
    });
    $('field-title').textContent=meta.difficulty.charAt(0).toUpperCase()+meta.difficulty.slice(1);
    $('field-spec').textContent=game.width+' × '+game.height+' / '+game.mines+' mines';
    $('mode-badge').textContent=(names[meta.mode]||meta.mode).toUpperCase();
  }
  function setStatus(text){$('status').textContent=text;}
  function renderCell(i) {
    const el=cells[i],end=game.generated&&['won','lost','exhausted'].includes(game.status),mine=game.mineMask[i],flag=game.flags[i],open=game.revealed[i];
    let text='',label='covered',cls='cell';
    if(open&&!mine){cls+=' revealed';text=game.numbers[i]||'';label=text?text+' adjacent mines':'empty';el.dataset.number=game.numbers[i];}
    else {delete el.dataset.number;if(flag){cls+=' flagged';text='⚑';label='flagged';}}
    if(end&&mine&&!flag){cls+=' revealed';text=game.status==='won'?'⚑':'✹';label='mine';}
    if(end&&flag&&!mine){cls+=' wrong';text='×';label='incorrect flag';}
    if(i===game.exploded)cls+=' exploded';
    if(i===hinted)cls+=' hinted';
    if(game.status==='ready'&&game.requiredStart===i)cls+=' start';
    el.className=cls;el.textContent=text;el.setAttribute('aria-label','Row '+(Math.floor(i/game.width)+1)+', column '+(i%game.width+1)+': '+label);
  }
  function render() {
    cells.forEach((_,i)=>renderCell(i));renderStats();
    $('mine-counter').textContent=game.status==='won'?'000':String(Math.max(-99,Math.min(999,game.mines-game.flagCount))).padStart(3,'0');
    $('smile').textContent=game.status==='won'?'😎':game.status==='lost'?'😵':game.status==='exhausted'?'😐':'🙂';
    $('run-indicator').textContent=replay?'▷ REPLAY':({ready:'○ READY',playing:'● PLAYING',won:'✓ CLEARED',lost:'× FINISHED',exhausted:'◇ BUDGET USED'}[game.status]);
    if(replay)setStatus('Replay · use the slider to inspect every action.');
    else if(game.status==='won')setStatus('Field cleared. '+game.stats().efficiency.toFixed(1)+'% efficiency'+(meta.assisted?' · assisted':'')+(meta.retried?' · retry':'')+'.');
    else if(game.status==='exhausted')setStatus('Action budget used. Retry this field to find a cheaper route.');
    else if(game.status==='lost')setStatus('A mine. Review the field, or retry the same layout.');
    else if(game.status==='ready')setStatus(game.requiredStart!==null?'Start at the green dot to replay the same opening.':'Your first move is safe. Pick a square.');
    else setStatus((names[meta.mode]||'Classic')+' · seed '+game.seed+(meta.assisted?' · assisted':'')+(meta.retried?' · retry':''));
  }
  function renderStats() {
    if(!game)return;
    $('budget-meter').hidden=game.actionLimit===null;
    if(game.actionLimit!==null)$('budget-meter').textContent='Action budget: '+Math.max(0,game.actionLimit-game.totalClicks)+' remaining of '+game.actionLimit+(game.status==='won'?' · cleared within budget':game.status==='exhausted'?' · run ended':'');
    const s=game.stats(),ended=game.generated&&['won','lost','exhausted'].includes(game.status),won=game.status==='won';
    $('stat-time').textContent=s.seconds.toFixed(3);$('classic-timer').textContent=String(Math.min(999,Math.floor(s.seconds))).padStart(3,'0');
    $('stat-eff').textContent=won?s.efficiency.toFixed(1)+'%':'—';
    $('eff-caption').textContent=won?'3BV ÷ all actions × 100%':ended?'Unfinished board · no final score':'Final score after a win';
    $('stat-actions').textContent=s.clicks;$('stat-bv').textContent=ended?s.bbbv:'—';$('bv-caption').textContent=ended?'board':'at finish';
    $('stat-bvs').textContent=ended&&s.seconds?s.bbbvs.toFixed(2):'—';$('stat-aps').textContent=s.seconds?s.cps.toFixed(2):'—';
    for(const key of ['left','right','chord','wasted'])$('stat-'+key).textContent=s[key];
    $('stat-cleared').textContent=s.revealed+' / '+s.safeCells;$('stat-distance').textContent=Math.round(distance).toLocaleString()+' px';
  }
  let audioCtx;
  function sound(outcome) {
    if(!$('sound').checked)return;
    try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const oscillator=audioCtx.createOscillator(),gain=audioCtx.createGain();oscillator.connect(gain);gain.connect(audioCtx.destination);oscillator.type='sine';oscillator.frequency.value=outcome==='lost'?120:outcome==='won'?660:420;gain.gain.setValueAtTime(.025,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.08);oscillator.start();oscillator.stop(audioCtx.currentTime+.08);}catch(_){}
  }
  function act(type,index) {
    if(busy||replay||!game)return;
    if(type==='flag'&&game.noFlags){toast('Flags are disabled in No flags mode.');return;}
    hinted=-1;const result=game[type==='flag'?'toggleFlag':type==='chord'?'chord':'reveal'](index);
    if(result.requiredStart!==undefined){toast('Start at the green dot to preserve this board.');return;}
    if(result.ignored)return;
    render();if(result.changed.length)sound(game.status);
    if(['won','lost','exhausted'].includes(game.status))record(game.status);
  }
  function leftAction(index){act(touchFlag&&!game.revealed[index]?'flag':game.revealed[index]&&$('single-chord').checked?'chord':'reveal',index);}
  const board=$('board');
  function eventIndex(e){const cell=e.target.closest('.cell');return cell?Number(cell.dataset.index):null;}
  board.addEventListener('contextmenu',e=>e.preventDefault());
  // Mouse Events report the second button of a chord even when Pointer Events do not.
  board.addEventListener('mousedown',e=>{
    const index=eventIndex(e);
    if(index!==null&&(e.buttons&3)===3&&gesture&&!gesture.handled){e.preventDefault();gesture.chord=true;gesture.handled=true;act('chord',index);}
  });
  board.addEventListener('pointerdown',e=>{
    const index=eventIndex(e);if(index===null||busy||replay)return;if(e.pointerType==='touch')e.preventDefault();
    cells.forEach(el=>el.tabIndex=-1);cells[index].tabIndex=0;cells[index].focus({preventScroll:true});
    if(!gesture)gesture={index,handled:false,chord:false};
    if(e.pointerType==='touch'){
      gesture.touch=true;gesture.x=e.clientX;gesture.y=e.clientY;
      longPress=setTimeout(()=>{if(gesture){act('flag',index);gesture.handled=true;}},420);
    }else if(e.button===1||(e.buttons&3)===3){clearTimeout(longPress);gesture.chord=true;if(!gesture.handled){act('chord',index);gesture.handled=true;}}
    else if(e.button===0&&$('press-mode').checked&&!game.revealed[index]){leftAction(index);gesture.handled=true;}
    if(!gesture.handled){cells[index].classList.add('pressed');if(game.status==='playing'||game.status==='ready')$('smile').textContent='😮';}
  });
  document.addEventListener('pointerup',e=>{
    if(!gesture)return;clearTimeout(longPress);
    const index=eventIndex(e),g=gesture;
    if(index===g.index&&!g.handled){if(e.button===2)act('flag',index);else if(e.button===0||g.touch)leftAction(index);g.handled=true;}
    if(!e.buttons){gesture=null;cells.forEach(el=>el.classList.remove('pressed'));$('smile').textContent=game.status==='won'?'😎':game.status==='lost'?'😵':game.status==='exhausted'?'😐':'🙂';}
  });
  document.addEventListener('pointercancel',()=>{clearTimeout(longPress);gesture=null;cells.forEach(el=>el.classList.remove('pressed'));});
  board.addEventListener('pointermove',e=>{
    if(gesture&&!gesture.handled&&(e.buttons&3)===3){gesture.chord=true;gesture.handled=true;act('chord',gesture.index);}
    if(gesture?.touch&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>12){clearTimeout(longPress);gesture.handled=true;}
    if(game?.status==='playing'&&!replay){if(lastPointer)distance+=Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y);lastPointer={x:e.clientX,y:e.clientY};}
    const index=eventIndex(e);showNeighbors(index);
  });
  board.addEventListener('pointerleave',()=>{lastPointer=null;showNeighbors(null);});
  board.addEventListener('focusin',e=>showNeighbors(eventIndex(e)));
  function showNeighbors(index){cells.forEach(el=>el.classList.remove('neighbor'));if(index!==null&&($('show-neighbors').checked||game.topology==='knight'))for(const i of game.neighbors[index])cells[i].classList.add('neighbor');}
  board.addEventListener('keydown',e=>{
    const index=eventIndex(e);if(index===null)return;
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-game.width,ArrowDown:game.width}[e.key];
    if(delta!==undefined){e.preventDefault();const next=Math.min(game.size-1,Math.max(0,index+delta));cells[index].tabIndex=-1;cells[next].tabIndex=0;cells[next].focus();}
    else if(e.key==='f'||e.key==='F'){e.preventDefault();act('flag',index);}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();leftAction(index);}
    else if(e.key==='c'||e.key==='C'){e.preventDefault();act('chord',index);}
  });
  document.addEventListener('keydown',e=>{if(e.key==='F2'){e.preventDefault();newGame();}if(e.key==='Escape')document.body.classList.remove('focus');});
  function renderFlagMode(){$('touch-flag').textContent='⚑ Flag mode: '+(touchFlag?'on':'off');$('touch-flag').setAttribute('aria-pressed',String(touchFlag));}
  $('touch-flag').onclick=()=>{touchFlag=!touchFlag;renderFlagMode();};
  $('new-game').onclick=()=>newGame();$('smile').onclick=()=>newGame();
  $('retry').onclick=()=>{
    if(!game.generated){toast('Reveal a square first to create a repeatable layout.');return;}
    const source=replay?MinesEngine.Game.fromReplay(replay):game;
    const data=source.exportReplay(),cfg={...data.config,mode:meta.mode,difficulty:meta.difficulty};data.requiredStart=source.requiredStart??source.firstIndex;newGame(cfg,data);
  };
  $('hint').onclick=()=>{
    if(busy||replay||!['ready','playing'].includes(game.status))return;
    const hint=game.hint();
    if(hint.type!=='none'){meta.assisted=true;hinted=hint.index;render();}
    $('hint-message').hidden=false;$('hint-message').textContent=(hint.index!==undefined?'Row '+(Math.floor(hint.index/game.width)+1)+', column '+(hint.index%game.width+1)+': '+(hint.type==='flag'?'place a flag. ':hint.type==='unflag'?'remove the flag. ':'safe to reveal. '):'')+hint.reason+(hint.type!=='none'?' This run is marked assisted.':'');
  };
  function download(filename,text,type){const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('save-replay').onclick=()=>{if(!game.generated){toast('Make a first reveal before saving a replay.');return;}download('minesweeper-'+game.seed.replace(/[^a-z0-9-]/gi,'_')+'.json',JSON.stringify({ ...game.exportReplay(),fieldNotes:{mode:meta.mode,difficulty:meta.difficulty,assisted:meta.assisted,retried:meta.retried}},null,2),'application/json');};
  $('load-replay').onclick=()=>$('replay-file').click();
  $('replay-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>8*1024*1024)throw new Error('Replay is too large (maximum 8 MB).');const data=JSON.parse(await file.text());MinesEngine.Game.fromReplay(data);openReplay(data);}
    catch(error){toast('Could not open replay: '+error.message);}e.target.value='';
  };
  function openReplay(data,recordMeta){
    if(busy){toast('Finish or cancel generation before opening a replay.');return;}
    if(!replay)suspended={game,meta,recorded,distance};
    replay=data;hinted=-1;$('hint-message').hidden=true;meta=recordMeta||data.fieldNotes||{mode:data.config.topology==='classic'?(data.config.noFlags?'nf':'classic'):data.config.topology,difficulty:'custom'};
    $('replay-slider').max=data.actions.length;$('replay-slider').value=data.actions.length;showReplayFrame();$('replay-controls').hidden=false;showTab('play');
  }
  function showReplayFrame(){game=MinesEngine.Game.fromReplay(replay,Number($('replay-slider').value));distance=0;createBoard();render();$('replay-position').textContent=$('replay-slider').value+' / '+replay.actions.length+' actions';}
  $('replay-slider').oninput=showReplayFrame;
  $('exact-demo').onclick=()=>{
    const demo=MinesEngine.Game.fromLayout(4,4,[6,8,14],{seed:'exact-seven-action-example'});
    for(const [method,index] of [['reveal',0],['reveal',7],['reveal',12],['toggleFlag',6],['chord',7],['toggleFlag',14],['chord',10]])demo[method](index);
    const data=demo.exportReplay();data.actions.forEach((action,i)=>action.timeMs=(i+1)*1000);data.elapsedMs=7000;
    openReplay(data,{mode:'classic',difficulty:'demonstration',assisted:true,retried:false});
    $('hint-message').hidden=false;$('hint-message').textContent='Known-layout demonstration: 3BV 10, seven actions, 142.86% efficiency. Timing is illustrative at one second per action. This is not a speed record. Move the replay slider left to inspect the setup.';
  };
  function exitReplay(renderAgain=true){if(!replay)return;({game,meta,recorded,distance}=suspended);replay=null;suspended=null;$('replay-controls').hidden=true;if(renderAgain){createBoard();render();}}
  $('exit-replay').onclick=()=>exitReplay();
  function filteredHistory(){return history.filter(row=>($('history-filter').value==='all'||row.mode===$('history-filter').value)&&($('history-difficulty').value==='all'||row.difficulty===$('history-difficulty').value));}
  function cell(text){const el=document.createElement('td');el.textContent=text;return el;}
  function renderHistory(){
    const rows=filteredHistory(),wins=rows.filter(r=>r.outcome==='won'),eligible=wins.filter(r=>!r.assisted&&!r.retried),bestTime=eligible.length?Math.min(...eligible.map(r=>r.seconds)):null,bestEff=eligible.length?Math.max(...eligible.map(r=>r.efficiency)):null;
    $('history-summary').replaceChildren();
    [['Attempts',rows.length],['Win rate',rows.length?(100*wins.length/rows.length).toFixed(1)+'%':'—'],['Best time',bestTime===null?'—':bestTime.toFixed(3)+' s'],['Best efficiency',bestEff===null?'—':bestEff.toFixed(1)+'%']].forEach(([label,value])=>{const wrap=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=value;wrap.append(span,strong);$('history-summary').append(wrap);});
    $('history-body').replaceChildren();$('history-empty').hidden=rows.length>0;
    rows.forEach(row=>{
      const tr=document.createElement('tr');const when=new Date(row.date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      tr.append(cell(when),cell((names[row.mode]||row.mode)+' · '+row.width+'×'+row.height),cell(row.outcome+(row.assisted?' · assisted':'')+(row.retried?' · retry':'')),cell(row.seconds.toFixed(3)+' s'),cell(row.bbbv),cell(row.clicks),cell(row.outcome==='won'?row.efficiency.toFixed(1)+'%':'—'));
      const td=cell(''),button=document.createElement('button');button.className='text-button';button.textContent='Replay ↗';button.onclick=()=>openReplay(row.replay,{mode:row.mode,difficulty:row.difficulty,assisted:row.assisted,retried:row.retried});td.append(button);tr.append(td);$('history-body').append(tr);
    });
  }
  $('history-filter').onchange=renderHistory;$('history-difficulty').onchange=renderHistory;
  $('export-history').onclick=()=>{
    const columns=['date','outcome','mode','difficulty','width','height','mines','seed','firstClick','actionLimit','actionsRemaining','assisted','retried','seconds','bbbv','solvedBBBV','clicks','left','right','chord','wasted','effective','efficiency','bbbvs','cps','effectiveActionRatio','flags','revealed','safeCells','openings','isolated','pointerDistance'];
    const csvValue=value=>{let text=String(value??'');if(/^[=+@\-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
    const text=[columns.join(','),...filteredHistory().map(row=>columns.map(key=>csvValue(key==='efficiency'&&row.outcome!=='won'?'':key==='effectiveActionRatio'?row.ioe:row[key])).join(','))].join('\r\n');download('minesweeper-statistics.csv',text,'text/csv;charset=utf-8');
  };
  function updateLab(){const units=Number($('lab-units').value),flags=Number($('lab-flags').value),savings=units-flags-1;$('lab-units-out').value=units;$('lab-flags-out').value=flags;$('lab-result').textContent=savings>0?'Save '+savings+' action'+(savings===1?'':'s'):savings===0?'Break even · look for reuse':'Spend '+(-savings)+' extra action'+(savings===-1?'':'s');}
  $('lab-units').oninput=updateLab;$('lab-flags').oninput=updateLab;
  const study=globalThis.MinesweeperExperiment;
  if(study?.results){
    const table=document.createElement('table'),head=document.createElement('thead'),hr=document.createElement('tr');['500 boards each','Random safe','Opening-first NF','Selective chords'].forEach(text=>{const th=document.createElement('th');th.textContent=text;hr.append(th);});head.append(hr);table.append(head);
    const body=document.createElement('tbody');study.results.forEach(result=>{const tr=document.createElement('tr');tr.append(cell(result.difficulty),...['random-safe','opening-first','greedy-chord'].map(policy=>cell(result.policies[policy].meanEfficiency.toFixed(1)+'%')));body.append(tr);});table.append(body);$('experiment-results').replaceChildren(table);
  }
  document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{$('mode').value=el.dataset.mode;modeSettings();if(el.dataset.mode==='knight')$('show-neighbors').checked=true;newGame();showTab('play');});
  window.addEventListener('pagehide',()=>{if(replay)exitReplay(false);record('abandoned');});
  window.addEventListener('pageshow',event=>{if(event.persisted&&recorded&&game?.status==='playing')newGame();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist();});
  modeSettings();applySize();$('custom-fields').hidden=$('difficulty').value!=='custom';updateLab();newGame();showTab(location.hash.slice(1));
  setInterval(renderStats,33);
})();
