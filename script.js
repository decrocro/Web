
const decks = JSON.parse(document.getElementById('decksData').textContent);
const pretest = JSON.parse(document.getElementById('pretestData').textContent);
const mindmap = JSON.parse(document.getElementById('mindmapData').textContent);
const formulas = JSON.parse(document.getElementById('formulaData').textContent);

const deckNav = document.getElementById('deckNav');
const content = document.getElementById('content');
const dialog = document.getElementById('dialog');
const dialogContent = document.getElementById('dialogContent');

function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function id(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}
function key(di,si){return `v3-slide-${di}-${si}`}
function firstLine(text){let line=(text||'').split(/\n+/).map(x=>x.trim()).find(Boolean); return line || 'Blank / visual-only slide'}
function summarize(text){
  if(!text) return "This slide appears to be blank or visual-only in the extracted text.";
  let lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  let useful=lines.filter(x=>!x.startsWith('http') && !x.toLowerCase().startsWith('source:') && !/^_+$/.test(x));
  return useful.slice(0,4).join(" • ") || "Image/source/reference slide.";
}
function renderStats(){
  document.getElementById('deckCount').textContent = decks.length;
  document.getElementById('slideCount').textContent = decks.reduce((n,d)=>n+d.slides.length,0);
  document.getElementById('questionCount').textContent = pretest.length;
}
function renderSlides(){
  deckNav.innerHTML=decks.map(d=>`<a href="#${id(d.title)}">${esc(d.title.replace('CBS 2332 ','').replace('CBS2332 ','').slice(0,44))}</a>`).join('');
  let html='';
  decks.forEach((deck,di)=>{
    html+=`<article class="deck" id="${id(deck.title)}">
      <div class="deckTitle"><div><h3>${esc(deck.title)}</h3><p>${deck.slide_count} slides</p></div></div>
      <div class="card">`;
    deck.slides.forEach((slide,si)=>{
      const text=slide.text||'';
      const checked=localStorage.getItem(key(di,si))==='1'?'checked':'';
      html+=`<details class="slide" open data-text="${esc((deck.title+' '+text).toLowerCase())}">
        <summary><input class="tick" type="checkbox" data-key="${key(di,si)}" ${checked} onclick="event.stopPropagation()">Slide ${slide.number}: ${esc(firstLine(text))}</summary>
        <div class="slideBody">
          <div class="slideText ${text?'':'empty'}">${text?esc(text):'No extractable text found. This is likely a blank, image-only, or decorative slide.'}</div>
          <div class="studyBox"><strong>Study focus:</strong> ${esc(summarize(text))}</div>
          <div class="actions">
            <button onclick="flash(${di},${si})">Flashcard this slide</button>
            <button onclick="copySlide(${di},${si})">Copy slide text</button>
          </div>
        </div>
      </details>`;
    });
    html+='</div></article>';
  });
  content.innerHTML=html;
  bindTicks(); progress();
}
function renderPretest(){
  const box = document.getElementById('pretestContent');
  box.innerHTML = pretest.map((q,i)=>{
    if(q.type==='mcq'){
      return `<div class="question" data-type="mcq" data-answer="${esc(q.answer)}">
        <h4>${i+1}. [${esc(q.topic)}] ${esc(q.q)}</h4>
        <div class="options">${q.options.map((opt,j)=>`<label class="option"><input type="radio" name="q${i}" value="${esc(opt)}"> <span>${esc(opt)}</span></label>`).join('')}</div>
        <div class="sampleAnswer"><strong>Explanation:</strong> ${esc(q.explain)}</div>
      </div>`;
    }
    if(q.type==='truefalse'){
      return `<div class="question" data-type="truefalse" data-answer="${esc(q.answer)}">
        <h4>${i+1}. [${esc(q.topic)}] ${esc(q.q)}</h4>
        <div class="options">
          <label class="option"><input type="radio" name="q${i}" value="True"> <span>True</span></label>
          <label class="option"><input type="radio" name="q${i}" value="False"> <span>False</span></label>
        </div>
        <div class="sampleAnswer"><strong>Explanation:</strong> ${esc(q.explain)}</div>
      </div>`;
    }
    return `<div class="question" data-type="short">
      <h4>${i+1}. [${esc(q.topic)}] ${esc(q.q)}</h4>
      <textarea class="textarea" placeholder="Write your answer here..."></textarea>
      <button class="showSample" type="button">Show sample answer</button>
      <div class="sampleAnswer"><strong>Sample answer:</strong> ${esc(q.sample)}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('.showSample').forEach(btn=>btn.addEventListener('click',e=>e.target.nextElementSibling.style.display='block'));
}
function renderMindmap(){
  const root = Object.keys(mindmap)[0];
  const branches = mindmap[root];
  document.getElementById('mindmapContent').innerHTML = `<div class="mapRoot">${esc(root)}</div><div class="mapBranches">`+
    Object.entries(branches).map(([k,items])=>`<div class="branch"><h4>${esc(k)}</h4><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')+
    `</div>`;
}
function renderFormulas(){
  document.getElementById('formulaContent').innerHTML = formulas.map(f=>`<div class="formula"><h4>${esc(f.name)}</h4><code>${esc(f.formula)}</code><p>${esc(f.use)}</p></div>`).join('');
}
function bindTicks(){document.querySelectorAll('.tick').forEach(t=>t.addEventListener('change',e=>{localStorage.setItem(e.target.dataset.key,e.target.checked?'1':'0');progress()}))}
function progress(){let total=document.querySelectorAll('.tick').length;let done=[...document.querySelectorAll('.tick')].filter(x=>x.checked).length;document.getElementById('done').textContent=done;document.getElementById('total').textContent=total;document.getElementById('bar').style.width=(total?done/total*100:0)+'%';document.getElementById('completedPct').textContent=Math.round(total?done/total*100:0)+'%'}
window.flash=(di,si)=>{
  const deck=decks[di], slide=deck.slides[si]; let flipped=false;
  function draw(){
    dialogContent.innerHTML=`<h2>Flashcard</h2><p class="muted">${esc(deck.title)} · Slide ${slide.number}</p>
      <div class="flash" id="fc">${flipped?`<pre>${esc(slide.text||'No extractable text.')}</pre>`:`<div><h3>Slide ${slide.number}</h3><p>${esc(firstLine(slide.text))}</p><p>Click to reveal full slide text.</p></div>`}</div>`;
    document.getElementById('fc').onclick=()=>{flipped=!flipped;draw()}
  }
  draw(); dialog.showModal();
}
window.copySlide=async(di,si)=>{const d=decks[di],s=d.slides[si];await navigator.clipboard.writeText(`${d.title}\nSlide ${s.number}\n\n${s.text||''}`);alert('Slide text copied.')}
document.getElementById('expand').onclick=()=>document.querySelectorAll('details.slide').forEach(x=>x.open=true);
document.getElementById('collapse').onclick=()=>document.querySelectorAll('details.slide').forEach(x=>x.open=false);
document.getElementById('print').onclick=()=>window.print();
document.getElementById('close').onclick=()=>dialog.close();
document.getElementById('reset').onclick=()=>{if(confirm('Reset slide progress?')){Object.keys(localStorage).filter(k=>k.startsWith('v3-slide-')).forEach(k=>localStorage.removeItem(k));document.querySelectorAll('.tick').forEach(x=>x.checked=false);progress()}};
document.getElementById('startPretest').onclick=()=>{
  document.querySelectorAll('#pretestContent input[type=radio]').forEach(x=>x.checked=false);
  document.querySelectorAll('#pretestContent textarea').forEach(x=>x.value='');
  document.querySelectorAll('.option').forEach(x=>x.classList.remove('correct','wrong'));
  document.querySelectorAll('.sampleAnswer').forEach(x=>x.style.display='none');
  document.getElementById('scoreBox').classList.add('hidden');
  location.hash='pretest';
};
document.getElementById('checkPretest').onclick=()=>{
  let objective=0, correct=0;
  document.querySelectorAll('#pretestContent .question').forEach((q,i)=>{
    const type=q.dataset.type;
    if(type==='mcq'||type==='truefalse'){
      objective++;
      const ans=q.dataset.answer;
      const chosen=q.querySelector('input[type=radio]:checked');
      q.querySelectorAll('.option').forEach(opt=>{
        const val=opt.querySelector('input').value;
        opt.classList.remove('correct','wrong');
        if(val===ans) opt.classList.add('correct');
        if(chosen && val===chosen.value && val!==ans) opt.classList.add('wrong');
      });
      q.querySelector('.sampleAnswer').style.display='block';
      if(chosen && chosen.value===ans) correct++;
    } else {
      q.querySelector('.sampleAnswer').style.display='block';
    }
  });
  const subjective = pretest.filter(q=>q.type==='short').length;
  const pct=Math.round(correct/objective*100);
  const score=document.getElementById('scoreBox');
  score.classList.remove('hidden');
  score.innerHTML=`<h3>Objective Score: ${correct}/${objective} (${pct}%)</h3><p>There are ${subjective} subjective questions. Compare your answers with the sample answers and self-mark them.</p>`;
  score.scrollIntoView({behavior:'smooth',block:'center'});
};
document.getElementById('search').addEventListener('input',e=>{
  const q=e.target.value.toLowerCase().trim();
  document.querySelectorAll('details.slide').forEach(sl=>{
    const match=!q||sl.dataset.text.includes(q);
    sl.classList.toggle('hidden',!match);
    if(q&&match)sl.open=true;
  });
  document.querySelectorAll('.deck').forEach(deck=>{
    deck.classList.toggle('hidden',![...deck.querySelectorAll('details.slide')].some(x=>!x.classList.contains('hidden')));
  });
});
document.getElementById('flashcards').onclick=()=>{
  const cards=[]; decks.forEach((d,di)=>d.slides.forEach((s,si)=>cards.push({d,s,di,si})));
  let i=0, flipped=false;
  function draw(){
    const c=cards[i];
    dialogContent.innerHTML=`<h2>All Slide Flashcards</h2><p class="muted">${i+1}/${cards.length} · ${esc(c.d.title)} · Slide ${c.s.number}</p>
      <div class="flash" id="allfc">${flipped?`<pre>${esc(c.s.text||'No extractable text.')}</pre>`:`<div><h3>Slide ${c.s.number}</h3><p>${esc(firstLine(c.s.text))}</p><p>Click to reveal full slide text.</p></div>`}</div>
      <div class="testActions" style="margin-top:12px"><button id="prev">Previous</button><button id="flip">Flip</button><button id="next">Next</button></div>`;
    document.getElementById('allfc').onclick=()=>{flipped=!flipped;draw()};
    document.getElementById('flip').onclick=()=>{flipped=!flipped;draw()};
    document.getElementById('prev').onclick=()=>{i=(i-1+cards.length)%cards.length;flipped=false;draw()};
    document.getElementById('next').onclick=()=>{i=(i+1)%cards.length;flipped=false;draw()};
  }
  draw(); dialog.showModal();
};
window.addEventListener("scroll", ()=>{
  let current="";
  decks.forEach(d=>{
    const el=document.getElementById(id(d.title));
    if(el && el.getBoundingClientRect().top<150) current=id(d.title);
  });
  document.querySelectorAll("#deckNav a").forEach(a=>a.classList.toggle("active", a.getAttribute("href")==="#"+current));
});
renderStats(); renderPretest(); renderMindmap(); renderFormulas(); renderSlides();

const examData = JSON.parse(document.getElementById('examData').textContent);

function renderExamFocus(){
  const cards = document.getElementById('examFocusCards');
  if(!cards) return;
  cards.innerHTML = examData.focus.map((f,idx)=>`
    <div class="focusCard">
      <span class="tag">${esc(f.marks_focus)}</span>
      <h5>${idx+1}. ${esc(f.title)}</h5>
      <ul>${f.must_know.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <details>
        <summary>Ready-made subjective answer template</summary>
        <div class="inside"><p>${esc(f.answer_template)}</p></div>
      </details>
      <details>
        <summary>Likely question styles</summary>
        <div class="inside"><ul>${f.likely_questions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      </details>
    </div>
  `).join('');

  const obj = document.getElementById('examObjectiveDrill');
  obj.innerHTML = examData.objective_exam.map((q,i)=>`
    <div class="question examObj" data-answer="${esc(q.answer)}">
      <h4>${i+1}. ${esc(q.q)}</h4>
      <div class="options">${q.options.map(opt=>`<label class="option"><input type="radio" name="examObj${i}" value="${esc(opt)}"> <span>${esc(opt)}</span></label>`).join('')}</div>
    </div>
  `).join('');

  const blanks = document.getElementById('fillBlankDrill');
  blanks.innerHTML = examData.fill_blanks.map((q,i)=>`
    <div class="blankItem" data-answer="${esc(q.a.toLowerCase())}">
      <div>
        <strong>${i+1}.</strong> ${esc(q.q)}
        <div class="blankAnswer">Answer: ${esc(q.a)}</div>
      </div>
      <input type="text" placeholder="Your answer">
    </div>
  `).join('');
}

document.addEventListener('click', function(e){
  if(e.target && e.target.id === 'checkExamObjective'){
    let total=0, correct=0;
    document.querySelectorAll('.examObj').forEach(q=>{
      total++;
      const ans = q.dataset.answer;
      const chosen = q.querySelector('input[type=radio]:checked');
      q.querySelectorAll('.option').forEach(opt=>{
        const val = opt.querySelector('input').value;
        opt.classList.remove('correct','wrong');
        if(val===ans) opt.classList.add('correct');
        if(chosen && val===chosen.value && val!==ans) opt.classList.add('wrong');
      });
      if(chosen && chosen.value===ans) correct++;
    });
    const box = document.getElementById('examObjectiveScore');
    box.classList.remove('hidden');
    box.innerHTML = `<h3>Objective Drill Score: ${correct}/${total}</h3><p>Review the green answers, then revise the linked topic in the focus cards above.</p>`;
    box.scrollIntoView({behavior:'smooth',block:'center'});
  }

  if(e.target && e.target.id === 'checkFillBlanks'){
    let total=0, correct=0;
    document.querySelectorAll('.blankItem').forEach(item=>{
      total++;
      const ans = item.dataset.answer.trim().toLowerCase();
      const val = item.querySelector('input').value.trim().toLowerCase();
      item.classList.remove('correct','wrong');
      if(val && val === ans){ item.classList.add('correct'); correct++; }
      else item.classList.add('wrong');
    });
    const box = document.getElementById('fillBlankScore');
    box.classList.remove('hidden');
    box.innerHTML = `<h3>Fill-in-the-Blanks Score: ${correct}/${total}</h3><p>Spelling matters for this drill. Some answers may have equivalent wording in real exams, but memorize the key terms shown.</p>`;
    box.scrollIntoView({behavior:'smooth',block:'center'});
  }
});

renderExamFocus();
