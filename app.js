'use strict';

const STORAGE_KEY='aluguel_facil_v2';
const defaultState={
  version:2,
  settings:{
    priceTable:10,
    priceChair:3,
    priceKaraoke:150,
    stockTables:0,
    stockChairs:0,
    stockKaraokes:0,
    businessWhatsapp:''
  },
  clients:[],orders:[],expenses:[]
};
let state=loadState();
let currentView='home';

const main=document.getElementById('main');
const modalRoot=document.getElementById('modalRoot');
const toastEl=document.getElementById('toast');

function clone(v){return JSON.parse(JSON.stringify(v));}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return clone(defaultState);
    const parsed=JSON.parse(raw);
    return {
      ...clone(defaultState),...parsed,
      settings:{...clone(defaultState.settings),...(parsed.settings||{})},
      clients:Array.isArray(parsed.clients)?parsed.clients:[],
      orders:Array.isArray(parsed.orders)?parsed.orders:[],
      expenses:Array.isArray(parsed.expenses)?parsed.expenses:[]
    };
  }catch{return clone(defaultState);}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function id(){return crypto.randomUUID?.()||String(Date.now())+Math.random().toString(16).slice(2);}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function dateISO(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(d);}
function dateBR(s){if(!s)return'';const [y,m,d]=String(s).split('-');return `${d}/${m}/${y}`;}
function longDate(s){const d=new Date(`${s}T12:00:00`);return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(d);}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function n(v){return Math.max(0,Number(v)||0);}
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),2200);}
function clientById(clientId){return state.clients.find(c=>c.id===clientId)||null;}
function orderTotal(o){
  const p=state.settings;
  const tablePrice=o.priceTable??p.priceTable;
  const chairPrice=o.priceChair??p.priceChair;
  const karaokePrice=o.priceKaraoke??p.priceKaraoke;
  return n(o.tables)*n(tablePrice)+n(o.chairs)*n(chairPrice)+n(o.karaokes)*n(karaokePrice)+n(o.freight);
}
function orderPaid(o){return Math.min(orderTotal(o),n(o.paid));}
function orderDue(o){return Math.max(0,orderTotal(o)-orderPaid(o));}
function activeOrder(o){return !['Cancelado','Finalizado'].includes(o.status);}
function bookedOn(date,ignoreId=''){
  return state.orders.filter(o=>o.date===date&&o.id!==ignoreId&&activeOrder(o)).reduce((a,o)=>({tables:a.tables+n(o.tables),chairs:a.chairs+n(o.chairs),karaokes:a.karaokes+n(o.karaokes)}),{tables:0,chairs:0,karaokes:0});
}
function availability(date,ignoreId=''){
  const b=bookedOn(date,ignoreId),s=state.settings;
  return {
    tables:Math.max(0,n(s.stockTables)-b.tables),
    chairs:Math.max(0,n(s.stockChairs)-b.chairs),
    karaokes:Math.max(0,n(s.stockKaraokes)-b.karaokes)
  };
}
function hasConfiguredStock(){const s=state.settings;return n(s.stockTables)+n(s.stockChairs)+n(s.stockKaraokes)>0;}

function navigate(view){currentView=view;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));render();}
function render(){
  if(currentView==='home')renderHome();
  if(currentView==='orders')renderOrders();
  if(currentView==='clients')renderClients();
  if(currentView==='cash')renderCash();
}

document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
document.getElementById('settingsBtn').addEventListener('click',openSettings);

