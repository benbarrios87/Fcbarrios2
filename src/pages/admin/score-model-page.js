import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getScoreModels, getScoreRules, saveScoreRules, activateScoreModel, createScoreModel } from "../../repositories/score-model-repository.js";

const stages = [["group","Gruppespill"],["knockout","Sluttspill"]];
const resultTypes = [["outcome","Riktig utfall"],["difference","Riktig målforskjell"],["exact","Riktig resultat"]];
const selections = [["favorite","Favoritt"],["draw","Uavgjort"],["underdog","Underdog"]];
let state = { tournament:null, models:[], selectedModel:null, rules:new Map() };

const key = (a,b,c,d) => `${a}:${b}:${c}:${d}`;
const value = (a,b,c,d) => state.rules.get(key(a,b,c,d)) ?? 0;

function matrix(stage, resultType, title) {
  const rows = Array.from({length:state.selectedModel.tier_count},(_,difference)=>({difference,label:difference===0?"Lik mot lik":`Tier-forskjell ${difference}`}));
  return `<article class="score-matrix panel"><div class="section-heading"><div><span>${stage==="group"?"Gruppespill":"Sluttspill"}</span><h2>${title}</h2></div></div>
    <div class="score-table"><div class="score-table__head"><span>Tier-forskjell</span>${selections.map(([,l])=>`<span>${l}</span>`).join("")}</div>
    ${rows.map(r=>`<div class="score-table__row"><strong>${r.label}</strong>${selections.map(([s])=>`<input type="number" min="0" step="0.25" value="${value(stage,resultType,r.difference,s)}" data-score-input data-stage="${stage}" data-result-type="${resultType}" data-tier-difference="${r.difference}" data-selection-type="${s}">`).join("")}</div>`).join("")}</div></article>`;
}

function render() {
  const target=document.querySelector("#score-model-content"); if(!target||!state.selectedModel)return;
  target.innerHTML=`<section class="score-toolbar panel"><label><span>Scoremodell</span><select id="score-model-select">${state.models.map(m=>`<option value="${m.id}" ${m.id===state.selectedModel.id?"selected":""}>${m.name}${m.is_active?" · AKTIV":""}</option>`).join("")}</select></label><div class="score-toolbar__info"><span>Antall tiers</span><strong>${state.selectedModel.tier_count}</strong></div><button class="button button--ghost" id="new-score-model">Lag kopi</button><button class="button button--ghost" id="activate-score-model" ${state.selectedModel.is_active?"disabled":""}>${state.selectedModel.is_active?"Aktiv modell":"Gjør aktiv"}</button><button class="button button--primary" id="save-score-model">Lagre</button></section>
  ${stages.map(([s,l])=>`<section class="score-stage"><header><span>${l}</span><h2>${l}</h2></header><div class="score-matrices">${resultTypes.map(([r,t])=>matrix(s,r,t)).join("")}</div></section>`).join("")}<div id="score-message" class="score-message"></div>`;
  bind();
}

async function loadModel(id){const model=state.models.find(m=>m.id===id);if(!model)return;const rules=await getScoreRules(id);state.selectedModel=model;state.rules=new Map(rules.map(r=>[key(r.stage,r.result_type,r.tier_difference,r.selection_type),Number(r.points)]));render();}
function rows(){return [...document.querySelectorAll("[data-score-input]")].map(i=>({stage:i.dataset.stage,result_type:i.dataset.resultType,tier_difference:Number(i.dataset.tierDifference),selection_type:i.dataset.selectionType,points:Number(i.value||0)}));}
function message(text,type=""){const el=document.querySelector("#score-message");if(el){el.className=`score-message ${type?`score-message--${type}`:""}`;el.textContent=text;}}

function bind(){
 document.querySelector("#score-model-select")?.addEventListener("change",e=>loadModel(e.target.value));
 document.querySelector("#save-score-model")?.addEventListener("click",async()=>{try{await saveScoreRules(state.selectedModel.id,rows());message("Scoremodellen er lagret.","success");}catch(e){message(e.message,"error");}});
 document.querySelector("#activate-score-model")?.addEventListener("click",async()=>{try{await activateScoreModel(state.selectedModel.id);state.models=await getScoreModels(state.tournament.id);await loadModel(state.selectedModel.id);}catch(e){message(e.message,"error");}});
 document.querySelector("#new-score-model")?.addEventListener("click",async()=>{const name=prompt("Navn på ny modell:",`${state.selectedModel.name} – kopi`);if(!name)return;const count=Number(prompt("Antall tiers:",String(state.selectedModel.tier_count)));if(!Number.isInteger(count)||count<1||count>10){message("Antall tiers må være 1–10.","error");return;}try{const id=await createScoreModel({tournamentId:state.tournament.id,name,tierCount:count,copyFromModelId:state.selectedModel.id});state.models=await getScoreModels(state.tournament.id);await loadModel(id);}catch(e){message(e.message,"error");}});
}

export async function ScoreModelPage(){
 const auth=getAuthSnapshot();
 if(!auth.isAdmin)return `<div class="page"><section class="access-card"><span>⛔</span><h1>Ingen tilgang</h1><p>Bare admin eller owner kan endre scoremodellen.</p><a class="button button--ghost" href="/" data-link>Til forsiden</a></section></div>`;
 const tournament=await getActiveTournament();const models=await getScoreModels(tournament.id);const selected=models.find(m=>m.is_active)||models[0];state={tournament,models,selectedModel:selected,rules:new Map()};if(selected){const rules=await getScoreRules(selected.id);state.rules=new Map(rules.map(r=>[key(r.stage,r.result_type,r.tier_difference,r.selection_type),Number(r.points)]));}
 setTimeout(render,0);
 return `<div class="page"><header class="page-header"><span>Admin · ${tournament.short_name}</span><h1>Scoremodell</h1><p>Legg inn FC Barrios-matrisen, lag testmodeller og velg aktiv modell.</p></header><section id="score-model-content"></section></div>`;
}
