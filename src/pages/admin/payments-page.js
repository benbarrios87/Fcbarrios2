import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getAdminPaymentOverview,updateMemberPayment,getBuyInPools } from "../../repositories/payment-repository.js";

const tiers = [250,500,800];
let state={tournament:null,players:[],pools:[]};

function pools(){
  return `<section class="payment-pools">${tiers.map(t=>{
    const paid=state.players.filter(p=>p.payment_status==="paid"&&Number(p.buy_in_tier)===t).length;
    const total=state.players.filter(p=>p.payment_status==="paid"&&Number(p.buy_in_tier)===t)
      .reduce((sum,p)=>sum+Number(p.paid_amount||0),0);
    return `<article><span>${t===250?"🥉 Bronse":t===500?"🥈 Sølv":"🥇 Gull"}</span><strong>${total.toLocaleString("no-NO")} kr</strong><small>${paid} betalte · ${t} kr</small></article>`;
  }).join("")}</section>`;
}

function row(p){
  return `<article class="payment-row" data-payment-player="${p.player_id}">
    <div class="payment-row__player">${p.avatar_url?`<img src="${p.avatar_url}" alt=""/>`:`<span>${p.display_name.slice(0,1).toUpperCase()}</span>`}<strong>${p.display_name}</strong></div>
    <select data-field="buyInTier"><option value="">Ingen pulje</option>${tiers.map(t=>`<option value="${t}" ${Number(p.buy_in_tier)===t?"selected":""}>${t===250?"Bronse":t===500?"Sølv":"Gull"} · ${t} kr</option>`).join("")}</select>
    <select data-field="paymentStatus"><option value="pending" ${p.payment_status==="pending"?"selected":""}>Venter</option><option value="paid" ${p.payment_status==="paid"?"selected":""}>✓ Betalt</option><option value="waived" ${p.payment_status==="waived"?"selected":""}>Fritatt</option></select>
    <input data-field="paidAmount" type="number" min="0" step="50" value="${p.paid_amount||0}"/>
    <input data-field="paymentNote" type="text" value="${p.payment_note||""}" placeholder="Notat"/>
    <button class="button button--primary" type="button" data-save-payment>Lagre</button>
    <small class="payment-row__message"></small>
  </article>`;
}

function render(){const t=document.querySelector("#payments-content");if(!t)return;t.innerHTML=`${pools()}<section class="side-pot-payment-note panel"><strong>Sidepotter</strong><span>Bronse betaler 250 kr. Sølv betaler 250 + 250 kr. Gull betaler 250 + 250 + 300 kr.</span></section><section class="payment-list">${state.players.map(row).join("")}</section>`;bind();}
function bind(){document.querySelectorAll("[data-save-payment]").forEach(b=>b.addEventListener("click",async()=>{const r=b.closest("[data-payment-player]");const v=n=>r.querySelector(`[data-field="${n}"]`)?.value??"";const m=r.querySelector(".payment-row__message");b.disabled=true;b.textContent="Lagrer …";try{const tier=Number(v("buyInTier"))||null;await updateMemberPayment({tournamentId:state.tournament.id,playerId:r.dataset.paymentPlayer,buyInTier:tier,paymentStatus:v("paymentStatus"),paidAmount:Number(v("paidAmount")||tier||0),paymentNote:v("paymentNote")});state.players=await getAdminPaymentOverview(state.tournament.id);render();}catch(e){m.textContent=e.message;m.classList.add("is-error")}finally{b.disabled=false;b.textContent="Lagre"}}));}
export async function PaymentsPage(){const a=getAuthSnapshot();if(!a.isAdmin)return `<div class="page"><section class="access-card"><span>⛔</span><h1>Ingen tilgang</h1><p>Betalinger kan bare administreres av admin eller owner.</p><a class="button button--ghost" href="/" data-link>Til forsiden</a></section></div>`;const tournament=await getActiveTournament();const players=await getAdminPaymentOverview(tournament.id);state={tournament,players,pools:[]};setTimeout(render,0);return `<div class="page"><header class="page-header"><span>Admin · ${tournament.short_name}</span><h1>Betalinger</h1><p>Velg Bronse 250, Sølv 500 eller Gull 800 og marker spilleren som betalt.</p></header><section id="payments-content"></section></div>`;}