function renderHome(){
  const today=dateISO();
  const todayOrders=state.orders.filter(o=>o.date===today&&!['Cancelado'].includes(o.status));
  const received=state.orders.filter(o=>o.status!=='Cancelado').reduce((a,o)=>a+orderPaid(o),0);
  const due=state.orders.filter(o=>o.status!=='Cancelado').reduce((a,o)=>a+orderDue(o),0);
  const avail=availability(today);
  const next=state.orders.filter(o=>o.date>=today&&!['Cancelado','Finalizado'].includes(o.status)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||''))).slice(0,3);
  main.innerHTML=`
    <section class="hero">
      <p class="eyebrow">Resumo de hoje</p>
      <h2>${esc(longDate(today))}</h2>
      <p class="muted">${todayOrders.length?`${todayOrders.length} serviço${todayOrders.length>1?'s':''} agendado${todayOrders.length>1?'s':''}`:'Nenhum serviço agendado'}</p>
      <button class="primary-btn" id="newOrderHome">＋ Novo aluguel ou frete</button>
    </section>
    <section class="grid-2">
      <article class="stat-card"><div class="icon">💵</div><b>${money(received)}</b><small>Recebido</small></article>
      <article class="stat-card"><div class="icon" style="background:#f8ead8">🕒</div><b>${money(due)}</b><small>A receber</small></article>
    </section>
    <div class="section-title"><h3>Estoque disponível hoje</h3><button id="stockSettings">Ajustar</button></div>
    <section class="card">
      ${hasConfiguredStock()?`<div class="stock-grid">
        <div class="stock-item"><b>${avail.tables}</b><small>Mesas</small></div>
        <div class="stock-item"><b>${avail.chairs}</b><small>Cadeiras</small></div>
        <div class="stock-item"><b>${avail.karaokes}</b><small>Karaokês</small></div>
      </div>`:`<div class="empty">Configure a quantidade do seu estoque para o app calcular a disponibilidade por data.</div>`}
    </section>
    <div class="section-title"><h3>Próximos serviços</h3><button id="allOrders">Ver pedidos</button></div>
    <section class="list">${next.length?next.map(orderCard).join(''):'<div class="card empty">Nenhum pedido futuro cadastrado.</div>'}</section>
  `;
  document.getElementById('newOrderHome').onclick=()=>openOrderModal();
  document.getElementById('stockSettings').onclick=openSettings;
  document.getElementById('allOrders').onclick=()=>navigate('orders');
  bindOrderActions();
}

function orderCard(o){
  const c=clientById(o.clientId),total=orderTotal(o),due=orderDue(o);
  const items=[];
  if(n(o.tables))items.push(`${n(o.tables)} mesa${n(o.tables)>1?'s':''}`);
  if(n(o.chairs))items.push(`${n(o.chairs)} cadeira${n(o.chairs)>1?'s':''}`);
  if(n(o.karaokes))items.push(`${n(o.karaokes)} karaokê${n(o.karaokes)>1?'s':''}`);
  if(n(o.freight))items.push(`frete ${money(o.freight)}`);
  const badgeClass=o.status==='Cancelado'?'red':o.status==='Finalizado'?'':due>0?'orange':'';
  return `<article class="list-card" data-order="${esc(o.id)}">
    <div class="list-card-head">
      <div><h4>${esc(c?.name||o.clientName||'Cliente')}</h4><div class="meta">📅 ${dateBR(o.date)}${o.time?' · '+esc(o.time):''}<br>${esc(items.join(' · ')||'Serviço')}</div></div>
      <span class="badge ${badgeClass}">${esc(o.status||'Agendado')}</span>
    </div>
    <div style="display:flex;justify-content:space-between;gap:10px;margin-top:12px"><span class="meta">Total</span><span class="money">${money(total)}</span></div>
    ${due>0?`<div style="display:flex;justify-content:space-between;gap:10px;margin-top:5px"><span class="meta">A receber</span><b style="color:var(--orange)">${money(due)}</b></div>`:''}
    <div class="actions"><button data-action="edit">Editar</button><button data-action="whatsapp">WhatsApp</button><button data-action="finish">${o.status==='Finalizado'?'Reabrir':'Finalizar'}</button><button data-action="delete" class="danger">Excluir</button></div>
  </article>`;
}
function bindOrderActions(){
  document.querySelectorAll('[data-order]').forEach(card=>{
    const o=state.orders.find(x=>x.id===card.dataset.order);if(!o)return;
    card.querySelector('[data-action="edit"]').onclick=()=>openOrderModal(o.id);
    card.querySelector('[data-action="whatsapp"]').onclick=()=>sendOrderWhatsapp(o);
    card.querySelector('[data-action="finish"]').onclick=()=>{o.status=o.status==='Finalizado'?'Agendado':'Finalizado';saveState();render();toast(o.status==='Finalizado'?'Pedido finalizado':'Pedido reaberto');};
    card.querySelector('[data-action="delete"]').onclick=()=>{if(confirm('Excluir este pedido?')){state.orders=state.orders.filter(x=>x.id!==o.id);saveState();render();toast('Pedido excluído');}};
  });
}

