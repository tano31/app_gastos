(function () {
  'use strict';
  function dayKey(date) {
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  }
  function aggregate(movements, months, method, now = new Date(), currency = 'BRL', selectedMonths = null) {
    if (!['BRL','ARS','USD'].includes(currency)) currency='BRL';
    const amountField={BRL:'monto',ARS:'monto_ars',USD:'monto_usd'}[currency];
    if (![1,3,6,12].includes(months)) months = 1;
    const start = new Date(now.getFullYear(),selectedMonths&&months!==1?0:now.getMonth()-months+1,1);
    const startKey = dayKey(start), endKey = dayKey(now);
    const monthly = Array.from({length:months},(_,i) => ({month:dayKey(new Date(start.getFullYear(),start.getMonth()+i,1)).slice(0,7),total:0,fixed:0,variable:0,income:0,categories:new Map()}));
    const byMonth = new Map(monthly.map(item=>[item.month,item]));
    const daily = months === 1 ? Array.from({length:now.getDate()},(_,i)=>({date:dayKey(new Date(now.getFullYear(),now.getMonth(),i+1)),total:0,fixed:0,variable:0,income:0})) : [];
    const byDay = new Map(daily.map(item=>[item.date,item]));
    const categories = new Map(), merchants = new Map();
    let total = 0, count = 0, refunds = 0, incomeCount = 0, missingConversions = 0, pricedMovements = 0;
    movements.forEach(item => {
      if (!item || !['gasto_fijo','gasto_variable','ingreso'].includes(item.tipo) || (method && String(item.medioPago || '') !== method)) return;
      const date = String(item.fecha || '').slice(0,10), originalAmount = Number(item.monto);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < startKey || date > endKey || item.monto === '' || !Number.isFinite(originalAmount) || originalAmount === 0) return;
      const parsed = new Date(date + 'T12:00:00Z');
      if(selectedMonths&&!selectedMonths.has(Number(date.slice(5,7))-1))return;
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date) return;
      const month = byMonth.get(date.slice(0,7));
      if (!month) return;
      month.movementCount=(month.movementCount||0)+1;
      if(item.tipo==='ingreso') incomeCount++; else if(originalAmount>0) count++; else refunds++;
      const rawAmount=item[amountField], amount=Number(rawAmount);
      if(rawAmount===null || rawAmount===undefined || String(rawAmount).trim()==='' || !Number.isFinite(amount)) {missingConversions++; month.missingConversions=(month.missingConversions||0)+1; return;}
      pricedMovements++;
      const day = byDay.get(date);
      if (item.tipo === 'ingreso') {month.income += amount; if(day) day.income += amount; return;}
      const category = String(item.categoria || '').trim(), merchant = String(item.descripcion || '').trim();
      total += amount; month.total += amount;
      const expenseType = item.tipo === 'gasto_fijo' ? 'fixed' : 'variable';
      month[expenseType] += amount;
      if(day) day[expenseType] += amount;
      if(day) day.total += amount;
      categories.set(category,(categories.get(category)||0)+amount);
      month.categories.set(category,(month.categories.get(category)||0)+amount);
      merchants.set(merchant,(merchants.get(merchant)||0)+amount);
    });
    const rank = map => Array.from(map,([name,value])=>({name,value})).sort((a,b)=>b.value-a.value || a.name.localeCompare(b.name));
    const ranked = rank(categories), leading = ranked.find(item=>item.value>0);
    const days = selectedMonths?Math.max(1,Array.from(selectedMonths).reduce((sum,month)=>sum+(month===now.getMonth()?now.getDate():month<now.getMonth()?new Date(now.getFullYear(),month+1,0).getDate():0),0)):Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()))/86400000)+1;
    let accumulatedExpenses=0, accumulatedIncome=0, accumulatedFixed=0, accumulatedVariable=0;
    daily.forEach(day=>{accumulatedExpenses+=day.total; accumulatedIncome+=day.income; accumulatedFixed+=day.fixed; accumulatedVariable+=day.variable; day.total=accumulatedExpenses; day.fixed=accumulatedFixed; day.variable=accumulatedVariable; day.income=accumulatedIncome; day.balance=day.income-day.total;});
    return {total,count,refunds,incomeCount,missingConversions,pricedMovements,currency,days,average:total/days,leading:leading || null,monthly,daily,categories:ranked,merchants:rank(merchants),start:startKey,end:endKey};
  }
  window.DashboardData = {aggregate,dayKey};
})();
