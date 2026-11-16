(function(){
"use strict";
const R = window.REZEPTE || [];
R.forEach((r,i)=>{ r.id = i+1; });
const CATS = ["Frühstück","Suppe","Salat & Bowl","Hauptgericht","Snack & Dip","Süßes"];
const TAGS = ["vegetarisch","vegan","low carb","proteinreich","schnell"];
const HUE = {"Frühstück":38,"Suppe":18,"Salat & Bowl":110,"Hauptgericht":200,"Snack & Dip":280,"Süßes":335};
const UNITS = ["g","kg","ml","l","EL","TL","Stk","Prise","Bund","Dose","Dosen","Zehe","Zehen","Scheibe","Scheiben","Stange","Stangen","Blätter","Pck"];
const SECTIONS = ["Obst & Gemüse","Kühlregal","Fleisch & Fisch","Tiefkühl","Vorrat","Gewürze, Öl & Co.","Eigene Artikel"];

/* ---------- Speicher ---------- */
const store = {
  get(k,d){ try{ const v = localStorage.getItem("fk_"+k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem("fk_"+k, JSON.stringify(v)); }catch(e){} }
};
let favs = new Set(store.get("favs",[]));
let list = store.get("list",{recipes:[],done:{},extras:[],hidden:{}});
const ui = {q:"",cat:"",tag:"",tm:false,portions:{},mode:{},group:"abteilung"};
const saveList = ()=>{ store.set("list",list); badge(); };

/* ---------- Helfer ---------- */
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $ = s => document.querySelector(s);
const hasTM = r => Array.isArray(r.x) && r.x.length>0;
const isVeg = r => r.tags.includes("vegetarisch") || r.tags.includes("vegan");
function hasTag(r,t){ return t==="vegetarisch" ? isVeg(r) : t==="schnell" ? r.m<=20 : r.tags.includes(t); }

function parseIng(s){
  const tok = s.split(" ");
  let q=null,u="",i=0;
  if(/^\d+([.,]\d+)?$/.test(tok[0])){ q=parseFloat(tok[0].replace(",",".")); i=1;
    if(UNITS.includes(tok[1])){ u=tok[1]; i=2; } }
  return {q,u,name:tok.slice(i).join(" ")};
}
function fmtQ(q){
  if(q==null) return "";
  if(q>=100) return String(Math.round(q/5)*5);
  if(q>=10) return String(Math.round(q));
  const r = Math.round(q*4)/4, w=Math.floor(r), f=r-w;
  const fr = {0.25:"¼",0.5:"½",0.75:"¾"}[f]||"";
  if(r===0) return "etwas";
  return (w?w:"")+(fr?(w?" ":"")+fr:"") || "0";
}
function section(ing){
  const n = ing.name, l = n.toLowerCase();
  if(/\btk\b|tk-/.test(l)) return "Tiefkühl";
  if(/^dosen?$/i.test(ing.u)) return "Vorrat";
  if(/öl\b/.test(l) && !/kokosöl/.test(l)) return "Gewürze, Öl & Co.";
  if(/kokosmilch|kokosdrink|haferdrink|erdnussmus|tomatenmark|gewürzgurke|kichererbsen|linsen|bohnen|datteln|rosinen|kokosraspel|kokosöl|tahin|currypaste|brot|tortilla|nudeln|spaghetti|reis|quinoa|couscous|mehl|haferflocken|schokolade|kakao|nüsse|mandeln|kerne|sesam|samen|backpulver|stärke|oliven\b/.test(l) && !/reisessig/.test(l)) return "Vorrat";
  if(/salz|pfeffer|öl\b|essig|zimt|kümmel|curry|paprikapulver|kurkuma|sojasauce|senf|honig|sirup|brühe|muskat|oregano|thymian|rosmarin|chiliflocken|lorbeer|masala/.test(l)) return "Gewürze, Öl & Co.";
  if(/hähnchen|pute|rind|hack|lachs|thunfisch|garnelen|kabeljau|fisch/.test(l)) return "Fleisch & Fisch";
  if(/milch|joghurt|quark|skyr|käse|feta|parmesan|butter|\beier?\b|sahne|schmand|tofu/.test(l)) return "Kühlregal";
  if(/wasser/.test(l)) return "";
  return "Obst & Gemüse";
}
const UNORM = {dosen:"dose",zehe:"zehen",scheibe:"scheiben",stange:"stangen"};
function ikey(g){ const u=g.u.toLowerCase(); return (g.name.replace(/\s*\(.*?\)/g,"").trim()+"|"+(UNORM[u]||u)).toLowerCase(); }
function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.hidden=false;
  clearTimeout(toast._t); toast._t=setTimeout(()=>{t.hidden=true;},2200);
}
function badge(){
  const b=$("#badge"); const n=list.recipes.length+list.extras.length;
  b.hidden = n===0; b.textContent=n;
}

/* ---------- Bilder: gezeichnete Teller-Illustration je Rezept ---------- */
const seg = s => (typeof Intl!=="undefined" && Intl.Segmenter)
  ? Array.from(new Intl.Segmenter("de",{granularity:"grapheme"}).segment(s), x=>x.segment)
  : Array.from(s);
function picture(r){
  const em = seg(r.e), h=(HUE[r.c]+ (r.id*23)%36 - 18 + 360)%360, id="g"+r.id;
  const side = em.slice(1);
  const pos = [[62,62,-14],[338,198,12],[336,58,10],[64,200,-8]];
  let deco="";
  side.forEach((e,i)=>{
    const a=pos[i%4], b=pos[(i+2)%4];
    deco += `<text x="${a[0]}" y="${a[1]}" font-size="46" text-anchor="middle" dominant-baseline="central" transform="rotate(${a[2]} ${a[0]} ${a[1]})">${e}</text>`;
    deco += `<text x="${b[0]}" y="${b[1]}" font-size="30" opacity=".85" text-anchor="middle" dominant-baseline="central" transform="rotate(${b[2]} ${b[0]} ${b[1]})">${e}</text>`;
  });
  return `<svg viewBox="0 0 400 260" role="img" aria-label="${esc(r.t)}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 70% 86%)"/><stop offset="1" stop-color="hsl(${(h+35)%360} 65% 72%)"/></linearGradient></defs>
<rect width="400" height="260" fill="url(#${id})"/>
<circle cx="${40+(r.id*37)%320}" cy="-10" r="90" fill="#fff" opacity=".22"/><circle cx="${(r.id*71)%400}" cy="280" r="110" fill="#fff" opacity=".16"/>
<ellipse cx="200" cy="140" rx="104" ry="100" fill="rgba(0,0,0,.14)"/>
<circle cx="200" cy="130" r="100" fill="#fff"/><circle cx="200" cy="130" r="76" fill="hsl(${h} 45% 95%)" stroke="hsl(${h} 30% 88%)" stroke-width="2"/>
<text x="200" y="134" font-size="92" text-anchor="middle" dominant-baseline="central">${em[0]}</text>${deco}</svg>`;
}

/* ---------- Ansichten ---------- */
function card(r){
  return `<a class="card" href="#/r/${r.id}">${picture(r)}
  <button class="fav ${favs.has(r.id)?"on":""}" data-fav="${r.id}" aria-label="Favorit">${favs.has(r.id)?"♥":"♡"}</button>
  <div class="body"><h3>${esc(r.t)}</h3>
  <div class="meta"><span>⏱ ${r.m} Min.</span><span>🔥 ${r.n[0]} kcal</span>${hasTM(r)?'<span class="pill tm">Thermomix</span>':""}</div></div></a>`;
}
function filtered(src){
  const q=ui.q.trim().toLowerCase();
  return src.filter(r=>(!ui.cat||r.c===ui.cat)&&(!ui.tag||hasTag(r,ui.tag))&&(!ui.tm||hasTM(r))&&
    (!q||r.t.toLowerCase().includes(q)||r.i.some(x=>x.toLowerCase().includes(q))));
}
function viewHome(onlyFav){
  const src = onlyFav ? R.filter(r=>favs.has(r.id)) : R;
  const chips = [`<button class="chip ${ui.cat===""?"on":""}" data-cat="">Alle</button>`]
    .concat(CATS.map(c=>`<button class="chip ${ui.cat===c?"on":""}" data-cat="${esc(c)}">${esc(c)}</button>`)).join("");
  const tags = [`<button class="chip tm ${ui.tm?"on":""}" data-tm="1">Thermomix</button>`]
    .concat(TAGS.map(t=>`<button class="chip ${ui.tag===t?"on":""}" data-tag="${t}">${t}</button>`)).join("");
  $("#app").innerHTML = `<h1>${onlyFav?"Deine Favoriten":"Gesund kochen, einfach gemacht"}</h1>
  <p class="sub">${onlyFav?"Rezepte, die du mit ♥ markiert hast.":R.length+" Rezepte mit Nährwerten, Einkaufsliste und Thermomix-Anleitung."}</p>
  <input class="search" id="q" type="search" placeholder="Rezept oder Zutat suchen …" value="${esc(ui.q)}">
  <div class="chips">${chips}</div><div class="chips">${tags}</div>
  <div id="res"></div>`;
  drawGrid(src);
  $("#q").addEventListener("input",e=>{ ui.q=e.target.value; drawGrid(src); });
}
function drawGrid(src){
  const res = filtered(src);
  $("#res").innerHTML = res.length ? `<p class="sub" style="margin:10px 0 0">${res.length} Rezepte</p><div class="grid">${res.map(card).join("")}</div>`
    : `<div class="empty">Keine Rezepte gefunden. Filter anpassen oder Suche leeren.</div>`;
}
function fmtStep(s){ return esc(s).replace(/(\d+(?:[–-]\d+)? (?:Sek|Min)\.(?:\/[^\/\s,]+)*\/Stufe \d+(?:[–-]\d+)?)/g,'<b class="set">$1</b>'); }
function viewRecipe(id){
  const r = R.find(x=>x.id===id);
  if(!r){ location.hash="#/"; return; }
  const p = ui.portions[id] || r.p, f = p/r.p;
  const mode = hasTM(r) ? (ui.mode[id] || "herd") : "herd";
  const [kcal,ew,kh,fett,bs] = r.n;
  const ke=ew*4, kk=kh*4, kf=fett*9, tot=ke+kk+kf||1;
  const ings = r.i.map(parseIng).map(g=>`<li><span class="q">${g.q==null?"":fmtQ(g.q*f)+" "+esc(g.u)}</span><span>${esc(g.name)}</span></li>`).join("");
  const steps = (mode==="tm"?r.x:r.s).map(s=>`<li>${fmtStep(s)}</li>`).join("");
  const onList = list.recipes.some(x=>x.id===id);
  $("#app").innerHTML = `<a class="back" href="#/">← Alle Rezepte</a>
  <div class="detail"><div class="left">
    <div class="hero">${picture(r)}<button class="fav ${favs.has(id)?"on":""}" data-fav="${id}" aria-label="Favorit">${favs.has(id)?"♥":"♡"}</button></div>
    <div class="box"><h2>Nährwerte pro Portion</h2>
      <div class="nutri"><div><b>${kcal}</b><span>kcal</span></div><div><b>${ew} g</b><span>Eiweiß</span></div><div><b>${kh} g</b><span>Kohlenhydr.</span></div><div><b>${fett} g</b><span>Fett</span></div><div><b>${bs} g</b><span>Ballastst.</span></div></div>
      <div class="bar"><i style="width:${ke/tot*100}%;background:#3b82c4"></i><i style="width:${kk/tot*100}%;background:#e0a526"></i><i style="width:${kf/tot*100}%;background:#d2603a"></i></div>
      <div class="legend"><span><i style="background:#3b82c4"></i>Eiweiß ${Math.round(ke/tot*100)} %</span><span><i style="background:#e0a526"></i>Kohlenhydrate ${Math.round(kk/tot*100)} %</span><span><i style="background:#d2603a"></i>Fett ${Math.round(kf/tot*100)} %</span></div>
      <p class="note">Richtwerte, berechnet aus Durchschnittswerten der Zutaten. Anteile in % der Kalorien.</p></div>
  </div><div>
    <h1>${esc(r.t)}</h1>
    <div class="meta" style="margin:6px 0 4px"><span>⏱ ${r.m} Min.</span><span>${esc(r.c)}</span>${r.tags.map(t=>`<span class="pill">${t}</span>`).join("")}${hasTM(r)?'<span class="pill tm">Thermomix</span>':""}</div>
    <div class="box"><div class="row"><h2 style="margin:0">Zutaten</h2>
      <div class="stepper"><button data-p="-1" aria-label="weniger">−</button><b>${p} ${p===1?"Portion":"Portionen"}</b><button data-p="1" aria-label="mehr">+</button></div></div>
      <ul class="ing">${ings}</ul>
      <button class="btn ${onList?"ghost":""}" data-add="${id}">${onList?"✓ Auf der Einkaufsliste – Menge aktualisieren":"🛒 Zutaten auf die Einkaufsliste"}</button></div>
    <div class="box"><h2>Zubereitung</h2>
      ${hasTM(r)?`<div class="seg"><button data-mode="herd" class="${mode==="herd"?"on":""}">Herd &amp; Ofen</button><button data-mode="tm" class="tm ${mode==="tm"?"on":""}">Thermomix</button></div>`:`<p class="note" style="margin:0">Für dieses Rezept braucht es keinen Thermomix.</p>`}
      <ol class="steps ${mode==="tm"?"tm":""}">${steps}</ol>
      ${mode==="tm"?'<p class="note">Angaben für TM5, TM6 und TM7. Beim Hochskalieren die maximale Füllmenge des Mixtopfs beachten.</p>':""}</div>
  </div></div>`;
  window.scrollTo(0, viewRecipe._keep ? window.scrollY : 0); viewRecipe._keep=false;
}

/* ---------- Einkaufsliste ---------- */
function buildItems(){
  const map = new Map();
  list.recipes.forEach(e=>{
    const r = R.find(x=>x.id===e.id); if(!r) return;
    r.i.map(parseIng).forEach(g=>{
      const sec = section(g); if(!sec) return;
      const key = ikey(g);
      if(list.hidden[key]) return;
      const it = map.get(key) || {key,name:g.name,u:g.u,q:null,sec,from:[]};
      if(g.q!=null) it.q = (it.q||0) + g.q*e.p/r.p;
      if(!it.from.includes(r.t)) it.from.push(r.t);
      map.set(key,it);
    });
  });
  const items = Array.from(map.values());
  list.extras.forEach(n=>items.push({key:"x|"+n.toLowerCase(),name:n,u:"",q:null,sec:"Eigene Artikel",from:[],extra:true}));
  return items;
}
function itemRow(it){
  const d = !!list.done[it.key];
  return `<label class="item ${d?"done":""}"><input type="checkbox" data-done="${esc(it.key)}" ${d?"checked":""}>
  <span class="nm">${esc(it.name)}${it.from.length&&ui.group==="abteilung"?`<span class="src">${esc(it.from.join(" · "))}</span>`:""}</span>
  <span class="q">${it.q==null?"":fmtQ(it.q)+" "+esc(it.u)}</span>
  <button class="x" data-del="${esc(it.key)}" aria-label="entfernen">✕</button></label>`;
}
function viewList(){
  const items = buildItems();
  const open = items.filter(i=>!list.done[i.key]).length;
  let body="";
  if(!items.length){
    body = `<div class="empty">Deine Einkaufsliste ist leer.<br>Öffne ein Rezept und tippe auf „Zutaten auf die Einkaufsliste“.</div>`;
  } else if(ui.group==="rezept"){
    list.recipes.forEach(e=>{
      const r=R.find(x=>x.id===e.id); if(!r) return;
      const rows = r.i.map(parseIng).filter(g=>section(g)).map(g=>{
        const key=ikey(g); if(list.hidden[key]) return "";
        return itemRow({key,name:g.name,u:g.u,q:g.q==null?null:g.q*e.p/r.p,from:[]});
      }).join("");
      body += `<div class="grp"><h3>${esc(r.t)} · ${e.p} Port.</h3>${rows}</div>`;
    });
    const ex = items.filter(i=>i.extra); if(ex.length) body += `<div class="grp"><h3>Eigene Artikel</h3>${ex.map(itemRow).join("")}</div>`;
  } else {
    SECTIONS.forEach(s=>{
      const g = items.filter(i=>i.sec===s).sort((a,b)=>a.name.localeCompare(b.name,"de"));
      if(g.length) body += `<div class="grp"><h3>${s}</h3>${g.map(itemRow).join("")}</div>`;
    });
  }
  const recs = list.recipes.map(e=>{ const r=R.find(x=>x.id===e.id); return r?`<div class="rrow"><a href="#/r/${r.id}">${esc(r.t)}</a>
    <div class="stepper"><button data-lp="${r.id}:-1">−</button><b>${e.p}</b><button data-lp="${r.id}:1">+</button></div>
    <button class="x" data-rm="${r.id}" aria-label="Rezept entfernen" style="border:0;background:none;font-size:18px;color:var(--mut)">✕</button></div>`:""; }).join("");
  $("#app").innerHTML = `<h1>Einkaufsliste</h1>
  <p class="sub">${items.length?open+" von "+items.length+" Artikeln offen · gleiche Zutaten werden zusammengezählt":"Sammle hier die Zutaten deiner Rezepte."}</p>
  ${list.recipes.length?`<h2 style="margin-top:8px">Geplante Rezepte</h2><div class="rlist">${recs}</div>`:""}
  ${items.length?`<div class="listhead">
    <div class="seg" style="flex:1;min-width:240px"><button data-group="abteilung" class="${ui.group==="abteilung"?"on":""}">Nach Abteilung</button><button data-group="rezept" class="${ui.group==="rezept"?"on":""}">Nach Rezept</button></div>
    <button class="btn small ghost" data-act="copy">Kopieren</button><button class="btn small ghost" data-act="print">Drucken</button><button class="btn small danger" data-act="clear">Leeren</button></div>`:""}
  ${body}
  <div class="addrow"><input class="search" id="extra" placeholder="Eigener Artikel, z. B. Küchenrolle"><button class="btn small" data-act="extra">Hinzufügen</button></div>`;
  const ex=$("#extra"); ex.addEventListener("keydown",e=>{ if(e.key==="Enter") addExtra(); });
}
function addExtra(){
  const v=$("#extra").value.trim(); if(!v) return;
  if(!list.extras.includes(v)) list.extras.push(v);
  saveList(); viewList(); $("#extra").focus();
}
function listText(){
  const items=buildItems().filter(i=>!list.done[i.key]); let out="Einkaufsliste\n";
  SECTIONS.forEach(s=>{ const g=items.filter(i=>i.sec===s); if(g.length){ out+="\n"+s+"\n"; g.forEach(i=>{ out+="- "+(i.q==null?"":fmtQ(i.q)+" "+i.u+" ").replace("  "," ")+i.name+"\n"; }); } });
  return out;
}

/* ---------- Router & Ereignisse ---------- */
function route(){
  const h = location.hash || "#/";
  const m = h.match(/^#\/r\/(\d+)/);
  let tab="rezepte";
  if(m) viewRecipe(+m[1]);
  else if(h==="#/liste"){ tab="liste"; viewList(); window.scrollTo(0,0); }
  else if(h==="#/favoriten"){ tab="favoriten"; viewHome(true); }
  else viewHome(false);
  document.querySelectorAll(".tabs a").forEach(a=>a.classList.toggle("on",a.dataset.tab===tab && !m));
  badge();
}
const rid = ()=>{ const m=location.hash.match(/^#\/r\/(\d+)/); return m?+m[1]:0; };
document.addEventListener("click",e=>{
  const t = e.target.closest("[data-fav],[data-cat],[data-tag],[data-tm],[data-p],[data-mode],[data-add],[data-del],[data-rm],[data-lp],[data-group],[data-act]");
  if(!t) return;
  const d=t.dataset;
  if(d.fav){ e.preventDefault(); const id=+d.fav; favs.has(id)?favs.delete(id):favs.add(id); store.set("favs",[...favs]);
    t.classList.toggle("on",favs.has(id)); t.textContent=favs.has(id)?"♥":"♡";
    if(location.hash==="#/favoriten") route(); return; }
  if("cat" in d){ ui.cat=d.cat; route(); return; }
  if(d.tag){ ui.tag = ui.tag===d.tag?"":d.tag; route(); return; }
  if(d.tm){ ui.tm=!ui.tm; route(); return; }
  if(d.p){ const id=rid(), r=R.find(x=>x.id===id); const p=Math.max(1,Math.min(24,(ui.portions[id]||r.p)+ +d.p)); ui.portions[id]=p; viewRecipe._keep=true; viewRecipe(id); return; }
  if(d.mode){ ui.mode[rid()]=d.mode; viewRecipe._keep=true; viewRecipe(rid()); return; }
  if(d.add){ const id=+d.add, r=R.find(x=>x.id===id), p=ui.portions[id]||r.p;
    const ex=list.recipes.find(x=>x.id===id); if(ex) ex.p=p; else list.recipes.push({id,p});
    saveList(); viewRecipe._keep=true; viewRecipe(id); toast("„"+r.t+"“ für "+p+" Portionen auf der Einkaufsliste"); return; }
  if(d.del){ e.preventDefault(); const k=d.del; if(k.startsWith("x|")) list.extras=list.extras.filter(n=>"x|"+n.toLowerCase()!==k); else list.hidden[k]=1; delete list.done[k]; saveList(); viewList(); return; }
  if(d.rm){ list.recipes=list.recipes.filter(x=>x.id!==+d.rm); if(!list.recipes.length){ list.hidden={}; } saveList(); viewList(); return; }
  if(d.lp){ const [id,dl]=d.lp.split(":").map(Number); const ex=list.recipes.find(x=>x.id===id); if(ex){ ex.p=Math.max(1,Math.min(24,ex.p+dl)); saveList(); viewList(); } return; }
  if(d.group){ ui.group=d.group; viewList(); return; }
  if(d.act==="extra"){ addExtra(); return; }
  if(d.act==="print"){ window.print(); return; }
  if(d.act==="clear"){ if(confirm("Einkaufsliste wirklich komplett leeren?")){ list={recipes:[],done:{},extras:[],hidden:{}}; saveList(); viewList(); } return; }
  if(d.act==="copy"){ const txt=listText();
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast("Liste in die Zwischenablage kopiert"),()=>toast("Kopieren nicht möglich – bitte Drucken nutzen")); return; }
});
document.addEventListener("change",e=>{
  const k=e.target.dataset && e.target.dataset.done; if(!k) return;
  if(e.target.checked) list.done[k]=1; else delete list.done[k];
  saveList(); viewList();
});
window.addEventListener("hashchange",route);
route();
})();