function renderOrders(){
  main.innerHTML=`
    <div class="section-title" style="margin-top:2px"><h3>Pedidos e agenda</h3></div>
    <div class="toolbar"><input id="orderSearch" class="search" placeholder="Buscar cliente, data ou endereço"><select id="orderFilter" class="filter"><option value="all">Todos</option><option value="open">Em aberto</option><option value="done">Finalizados</option><option value="cancel">Cancelados</option></select></div>
    <section id="ordersList" class="list"></section>
    <button class="fab" id="newOrderFab" aria-label="Novo pedido">＋</button>`;
  const search=document.getElementById('orderSearch'),filter=document.getElementById('orderFilter');
  function paint(){
    const q=search.value.trim().toLowerCase(),f=filter.value;
    let items=[...state.orders].sort((a,b)=>b.date.localeCompare(a.date)||String(b.time||'').localeCompare(String(a.time||'')));
    items=items.filter(o=>{
      const c=clientById(o.clientId);const hay=`${c?.name||o.clientName||''} ${o.date} ${o.address||''}`.toLowerCase();
      const fOk=f==='all'||(f==='open'&&activeOrder(o))||(f==='done'&&o.status==='Finalizado')||(f==='cancel'&&o.status==='Cancelado');
      return hay.includes(q)&&fOk;
    });
    document.getElementById('ordersList').innerHTML=items.length?items.map(orderCard).join(''):'<div class="card empty">Nenhum pedido encontrado.</div>';
    bindOrderActions();
  }
  search.oninput=paint;filter.onchange=paint;document.getElementById('newOrderFab').onclick=()=>openOrderModal();paint();
}

