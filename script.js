const chapters = JSON.parse(document.getElementById("chaptersData").textContent);
const content = document.getElementById("content");
const nav = document.getElementById("chapterNav");
const searchInput = document.getElementById("searchInput");
const dialog = document.getElementById("studyDialog");
const dialogContent = document.getElementById("dialogContent");

function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}
function strip(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function sectionKey(chIdx, secIdx){return `done-${chIdx}-${secIdx}`}

function render(){
  nav.innerHTML = chapters.map(ch => `<a href="#${ch.id}">${ch.title.replace("Chapter ","Ch. ")}</a>`).join("");
  let html = "";
  chapters.forEach((ch, ci)=>{
    html += `<article class="chapter" id="${ch.id}" data-search="${strip((ch.title+' '+ch.subtitle).toLowerCase())}">
      <div class="chapterHeader">
        <div><h3>${strip(ch.title)}</h3><p>${strip(ch.subtitle)}</p></div>
      </div>
      <div class="chapterCard">`;
    ch.sections.forEach((sec, si)=>{
      const key = sectionKey(ci, si);
      const checked = localStorage.getItem(key)==="1" ? "checked" : "";
      html += `<details class="topic" open data-text="${strip((sec.heading+' '+sec.content.join(' ')+' '+sec.study_tip).toLowerCase())}">
        <summary>
          <input class="tick" type="checkbox" ${checked} data-key="${key}" onclick="event.stopPropagation()">
          <span>${strip(sec.heading)}</span>
        </summary>
        <div class="topicBody">
          <ul>${sec.content.map(x=>`<li>${strip(x)}</li>`).join("")}</ul>
          <div class="tip"><strong>Study tip:</strong> ${strip(sec.study_tip)}</div>
          <div class="sectionActions">
            <button onclick="makeFlashcard(${ci},${si})">Flashcard this section</button>
            <button onclick="copySection(${ci},${si})">Copy notes</button>
          </div>
        </div>
      </details>`;
    });
    html += `</div></article>`;
  });
  content.innerHTML = html;
  bindTicks();
  updateProgress();
}
function bindTicks(){
  document.querySelectorAll(".tick").forEach(t=>{
    t.addEventListener("change", e=>{
      localStorage.setItem(e.target.dataset.key, e.target.checked ? "1" : "0");
      updateProgress();
    })
  })
}
function updateProgress(){
  const total = chapters.reduce((n,ch)=>n+ch.sections.length,0);
  const done = [...document.querySelectorAll(".tick")].filter(x=>x.checked).length;
  document.getElementById("doneCount").textContent = done;
  document.getElementById("totalCount").textContent = total;
  document.getElementById("progressBar").style.width = `${total ? (done/total*100) : 0}%`;
}
window.makeFlashcard = function(ci, si){
  const sec = chapters[ci].sections[si];
  dialogContent.innerHTML = `<div class="flashcard" id="singleCard">
    <div>
      <p class="muted" style="color:#cbd5e1">Click card to flip</p>
      <h3>${strip(sec.heading)}</h3>
      <p>Try to explain this topic before revealing the answer.</p>
    </div>
  </div>`;
  dialog.showModal();
  let flipped = false;
  document.getElementById("singleCard").onclick = () => {
    flipped = !flipped;
    document.getElementById("singleCard").innerHTML = flipped
      ? `<div><h3>${strip(sec.heading)}</h3><ul style="text-align:left">${sec.content.map(x=>`<li>${strip(x)}</li>`).join("")}</ul><p><strong>Tip:</strong> ${strip(sec.study_tip)}</p></div>`
      : `<div><p class="muted" style="color:#cbd5e1">Click card to flip</p><h3>${strip(sec.heading)}</h3><p>Try to explain this topic before revealing the answer.</p></div>`;
  };
}
window.copySection = async function(ci, si){
  const sec = chapters[ci].sections[si];
  const text = `${sec.heading}\n\n${sec.content.map(x=>"- "+x).join("\n")}\n\nStudy tip: ${sec.study_tip}`;
  await navigator.clipboard.writeText(text);
  alert("Section notes copied.");
}

document.getElementById("expandAll").onclick = ()=>document.querySelectorAll("details.topic").forEach(d=>d.open=true);
document.getElementById("collapseAll").onclick = ()=>document.querySelectorAll("details.topic").forEach(d=>d.open=false);
document.getElementById("printBtn").onclick = ()=>window.print();
document.getElementById("resetProgress").onclick = ()=>{
  if(confirm("Reset all completed ticks?")){
    Object.keys(localStorage).filter(k=>k.startsWith("done-")).forEach(k=>localStorage.removeItem(k));
    document.querySelectorAll(".tick").forEach(t=>t.checked=false);
    updateProgress();
  }
};
document.getElementById("closeDialog").onclick = ()=>dialog.close();

document.getElementById("flashcardMode").onclick = ()=>{
  const cards = [];
  chapters.forEach((ch,ci)=>ch.sections.forEach((sec,si)=>cards.push({ch:ch.title,sec,ci,si})));
  let idx = 0, answer = false;
  function draw(){
    const c = cards[idx];
    dialogContent.innerHTML = `<h2>Flashcards</h2><p class="muted">${idx+1} / ${cards.length} · ${strip(c.ch)}</p>
      <div class="flashcard" id="fc">
        <div>${answer
          ? `<h3>${strip(c.sec.heading)}</h3><ul style="text-align:left">${c.sec.content.map(x=>`<li>${strip(x)}</li>`).join("")}</ul><p><strong>Tip:</strong> ${strip(c.sec.study_tip)}</p>`
          : `<h3>${strip(c.sec.heading)}</h3><p>Explain this section from memory. Click to reveal.</p>`}
        </div>
      </div>
      <div class="toolbar"><button id="prevCard">Previous</button><button id="flipCard">Flip</button><button id="nextCard">Next</button></div>`;
    document.getElementById("fc").onclick=()=>{answer=!answer;draw()};
    document.getElementById("flipCard").onclick=()=>{answer=!answer;draw()};
    document.getElementById("prevCard").onclick=()=>{idx=(idx-1+cards.length)%cards.length;answer=false;draw()};
    document.getElementById("nextCard").onclick=()=>{idx=(idx+1)%cards.length;answer=false;draw()};
  }
  draw(); dialog.showModal();
};

document.getElementById("quizMode").onclick = ()=>{
  const questions = chapters.flatMap(ch=>ch.quiz.map(q=>({...q,ch:ch.title})));
  dialogContent.innerHTML = `<h2>Quiz Mode</h2><p class="muted">Try answering first, then reveal the answer.</p>`+
    questions.map((q,i)=>`<div class="quizItem"><strong>Q${i+1}. ${strip(q.q)}</strong><p class="muted">${strip(q.ch)}</p><button class="answerBtn" onclick="document.getElementById('ans${i}').style.display='block'">Show answer</button><div class="quizAnswer" id="ans${i}">${strip(q.a)}</div></div>`).join("");
  dialog.showModal();
};

searchInput.addEventListener("input", ()=>{
  const q = searchInput.value.toLowerCase().trim();
  document.querySelectorAll(".topic").forEach(topic=>{
    const match = !q || topic.dataset.text.includes(q);
    topic.classList.toggle("hidden", !match);
    if(q && match) topic.open = true;
  });
  document.querySelectorAll(".chapter").forEach(ch=>{
    const visible = [...ch.querySelectorAll(".topic")].some(t=>!t.classList.contains("hidden"));
    ch.classList.toggle("hidden", !visible);
  });
});

window.addEventListener("scroll", ()=>{
  let current = chapters[0].id;
  chapters.forEach(ch=>{
    const el = document.getElementById(ch.id);
    if(el && el.getBoundingClientRect().top < 140) current = ch.id;
  });
  document.querySelectorAll("#chapterNav a").forEach(a=>a.classList.toggle("active", a.getAttribute("href")==="#"+current));
});

render();
