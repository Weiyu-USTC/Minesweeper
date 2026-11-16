(function(){
  'use strict';
  const D=window.TutorialData,$=id=>document.getElementById(id),KEY='minesweeper-field-notes-tutorial-v1';
  const lessonIds=new Set(D.lessons.map(l=>l.id));
  let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
  const restoredAnswers=[];
  if(Array.isArray(saved.quizAnswers))for(let i=0;i<Math.min(saved.quizAnswers.length,D.quiz.length);i++){const answer=saved.quizAnswers[i];if(!Number.isInteger(answer)||answer<-1||answer>=D.quiz[i].answers.length)break;restoredAnswers.push(answer);}
  const state={level:Number.isInteger(saved.level)&&saved.level>=0&&saved.level<4?saved.level:0,lesson:lessonIds.has(saved.lesson)?saved.lesson:'basics',quizAnswers:restoredAnswers,completed:{},attempts:{}};
  for(const id of lessonIds){if(saved.completed?.[id]&&typeof saved.completed[id]==='object')state.completed[id]=saved.completed[id];if(Number.isInteger(saved.attempts?.[id])&&saved.attempts[id]>=0)state.attempts[id]=saved.attempts[id];}
  let current=null,quizIndex=state.quizAnswers.length,quizOpen=false,practice=null,practiceTimer=null;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){$('storage-status').textContent='Browser storage is unavailable. Progress lasts for this open page only.';$('storage-status').classList.add('storage-warning');}}
  function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
  function button(text,className,handler){const b=el('button',className,text);b.type='button';b.addEventListener('click',handler);return b;}
  function renderLevels(){
    $('level-cards').replaceChildren();
    D.levels.forEach((level,index)=>{const b=button('',`level-card${state.level===index?' selected':''}`,()=>chooseLevel(index));b.setAttribute('aria-pressed',String(state.level===index));b.append(el('span','level-index',`0${index+1} / ${level.tag.toUpperCase()}`),el('strong','',level.name),el('small','',level.text),el('span','selected-marker',state.level===index?'YOUR CURRENT ROUTE':'CHOOSE THIS ROUTE →'));$('level-cards').append(b);});
    $('route-status').textContent=`Current route: ${D.levels[state.level].name}. Guidance adjusts to your level; all lessons stay open.`;
  }
  function chooseLevel(level){state.level=level;state.lesson=D.levels[level].start;save();renderLevels();renderNav();renderLesson();$('course-title').scrollIntoView({behavior:'smooth',block:'start'});}
  function renderNav(){
    $('lesson-nav').replaceChildren();let last=-1;
    D.lessons.forEach((lesson,index)=>{if(lesson.level!==last){$('lesson-nav').append(el('span','nav-level',D.levels[lesson.level].name));last=lesson.level;}const b=button('',`lesson-link${state.lesson===lesson.id?' active':''}`,()=>{state.lesson=lesson.id;save();renderNav();renderLesson();$('lesson-panel').focus({preventScroll:true});});b.setAttribute('aria-current',state.lesson===lesson.id?'step':'false');b.append(el('span','nav-num',String(index+1).padStart(2,'0')),el('span','nav-title',lesson.title),el('span','nav-check',state.completed[lesson.id]?'✓':''));if(state.completed[lesson.id])b.setAttribute('aria-label',lesson.title+', completed');$('lesson-nav').append(b);});
    $('progress-count').textContent=`${Object.keys(state.completed).length} / ${D.lessons.length}`;
  }
  function feedback(message,type=''){$('lesson-feedback').textContent=message;$('lesson-feedback').className=`feedback${type?' '+type:''}`;}
  function hintsFor(lesson){if(state.level===0)return [lesson.intro,...lesson.hints];if(state.level===1)return lesson.hints;return [state.level===3?lesson.expertHint:lesson.challengeHint,...lesson.hints.slice(1)];}
  function recordCompletion(extra={}){
    if(current.complete)return;current.complete=true;const id=current.lesson.id,previous=state.completed[id];
    state.completed[id]={date:new Date().toISOString(),attempts:state.attempts[id],mistakes:current.mistakes,hints:current.hintsUsed,bestActions:extra.actions!==undefined?Math.min(previous?.bestActions??Infinity,extra.actions):null,...extra};
    save();renderNav();$('lesson-evidence').textContent='✓ Completed in this browser';$('lesson-evidence').className='lesson-evidence';
    const hintText=current.hintsUsed?`${current.hintsUsed} hint${current.hintsUsed===1?'':'s'} used`:'without hints';
    $('lesson-evidence-detail').textContent=`Evidence: completed ${hintText}; ${current.mistakes} incorrect or unproved attempt${current.mistakes===1?'':'s'}${extra.actions!==undefined?`; ${extra.actions} game actions`:''}. Reset the exercise to try again.`;
  }
  function renderLesson(){
    const lesson=D.lessons.find(l=>l.id===state.lesson);state.attempts[lesson.id]=(state.attempts[lesson.id]||0)+1;
    current={lesson,tool:'reveal',hintsUsed:0,mistakes:0,complete:false};save();
    const panel=$('lesson-panel');panel.replaceChildren();
    const top=el('div','lesson-topline');top.append(el('p','eyebrow',lesson.eyebrow));const evidence=el('span','lesson-evidence',state.completed[lesson.id]?'✓ Previously completed':'');evidence.id='lesson-evidence';top.append(evidence);panel.append(top,el('h3','',lesson.title));
    const intro=el('p','lesson-copy',lesson.intro);panel.append(intro);
    if(state.level===0)panel.append(el('p','compact-note','Foundation guidance: use the displayed clues as evidence. You can ask for hints one step at a time; wrong attempts are explained and do not end a logic exercise.'));
    else if(state.level===3)panel.append(el('p','compact-note','Expert guidance: state your assumptions and account for setup before acting. Request a hint only when you want another step of the argument.'));
    const task=el('div','lesson-task');task.append(el('strong','',lesson.type==='game'?'Your planning target. ':'Your task. '),document.createTextNode(lesson.task));panel.append(task);
    const activity=el('div');activity.id='lesson-activity';panel.append(activity);
    const f=el('div','feedback','Choose an action to begin.');f.id='lesson-feedback';f.setAttribute('role','status');f.setAttribute('aria-live','polite');panel.append(f);
    const evidenceDetail=el('p','evidence-strip',`Attempt ${state.attempts[lesson.id]} on this lesson. Hints and mistakes are recorded with completion.`);evidenceDetail.id='lesson-evidence-detail';panel.append(evidenceDetail);
    const controls=el('div','lesson-controls');controls.append(button('Get a hint','quiet-button',showHint),button('Reset this exercise','quiet-button',renderLesson));
    const eqToggle=button(state.level===0?'Hide equations':'Show equations','quiet-button',()=>{const box=$('lesson-equations');box.hidden=!box.hidden;eqToggle.textContent=box.hidden?'Show equations':'Hide equations';});controls.append(eqToggle);panel.append(controls);
    const equations=equationList(lesson.equations);equations.id='lesson-equations';equations.hidden=state.level!==0;panel.append(equations);
    const hints=el('div','hint-box');hints.id='lesson-hints';hints.hidden=true;panel.append(hints);
    const pager=el('div','lesson-pager'),index=D.lessons.indexOf(lesson);
    if(index>0)pager.append(button('← '+D.lessons[index-1].title,'text-button',()=>goLesson(index-1)));else pager.append(el('span'));
    if(index<D.lessons.length-1)pager.append(button(D.lessons[index+1].title+' →','text-button',()=>goLesson(index+1)));else pager.append(button('Return to the game →','text-button',()=>{location.href='Minesweeper.html';}));panel.append(pager);
    if(lesson.type==='pattern')renderPatternLesson(activity);else if(lesson.type==='game')renderGameLesson(activity);else if(lesson.type==='overlap')renderOverlap(activity);else renderProbability(activity);
  }
  function goLesson(index){state.lesson=D.lessons[index].id;save();renderNav();renderLesson();$('lesson-panel').scrollIntoView({behavior:'smooth',block:'start'});}
  function equationList(lines){const n=el('div','equation-list');for(const line of lines)n.append(el('div','',line));return n;}
  function showHint(){const hints=hintsFor(current.lesson);if(current.hintsUsed>=hints.length){feedback('All hints are visible. Reset the exercise to retry the argument.');return;}current.hintsUsed++;const box=$('lesson-hints');box.hidden=false;box.replaceChildren(el('span','equation-title',`GUIDANCE FOR ${D.levels[state.level].name.toUpperCase()}`));const list=el('ol');hints.slice(0,current.hintsUsed).forEach(h=>list.append(el('li','',h)));box.append(list);}
  function toolsRow(owner,rerender){const row=el('div','tool-row');for(const [value,label] of [['reveal','Reveal / safe'],['flag','Flag / mine']]){const b=button(label,'tool'+(owner.tool===value?' active':''),()=>{owner.tool=value;rerender();});b.dataset.tool=value;b.setAttribute('aria-pressed',String(owner.tool===value));row.append(b);}return row;}
  function rememberBoardFocus(container){const active=document.activeElement;if(!container?.contains(active))return null;return active.dataset.index!==undefined?`[data-index="${active.dataset.index}"]`:active.dataset.tool?`[data-tool="${active.dataset.tool}"]`:null;}
  function patternBoard(p,owner,action,readOnly=false){
    const board=el('div','mini-board');board.style.setProperty('--cols',p.width);board.setAttribute('role','group');board.setAttribute('aria-label','Bounded Minesweeper logic exercise');
    for(let i=0;i<p.width*p.height;i++){
      const unknown=p.unknown.includes(i),opened=(owner.opened||[]).includes(i),flagged=(owner.flags||[]).includes(i),isClue=p.clues.includes(i),knownMine=p.knownMines.includes(i);
      let cls='mini-cell',text='',label='';
      if(knownMine){cls+=' known-mine';text='✹';label='Certified mine';}
      else if(isClue||opened){cls+=opened?' opened':' known';text=String(D.clue(p,i));label=`${p.names[i]?p.names[i]+': ':''}revealed ${text}`;}
      else if(unknown){cls+=' unknown'+(flagged?' flagged':'');text=flagged?'⚑':p.names[i];label=`${p.names[i]}: ${flagged?'flagged mine':'unknown cell'}`;}
      else{cls+=' certified-safe';text='✓';label='Certified safe; number withheld';}
      const cell=el('button',cls,text);cell.type='button';cell.setAttribute('aria-label',label);cell.dataset.index=i;if(isClue||opened)cell.dataset.value=D.clue(p,i);
      if(unknown&&!opened&&!readOnly){cell.addEventListener('click',()=>action(i,owner.tool));cell.addEventListener('contextmenu',e=>{e.preventDefault();action(i,'flag');});cell.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'){e.preventDefault();action(i,'flag');}});}else cell.tabIndex=-1;
      board.append(cell);
    }
    return board;
  }
  function renderPatternLesson(container){
    current.puzzle=D.makePuzzle(current.lesson.kind);current.opened=[];current.flags=[];
    const layout=el('div','teaching-layout'),left=el('div'),right=el('div');left.id='logic-board-area';right.append(el('p','equation-title','READ THE BOUNDARY'),el('p','lesson-copy','Only lettered cells are unknown. Gray digits are revealed clues. A star is a certified mine; a check mark is known safe with its number withheld. No hidden cells extend outside the rectangle.'),el('p','board-caption','Click or tap with the selected tool. Right-click or press F on a focused cell to flag. These logic drills classify one cell at a time; the main game also floods zero regions.'));
    if(current.lesson.kind==='uncertainty')right.append(button('No forced safe move','primary',()=>{recordCompletion();feedback(current.lesson.success,'success');}));
    layout.append(left,right);container.append(layout);updatePatternBoard();feedback(current.lesson.kind==='uncertainty'?'Both hidden cells must be considered in every compatible layout.':'Each accepted action must follow from every layout compatible with the visible evidence.');
  }
  function updatePatternBoard(){const left=$('logic-board-area'),focus=rememberBoardFocus(left);left.replaceChildren(toolsRow(current,updatePatternBoard),patternBoard(current.puzzle,current,patternAction));if(focus)left.querySelector(focus)?.focus({preventScroll:true});}
  function patternAction(index,action){
    if(current.complete)return;
    if(action==='flag'&&current.flags.includes(index)){current.flags=current.flags.filter(i=>i!==index);updatePatternBoard();feedback('Flag removed. The evidence has not changed.');return;}
    if(current.flags.includes(index)){feedback('Remove the flag with the Flag tool before attempting a reveal.');return;}
    const result=D.verdict(current.puzzle,index,action,current.opened),name=current.puzzle.names[index];
    if(!result.valid){current.mistakes++;const why=result.reason==='ambiguous'?`${name} is mined in ${result.mineCount} of the ${result.layouts} compatible layouts. That action is not proved safe or correct.`:result.reason==='mine'?`${name} is a mine in every compatible layout. Flag it instead of revealing it.`:`${name} is safe in every compatible layout. A flag here would contradict the clues.`;feedback(why,'error');return;}
    if(action==='flag')current.flags.push(index);else current.opened.push(index);updatePatternBoard();
    const targets=current.puzzle.targets,done=targets.length>0&&targets.every(i=>current.puzzle.mines.includes(i)?current.flags.includes(i):current.opened.includes(i));
    if(done){recordCompletion();feedback(current.lesson.success,'success');}else feedback(`${name} is ${action==='flag'?'a mine':'safe'} in every compatible layout. Continue with the remaining unknowns.`);
  }
  function renderGameLesson(container){
    const l=current.lesson;current.game=MinesEngine.Game.fromLayout(l.width,l.height,l.mines);if(l.fixedFirst!==undefined)current.game.reveal(l.fixedFirst);
    const note=el('div','oracle-note','KNOWN-LAYOUT PLANNING · Faint digits and mine marks disclose the answer. This tests action economy, not blind deduction. Every game action is counted, including ineffective actions.');container.append(note);
    const layout=el('div','teaching-layout'),left=el('div'),right=el('div');left.id='known-board-area';right.id='known-game-meters';layout.append(left,right);container.append(layout);updateGameBoard();feedback(l.fixedFirst!==undefined?'The fixed opening has been made and counts as action 1. Find the remaining six-action route.':'The full layout is shown as faint hints. Choose your first action.');
  }
  function updateGameBoard(){
    const g=current.game,l=current.lesson,left=$('known-board-area'),focus=rememberBoardFocus(left);left.replaceChildren(toolsRow(current,updateGameBoard));const board=el('div','mini-board');board.style.setProperty('--cols',g.width);board.setAttribute('role','group');board.setAttribute('aria-label','Known-layout action planning board');
    for(let i=0;i<g.size;i++){
      const opened=g.revealed[i],flagged=g.flags[i],mine=g.mineMask[i];let cls='mini-cell'+(opened?' opened':flagged?' flagged':' ghost'),text=flagged?'⚑':mine?'✹':String(g.numbers[i]);
      const cell=button(text,cls,()=>gameAction(i,current.tool));if(opened)cell.dataset.value=g.numbers[i];cell.dataset.index=i;cell.setAttribute('aria-label',`Row ${Math.floor(i/g.width)+1}, column ${i%g.width+1}: ${flagged?'flagged mine':opened?'revealed '+g.numbers[i]:mine?'known hidden mine':'known hidden '+g.numbers[i]}`);cell.addEventListener('contextmenu',e=>{e.preventDefault();gameAction(i,'flag');});cell.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'){e.preventDefault();gameAction(i,'flag');}});board.append(cell);
    }
    left.append(board,el('p','board-caption','Click a revealed number to chord. One action per reveal, flag, or chord. A wrong flag can make a chord explode.'));if(focus)left.querySelector(focus)?.focus({preventScroll:true});
    const meters=$('known-game-meters');meters.replaceChildren();const row=el('div','game-meters');for(const [label,value] of [['Actions',g.totalClicks],['Target','≤ '+l.budget],['Board 3BV',g.bbbv]]){const m=el('div','',label);m.append(el('strong','',String(value)));row.append(m);}meters.append(row,el('p','lesson-copy',`Reveals ${g.clicks.left} · Flags ${g.clicks.right} · Chords ${g.clicks.chord} · No-effect actions ${g.clicks.wasted}.`));
    if(g.status==='won')meters.append(el('p','lesson-copy',`Won-game efficiency: ${(100*g.bbbv/g.totalClicks).toFixed(2)}%.`));
    meters.append(el('p','compact-note','The target includes every setup action. This known-layout exercise is assisted training and does not add a score to your ordinary game history.'));
  }
  function gameAction(index,action){
    const g=current.game;if(g.status==='won'||g.status==='lost')return;
    if(action==='flag')g.toggleFlag(index);else if(g.revealed[index])g.chord(index);else g.reveal(index);updateGameBoard();
    if(g.status==='lost'){current.mistakes++;feedback('That action detonated a mine. The faint marks show the known layout; reset and compare each action with its setup cost.','error');}
    else if(g.status==='won'){if(g.totalClicks<=current.lesson.budget){recordCompletion({actions:g.totalClicks});feedback(current.lesson.success,'success');}else feedback(`Board cleared in ${g.totalClicks} actions. The target is ${current.lesson.budget}; reset and remove unnecessary setup, flags, or overlapping reveals.`,'error');}
    else feedback(`${g.totalClicks} action${g.totalClicks===1?'':'s'} used. ${g.size-g.mines-g.revealedCount} safe cells remain.${g.totalClicks>=current.lesson.budget?' This attempt has used the entire target budget; reset to try a different route.':''}`);
  }
  function renderOverlap(container){
    current.chords=new Set();const units=el('div','unit-row');units.id='work-units';container.append(units);
    const plans=el('div','plan-buttons');for(const name of ['A','B']){const b=button(`Include chord ${name}`,'quiet-button',()=>{current.chords.has(name)?current.chords.delete(name):current.chords.add(name);b.setAttribute('aria-pressed',String(current.chords.has(name)));b.classList.toggle('active',current.chords.has(name));drawUnits();});b.setAttribute('aria-pressed','false');plans.append(b);}container.append(plans,el('p','lesson-copy','Once both chords are selected, how many direct-reveal actions does the combined plan save?'));
    const answers=el('div','answer-row');[0,1,2,3,4].forEach(n=>answers.append(button(String(n),'',()=>{if(current.chords.size!==2){feedback('Select both candidate chords so the question compares the complete plan.');return;}if(n===2){recordCompletion();feedback(current.lesson.success,'success');}else{current.mistakes++;feedback('Count the five distinct units once. Then subtract one shared flag plus two chords.','error');}})));container.append(answers);drawUnits();feedback('Select chord A and chord B to inspect their overlap.');
  }
  function drawUnits(){const row=$('work-units');row.replaceChildren();for(let i=1;i<=5;i++){const count=(current.chords.has('A')&&i<=3?1:0)+(current.chords.has('B')&&i>=3?1:0);row.append(el('div','unit'+(count?' covered':'')+(count===2?' overlapped':''),String(i)));}}
  function renderProbability(container){
    const controls=el('div','prob-controls');const a=el('div'),b=el('div');a.append(el('label','','Board'));b.append(el('label','','Opening rule'));const board=el('select'),policy=el('select');board.id='prob-board';policy.id='prob-policy';for(const [value,text] of [['81,10','Beginner · 9×9 / 10 mines'],['256,40','Intermediate · 16×16 / 40 mines'],['480,99','Expert · 30×16 / 99 mines']]){const o=el('option','',text);o.value=value;board.append(o);}for(const [value,text] of [['safe','Safe first · clicked cell protected'],['zero','Zero first · neighborhood protected']]){const o=el('option','',text);o.value=value;policy.append(o);}a.firstChild.htmlFor=board.id;b.firstChild.htmlFor=policy.id;a.append(board);b.append(policy);controls.append(a,b);container.append(controls);const bars=el('div','prob-bars');bars.id='prob-bars';container.append(bars);const detail=el('p','compact-note');detail.id='prob-detail';container.append(detail,el('p','lesson-copy','Which conclusion is justified by this calculation?'));const choices=el('div','quiz-choices');const answers=['Corners have the highest zero probability under the declared safe-first model.','Corners must give the best eventual efficiency on every board.','A numbered first reveal means the generator is broken.'];answers.forEach((answer,i)=>choices.append(button(answer,'quiz-choice',()=>{if(i===0){recordCompletion();feedback(current.lesson.success,'success');}else{current.mistakes++;feedback('The formula measures the immediate zero event under an explicit distribution; it does not optimize later play or require every safe reveal to be zero.','error');}})));container.append(choices);board.addEventListener('change',drawProbability);policy.addEventListener('change',drawProbability);drawProbability();feedback('Compare the three positions, then switch the opening rule to see which assumption changes.');
  }
  function drawProbability(){const [n,m]=$('prob-board').value.split(',').map(Number),policy=$('prob-policy').value;const bars=$('prob-bars');bars.replaceChildren();for(const [name,degree] of [['Corner',3],['Edge',5],['Interior',8]]){const p=D.zeroProbability(n,m,degree,policy),row=el('div','prob-row'),track=el('div','prob-track'),fill=el('div','prob-fill');fill.style.width=(100*p)+'%';track.append(fill);row.append(el('span','',`${name} · d=${degree}`),track,el('strong','',(100*p).toFixed(2)+'%'));bars.append(row);}$('prob-detail').textContent=policy==='zero'?'Zero-first excludes the entire starting neighborhood, making the zero probability 100% at all three positions for these feasible board settings. That does not equalize their later outcomes.':'These are conditional probabilities under uniform placement among the cells other than the safe first cell. They are not measured win rates.';}
  function openQuiz(){quizOpen=true;quizIndex=Math.min(state.quizAnswers.length,D.quiz.length);$('quiz-panel').hidden=false;renderQuiz();$('quiz-panel').scrollIntoView({behavior:'smooth',block:'center'});}
  function renderQuiz(){
    const panel=$('quiz-panel');panel.replaceChildren();const shell=el('div','quiz-shell');panel.append(shell);
    if(quizIndex>=D.quiz.length){const result=D.recommend(state.quizAnswers);shell.append(el('p','eyebrow','YOUR SAMPLED SKILL PROFILE'),el('h3','',`Suggested starting point: ${D.levels[result.level].name}`),el('p','lesson-copy',result.reason),el('p','compact-note','This six-question training aid is not a validated rating. A missed domain guides the starting lesson; you can choose any route above.'));
      const domains=el('div','domain-results');for(const [id,name] of [['rules','Rules'],['patterns','Patterns'],['efficiency','Click economy'],['uncertainty','Uncertainty']]){const d=result.domains[id],item=el('div','',name);item.append(el('strong','',`${d.correct} / ${d.total}`));domains.append(item);}shell.append(domains,button('Use this starting point →','primary',()=>chooseLevel(result.level)),button('Review quiz explanations','quiet-button',()=>{quizIndex=0;renderQuiz();}));return;}
    const q=D.quiz[quizIndex],answered=state.quizAnswers[quizIndex]!==undefined;const meta=el('div','quiz-meta');meta.append(el('span','',`QUESTION ${quizIndex+1} OF ${D.quiz.length}`),el('span','','“I’m not sure” is welcome.'));shell.append(meta,el('h3','',q.question));
    if(q.puzzle)shell.append(patternBoard(D.makePuzzle(q.puzzle),{},()=>{},true));
    const choices=el('div','quiz-choices'),indices=q.answers.map((_,i)=>i),shift=(quizIndex*2+1)%indices.length,ordered=indices.slice(shift).concat(indices.slice(0,shift));ordered.push(-1);
    ordered.forEach((index,displayIndex)=>{const selected=state.quizAnswers[quizIndex]===index;let cls='quiz-choice';if(answered&&index===q.correct)cls+=' correct';else if(answered&&selected)cls+=' incorrect';const b=button('',cls,()=>{state.quizAnswers[quizIndex]=index;save();renderQuiz();});b.append(el('span','',index===-1?'?':String.fromCharCode(65+displayIndex)),el('span','',index===-1?'I’m not sure yet.':q.answers[index]));b.disabled=answered;choices.append(b);});shell.append(choices);
    if(answered){shell.append(el('div','quiz-feedback',(state.quizAnswers[quizIndex]===q.correct?'Correct. ':state.quizAnswers[quizIndex]===-1?'A useful place to learn. ':'Here is the reasoning. ')+q.why),button(quizIndex===D.quiz.length-1?'See my starting point →':'Next question →','primary',()=>{quizIndex++;renderQuiz();}));}
  }
  function startPractice(){
    if(practiceTimer)clearInterval(practiceTimer);practice={active:true,tool:'reveal',round:0,correct:0,mistakes:0,attempts:0,hints:0,started:performance.now(),timed:$('practice-timed').checked,done:false};
    $('practice-area').hidden=false;$('practice-stop').hidden=false;$('practice-start').textContent='Restart session';$('practice-timed').disabled=true;
    nextPractice();practiceTimer=setInterval(()=>{if(!practice?.active)return;const elapsed=(performance.now()-practice.started)/1000;if(practice.timed&&elapsed>=30){stopPractice('Time is up.');return;}$('practice-clock').textContent=practice.timed?`${Math.max(0,30-elapsed).toFixed(1)}s remaining`:`${Math.floor(elapsed)}s · untimed`;},100);
  }
  function nextPractice(){
    if(!practice?.active||practiceExpired())return;const kind=practice.correct<1?'121':Math.random()<.5?'121':'1221';const maxRot=practice.correct<2?1:4,turns=Math.floor(Math.random()*maxRot);practice.puzzle=D.rotate(D.makePuzzle(kind),turns);practice.kind=kind;practice.turns=turns;practice.opened=[];practice.flags=[];practice.done=false;practice.round++;$('practice-next').hidden=true;$('practice-equations').hidden=true;$('practice-equations').replaceChildren(equationList(D.lessons.find(l=>l.id===kind).equations));$('practice-kind').textContent=`Round ${practice.round} · ${turns*90}° rotation · classify every unknown`;$('practice-feedback').textContent='Only the lettered frontier is unknown. Use the actual neighboring clues; do not guess from screen direction.';renderPracticeBoard();updatePracticeSummary();
  }
  function practiceExpired(){if(practice?.active&&practice.timed&&performance.now()-practice.started>=30000){stopPractice('Time is up.');return true;}return false;}
  function renderPracticeBoard(){if(!practice)return;const old=$('practice-board'),focus=rememberBoardFocus(old),board=patternBoard(practice.puzzle,practice,practiceAction);board.id='practice-board';old.replaceWith(board);if(focus)board.querySelector(focus)?.focus({preventScroll:true});document.querySelectorAll('#practice-tools button').forEach(b=>{b.classList.toggle('active',b.dataset.tool===practice.tool);b.setAttribute('aria-pressed',String(b.dataset.tool===practice.tool));});}
  function practiceAction(index,action){
    if(!practice?.active||practiceExpired()||practice.done)return;if(action==='flag'&&practice.flags.includes(index)){practice.flags=practice.flags.filter(i=>i!==index);renderPracticeBoard();return;}if(practice.flags.includes(index))return;
    practice.attempts++;const result=D.verdict(practice.puzzle,index,action,practice.opened);
    if(!result.valid){practice.mistakes++;$('practice-feedback').textContent=`That ${action==='flag'?'flag':'reveal'} is inconsistent with the bounded pattern. Recheck the neighboring equations; the cell has not changed.`;updatePracticeSummary();return;}
    if(action==='flag')practice.flags.push(index);else practice.opened.push(index);renderPracticeBoard();
    if(practice.puzzle.targets.every(i=>practice.puzzle.mines.includes(i)?practice.flags.includes(i):practice.opened.includes(i))){practice.done=true;practice.correct++;$('practice-feedback').textContent=`Round complete. ${practice.kind==='121'?'The outside unknowns are mines.':'The middle unknowns are mines.'} Rotation changes the view, not the proof.`;$('practice-next').hidden=false;}else $('practice-feedback').textContent='That classification is proved. Continue with the remaining cells.';updatePracticeSummary();
  }
  function updatePracticeSummary(){const p=practice;if(!p)return;const accuracy=p.attempts?Math.round(100*(p.attempts-p.mistakes)/p.attempts):100;$('practice-summary').textContent=`${p.correct} completed round${p.correct===1?'':'s'} · ${p.mistakes} errors · ${p.attempts?accuracy+'% action accuracy':'no actions yet'} · ${p.hints} equation reveal${p.hints===1?'':'s'}`;}
  function stopPractice(prefix='Session ended.'){
    if(!practice)return;practice.active=false;clearInterval(practiceTimer);practiceTimer=null;$('practice-stop').hidden=true;$('practice-timed').disabled=false;$('practice-next').hidden=true;$('practice-clock').textContent='Session finished';$('practice-feedback').textContent=prefix+' Review the equations or start a fresh session. Timed results do not count as proof of mastery.';updatePracticeSummary();
  }
  $('start-quiz').addEventListener('click',openQuiz);
  $('reset-quiz').addEventListener('click',()=>{state.quizAnswers=[];quizIndex=0;save();quizOpen=true;$('quiz-panel').hidden=false;renderQuiz();});
  $('reset-progress').addEventListener('click',()=>{if(confirm('Reset completed lessons and attempt counts in this browser? Your game history and placement quiz stay unchanged.')){state.completed={};state.attempts={};save();renderNav();renderLesson();}});
  $('practice-start').addEventListener('click',startPractice);$('practice-stop').addEventListener('click',()=>stopPractice());$('practice-next').addEventListener('click',nextPractice);
  document.querySelectorAll('#practice-tools button').forEach(b=>b.addEventListener('click',()=>{if(!practice)return;practice.tool=b.dataset.tool;renderPracticeBoard();}));
  $('practice-hint').addEventListener('click',()=>{if(!practice)return;practiceExpired();const box=$('practice-equations');if(box.hidden){if(practice.active)practice.hints++;box.hidden=false;updatePracticeSummary();}});
  renderLevels();renderNav();renderLesson();
})();