function renderClients(){
  main.innerHTML=`<div class="section-title" style="margin-top:2px"><h3>Clientes</h3></div><div class="toolbar"><input class="search" id="clientSearch" placeholder="Buscar cliente ou telefone"></div><section class="list" id="clientsList"></section><button class="fab" id="newClientFab">＋</button>`;
  const search=document.getElementById('clientSearch');
  function paint(){
    const q=search.value.trim().toLowerCase();
    const arr=[...state.clients].filter(c=>`${c.name} ${c.phone||''}`.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    document.getElementById('clientsList').innerHTML=arr.length?arr.map(c=>{
      const os=state.orders.filter(o=>o.clientId===c.id),sum=os.reduce((a,o)=>a+orderTotal(o),0);
      return `<article class="list-card" data-client="${esc(c.id)}"><div class="list-card-head"><div><h4>${esc(c.name)}</h4><div class="meta">${c.phone?'📱 '+esc(c.phone):'Sem telefone'}${c.address?'<br>📍 '+esc(c.address):''}</div></div><span class="badge">${os.length} pedido${os.length!==1?'s':''}</span></div><div class="meta" style="margin-top:10px">Total contratado: <b>${money(sum)}</b></div><div class="actions"><button data-action="edit-client">Editar</button><button data-action="new-client-order">Novo pedido</button><button data-action="delete-client" class="danger">Excluir</button></div></article>`;
    }).join(''):'<div class="card empty">Nenhum cliente cadastrado.</div>';
    bindClientActions();
  }
  search.oninput=paint;document.getElementById('newClientFab').onclick=()=>openClientModal();paint();
}
function bindClientActions(){
  document.querySelectorAll('[data-client]').forEach(card=>{
    const c=state.clients.find(x=>x.id===card.dataset.client);if(!c)return;
    card.querySelector('[data-action="edit-client"]').onclick=()=>openClientModal(c.id);
    card.querySelector('[data-action="new-client-order"]').onclick=()=>openOrderModal(null,c.id);
    card.querySelector('[data-action="delete-client"]').onclick=()=>{
      if(state.orders.some(o=>o.clientId===c.id))return alert('Esse cliente possui pedidos. Exclua ou altere os pedidos primeiro.');
      if(confirm('Excluir este cliente?')){state.clients=state.clients.filter(x=>x.id!==c.id);saveState();render();toast('Cliente excluído');}
    };
  });
}

function renderCash(){
  const valid=state.orders.filter(o=>o.status!=='Cancelado');
  const gross=valid.reduce((a,o)=>a+orderTotal(o),0);
  const received=valid.reduce((a,o)=>a+orderPaid(o),0);
  const due=valid.reduce((a,o)=>a+orderDue(o),0);
  const expenses=state.expenses.reduce((a,e)=>a+n(e.value),0);
  const net=received-expenses;
  main.innerHTML=`
    <div class="section-title" style="margin-top:2px"><h3>Caixa</h3><button id="addExpense">＋ Despesa</button></div>
    <section class="cash-summary">
      <article class="stat-card"><div class="icon">💵</div><b>${money(received)}</b><small>Recebido</small></article>
      <article class="stat-card"><div class="icon" style="background:#f8ead8">🕒</div><b>${money(due)}</b><small>A receber</small></article>
      <article class="stat-card"><div class="icon">📊</div><b>${money(gross)}</b><small>Total contratado</small></article>
      <article class="stat-card"><div class="icon" style="background:#fae5e2">📉</div><b>${money(expenses)}</b><small>Despesas</small></article>
      <article class="stat-card"><div class="icon">💰</div><b>${money(net)}</b><small>Saldo recebido - despesas</small></article>
    </section>
    <div class="section-title"><h3>Despesas</h3></div>
    <section class="card">${state.expenses.length?state.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`<div class="expense-row"><div><b>${esc(e.description)}</b><div class="meta">${dateBR(e.date)}</div></div><div style="text-align:right"><b style="color:var(--red)">− ${money(e.value)}</b><div><button class="icon-btn" style="font-size:14px;padding:5px" data-expense-delete="${esc(e.id)}">Excluir</button></div></div></div>`).join(''):'<div class="empty">Nenhuma despesa registrada.</div>'}</section>`;
  document.getElementById('addExpense').onclick=openExpenseModal;
  document.querySelectorAll('[data-expense-delete]').forEach(b=>b.onclick=()=>{if(confirm('Excluir esta despesa?')){state.expenses=state.expenses.filter(e=>e.id!==b.dataset.expenseDelete);saveState();renderCash();}});
}

function openOrderModal(orderId=null,preselectedClientId=''){
  const o=orderId?state.orders.find(x=>x.id===orderId):null;
  const values=o||{clientId:preselectedClientId,date:dateISO(),time:'',tables:0,chairs:0,karaokes:0,freight:0,address:'',notes:'',paid:0,paymentMethod:'Dinheiro',status:'Agendado'};
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal">
    <div class="modal-head"><h2>${o?'Editar pedido':'Novo aluguel ou frete'}</h2><button class="close" id="closeModal">×</button></div>
    ${!state.clients.length?'<div class="warning">Cadastre um cliente aqui mesmo. Ao salvar o pedido, ele será incluído automaticamente.</div>':''}
    <div class="form-grid">
      <div class="field full"><label>Cliente</label><select id="fClient"><option value="">Novo cliente / escolha</option>${state.clients.map(c=>`<option value="${esc(c.id)}" ${c.id===values.clientId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Nome do cliente (se novo)</label><input id="fClientName" value="${esc(o?.clientName||'')}"></div>
      <div class="field"><label>Telefone / WhatsApp</label><input id="fPhone" inputmode="tel" value="${esc(o?.phone||'')}"></div>
      <div class="field"><label>Data do serviço</label><input id="fDate" type="date" value="${esc(values.date||dateISO())}"></div>
      <div class="field"><label>Horário</label><input id="fTime" type="time" value="${esc(values.time||'')}"></div>
      <div class="field"><label>Mesas (${money(o?.priceTable??state.settings.priceTable)} cada)</label><input id="fTables" type="number" min="0" step="1" value="${n(values.tables)}"></div>
      <div class="field"><label>Cadeiras (${money(o?.priceChair??state.settings.priceChair)} cada)</label><input id="fChairs" type="number" min="0" step="1" value="${n(values.chairs)}"></div>
      <div class="field"><label>Karaokê (${money(o?.priceKaraoke??state.settings.priceKaraoke)} cada)</label><input id="fKaraokes" type="number" min="0" step="1" value="${n(values.karaokes)}"></div>
      <div class="field"><label>Frete</label><input id="fFreight" type="number" min="0" step="0.01" value="${n(values.freight)}"></div>
      <div class="field full"><label>Endereço / local da entrega</label><input id="fAddress" value="${esc(values.address||'')}"></div>
      <div class="field"><label>Valor já pago / sinal</label><input id="fPaid" type="number" min="0" step="0.01" value="${n(values.paid)}"></div>
      <div class="field"><label>Forma de pagamento</label><select id="fPayment"><option ${values.paymentMethod==='Dinheiro'?'selected':''}>Dinheiro</option><option ${values.paymentMethod==='PIX'?'selected':''}>PIX</option><option ${values.paymentMethod==='Cartão'?'selected':''}>Cartão</option><option ${values.paymentMethod==='Outro'?'selected':''}>Outro</option></select></div>
      <div class="field"><label>Status</label><select id="fStatus">${['Agendado','Entregue','Finalizado','Cancelado'].map(s=>`<option ${values.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field full"><label>Observações</label><textarea id="fNotes">${esc(values.notes||'')}</textarea></div>
    </div>
    <div id="stockWarning"></div>
    <div class="calc"><div class="calc-row"><span>Itens + frete</span><b id="calcTotal">${money(orderTotal(values))}</b></div><div class="calc-row"><span>Pago</span><span id="calcPaid">${money(values.paid)}</span></div><div class="calc-row total"><span>A receber</span><span id="calcDue">${money(orderDue(values))}</span></div></div>
    <div class="modal-actions"><button class="ghost-btn" id="cancelModal">Cancelar</button><button class="primary-btn" id="saveOrder">Salvar pedido</button></div>
  </div></div>`;
  const close=()=>modalRoot.innerHTML='';
  const fClient=document.getElementById('fClient'),fClientName=document.getElementById('fClientName'),fPhone=document.getElementById('fPhone'),fDate=document.getElementById('fDate'),fTime=document.getElementById('fTime'),fTables=document.getElementById('fTables'),fChairs=document.getElementById('fChairs'),fKaraokes=document.getElementById('fKaraokes'),fFreight=document.getElementById('fFreight'),fAddress=document.getElementById('fAddress'),fPaid=document.getElementById('fPaid'),fPayment=document.getElementById('fPayment'),fStatus=document.getElementById('fStatus'),fNotes=document.getElementById('fNotes'),calcTotal=document.getElementById('calcTotal'),calcPaid=document.getElementById('calcPaid'),calcDue=document.getElementById('calcDue'),stockWarning=document.getElementById('stockWarning');
  document.getElementById('closeModal').onclick=close;document.getElementById('cancelModal').onclick=close;
  const calc=()=>{
    const temp={tables:n(fTables.value),chairs:n(fChairs.value),karaokes:n(fKaraokes.value),freight:n(fFreight.value),paid:n(fPaid.value),priceTable:o?.priceTable??state.settings.priceTable,priceChair:o?.priceChair??state.settings.priceChair,priceKaraoke:o?.priceKaraoke??state.settings.priceKaraoke};
    calcTotal.textContent=money(orderTotal(temp));calcPaid.textContent=money(Math.min(orderTotal(temp),temp.paid));calcDue.textContent=money(orderDue(temp));
    if(hasConfiguredStock()&&fDate.value){const a=availability(fDate.value,o?.id||'');const problems=[];if(temp.tables>a.tables)problems.push(`mesas: disponíveis ${a.tables}`);if(temp.chairs>a.chairs)problems.push(`cadeiras: disponíveis ${a.chairs}`);if(temp.karaokes>a.karaokes)problems.push(`karaokês: disponíveis ${a.karaokes}`);stockWarning.innerHTML=problems.length?`<div class="warning">⚠️ Quantidade acima do estoque nesta data: ${esc(problems.join(' · '))}</div>`:'';}
  };
  [fTables,fChairs,fKaraokes,fFreight,fPaid,fDate].forEach(el=>el.addEventListener('input',calc));calc();
  fClient.onchange=()=>{const c=clientById(fClient.value);if(c){fClientName.value=c.name;fPhone.value=c.phone||'';fAddress.value=c.address||'';}};
  document.getElementById('saveOrder').onclick=()=>{
    let clientId=fClient.value;let client=clientById(clientId);const name=fClientName.value.trim();
    if(!client){if(!name)return alert('Informe o cliente.');client={id:id(),name,phone:fPhone.value.trim(),address:fAddress.value.trim(),notes:''};state.clients.push(client);clientId=client.id;}else{if(fPhone.value.trim())client.phone=fPhone.value.trim();if(fAddress.value.trim())client.address=fAddress.value.trim();}
    if(!fDate.value)return alert('Informe a data do serviço.');
    const next={
      id:o?.id||id(),clientId,clientName:client.name,phone:fPhone.value.trim()||client.phone||'',date:fDate.value,time:fTime.value,
      tables:n(fTables.value),chairs:n(fChairs.value),karaokes:n(fKaraokes.value),freight:n(fFreight.value),address:fAddress.value.trim(),notes:fNotes.value.trim(),paid:n(fPaid.value),paymentMethod:fPayment.value,status:fStatus.value,
      priceTable:o?.priceTable??state.settings.priceTable,priceChair:o?.priceChair??state.settings.priceChair,priceKaraoke:o?.priceKaraoke??state.settings.priceKaraoke,
      createdAt:o?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
    };
    if(!next.tables&&!next.chairs&&!next.karaokes&&!next.freight&&!next.notes)return alert('Informe pelo menos um item, frete ou observação do serviço.');
    if(o)state.orders=state.orders.map(x=>x.id===o.id?next:x);else state.orders.push(next);
    saveState();close();render();toast(o?'Pedido atualizado':'Pedido salvo');
  };
}

function openClientModal(clientId=null){
  const c=clientId?clientById(clientId):null;
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${c?'Editar cliente':'Novo cliente'}</h2><button class="close" id="closeModal">×</button></div><div class="field"><label>Nome</label><input id="cName" value="${esc(c?.name||'')}"></div><div class="field"><label>Telefone / WhatsApp</label><input id="cPhone" inputmode="tel" value="${esc(c?.phone||'')}"></div><div class="field"><label>Endereço</label><input id="cAddress" value="${esc(c?.address||'')}"></div><div class="field"><label>Observações</label><textarea id="cNotes">${esc(c?.notes||'')}</textarea></div><div class="modal-actions"><button class="ghost-btn" id="cancelModal">Cancelar</button><button class="primary-btn" id="saveClient">Salvar cliente</button></div></div></div>`;
  const close=()=>modalRoot.innerHTML='';const closeModal=document.getElementById('closeModal'),cancelModal=document.getElementById('cancelModal'),saveClient=document.getElementById('saveClient'),cName=document.getElementById('cName'),cPhone=document.getElementById('cPhone'),cAddress=document.getElementById('cAddress'),cNotes=document.getElementById('cNotes');
  closeModal.onclick=close;cancelModal.onclick=close;saveClient.onclick=()=>{const name=cName.value.trim();if(!name)return alert('Informe o nome.');const next={id:c?.id||id(),name,phone:cPhone.value.trim(),address:cAddress.value.trim(),notes:cNotes.value.trim()};if(c)state.clients=state.clients.map(x=>x.id===c.id?next:x);else state.clients.push(next);saveState();close();render();toast(c?'Cliente atualizado':'Cliente salvo');};
}

function openExpenseModal(){
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>Nova despesa</h2><button class="close" id="closeModal">×</button></div><div class="field"><label>Descrição</label><input id="eDesc" placeholder="Ex.: combustível, manutenção"></div><div class="field"><label>Valor</label><input id="eValue" type="number" min="0" step="0.01"></div><div class="field"><label>Data</label><input id="eDate" type="date" value="${dateISO()}"></div><div class="modal-actions"><button class="ghost-btn" id="cancelModal">Cancelar</button><button class="primary-btn" id="saveExpense">Salvar</button></div></div></div>`;
  const close=()=>modalRoot.innerHTML='';const closeModal=document.getElementById('closeModal'),cancelModal=document.getElementById('cancelModal'),saveExpense=document.getElementById('saveExpense'),eDesc=document.getElementById('eDesc'),eValue=document.getElementById('eValue'),eDate=document.getElementById('eDate');
  closeModal.onclick=close;cancelModal.onclick=close;saveExpense.onclick=()=>{if(!eDesc.value.trim()||!n(eValue.value))return alert('Informe descrição e valor.');state.expenses.push({id:id(),description:eDesc.value.trim(),value:n(eValue.value),date:eDate.value||dateISO()});saveState();close();render();toast('Despesa registrada');};
}

function openSettings(){
  const s=state.settings;
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>Configurações</h2><button class="close" id="closeModal">×</button></div>
    <div class="settings-section"><h3>Preços padrão</h3><div class="settings-grid"><div class="field"><label>Mesa</label><input id="sPriceTable" type="number" step="0.01" value="${n(s.priceTable)}"></div><div class="field"><label>Cadeira</label><input id="sPriceChair" type="number" step="0.01" value="${n(s.priceChair)}"></div><div class="field"><label>Karaokê</label><input id="sPriceKaraoke" type="number" step="0.01" value="${n(s.priceKaraoke)}"></div></div><p class="note">Pedidos já criados preservam os preços usados no dia da contratação.</p></div>
    <div class="settings-section"><h3>Estoque total</h3><div class="settings-grid"><div class="field"><label>Mesas</label><input id="sStockTables" type="number" min="0" value="${n(s.stockTables)}"></div><div class="field"><label>Cadeiras</label><input id="sStockChairs" type="number" min="0" value="${n(s.stockChairs)}"></div><div class="field"><label>Karaokês</label><input id="sStockKaraokes" type="number" min="0" value="${n(s.stockKaraokes)}"></div></div></div>
    <div class="settings-section"><h3>WhatsApp da empresa</h3><div class="field"><label>Número com DDD</label><input id="sWhatsapp" inputmode="tel" placeholder="Ex.: 21999999999" value="${esc(s.businessWhatsapp||'')}"></div></div>
    <div class="settings-section"><h3>Backup</h3><div class="actions"><button id="exportBackup">Exportar backup</button><button id="importBackup">Importar backup</button><input id="backupFile" type="file" accept="application/json" hidden></div><p class="note">Os dados ficam neste aparelho. Exporte um backup regularmente.</p></div>
    <div class="modal-actions"><button class="ghost-btn" id="cancelModal">Fechar</button><button class="primary-btn" id="saveSettings">Salvar configurações</button></div></div></div>`;
  const close=()=>modalRoot.innerHTML='';const closeModal=document.getElementById('closeModal'),cancelModal=document.getElementById('cancelModal'),saveSettings=document.getElementById('saveSettings'),sPriceTable=document.getElementById('sPriceTable'),sPriceChair=document.getElementById('sPriceChair'),sPriceKaraoke=document.getElementById('sPriceKaraoke'),sStockTables=document.getElementById('sStockTables'),sStockChairs=document.getElementById('sStockChairs'),sStockKaraokes=document.getElementById('sStockKaraokes'),sWhatsapp=document.getElementById('sWhatsapp'),exportBackup=document.getElementById('exportBackup'),importBackup=document.getElementById('importBackup'),backupFile=document.getElementById('backupFile');
  closeModal.onclick=close;cancelModal.onclick=close;
  saveSettings.onclick=()=>{state.settings={...state.settings,priceTable:n(sPriceTable.value),priceChair:n(sPriceChair.value),priceKaraoke:n(sPriceKaraoke.value),stockTables:n(sStockTables.value),stockChairs:n(sStockChairs.value),stockKaraokes:n(sStockKaraokes.value),businessWhatsapp:sWhatsapp.value.trim()};saveState();close();render();toast('Configurações salvas');};
  exportBackup.onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`aluguel-facil-backup-${dateISO()}.json`;a.click();URL.revokeObjectURL(a.href);};
  importBackup.onclick=()=>backupFile.click();backupFile.onchange=async()=>{const file=backupFile.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!parsed||!Array.isArray(parsed.orders)||!Array.isArray(parsed.clients))throw new Error();if(confirm('Substituir os dados atuais pelo backup selecionado?')){state={...clone(defaultState),...parsed,settings:{...clone(defaultState.settings),...(parsed.settings||{})}};saveState();close();render();toast('Backup importado');}}catch{alert('Arquivo de backup inválido.');}};
}

function sendOrderWhatsapp(o){
  const c=clientById(o.clientId);let phone=String(c?.phone||o.phone||'').replace(/\D/g,'');if(phone&&!phone.startsWith('55'))phone='55'+phone;
  const items=[];if(n(o.tables))items.push(`${n(o.tables)} mesa(s)`);if(n(o.chairs))items.push(`${n(o.chairs)} cadeira(s)`);if(n(o.karaokes))items.push(`${n(o.karaokes)} karaokê(s)`);if(n(o.freight))items.push(`frete ${money(o.freight)}`);
  const msg=`Olá${c?.name?', '+c.name:''}!\n\nResumo do seu pedido — Aluguel Fácil\n📅 ${dateBR(o.date)}${o.time?' às '+o.time:''}\n📦 ${items.join(', ')||'Serviço'}${o.address?'\n📍 '+o.address:''}\n💰 Total: ${money(orderTotal(o))}\n✅ Pago: ${money(orderPaid(o))}\n🕒 A receber: ${money(orderDue(o))}${o.notes?'\n📝 '+o.notes:''}`;
  const url=phone?`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`:`https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url,'_blank','noopener');
}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
render();
