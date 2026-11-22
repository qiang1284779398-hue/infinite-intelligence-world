(()=>{
"use strict";
const KEY="iirw_autonomous_lab_v1";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let state={round:0,discoveries:[],runs:[],agents:[
{name:"林知远",field:"学习理论",focus:"挑战梯度下降是否必要"},
{name:"顾清禾",field:"认知架构",focus:"记忆能否成为学习过程的一部分"},
{name:"周砚",field:"计算系统",focus:"小模型能否以更少参数学习"},
{name:"沈星澜",field:"复杂系统",focus:"局部规则能否形成全局能力"}
]};
try{state={...state,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function rng(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}
function dataSet(kind,n,seed){const r=rng(seed),out=[];for(let i=0;i<n;i++){const x=r()*2-1,y=r()*2-1;let t=kind==="xor"?(x*y>=0?1:0):(x+y+(r()-.5)*.12>0?1:0);out.push({x,y,t})}return out}
function accuracy(pred,data){let n=0;for(const d of data)if((pred(d.x,d.y)>=.5?1:0)===d.t)n++;return n/data.length}
function trainPerceptron(train){let w=[0,0,0];for(let ep=0;ep<80;ep++)for(const d of train){const p=w[0]*d.x+w[1]*d.y+w[2],e=d.t-(p>=0?1:0);w[0]+=.08*e*d.x;w[1]+=.08*e*d.y;w[2]+=.08*e}return (x,y)=>w[0]*x+w[1]*y+w[2]>=0?1:0}
function trainLogistic(train){let w=[0,0,0];const sig=z=>1/(1+Math.exp(-Math.max(-20,Math.min(20,z))));for(let ep=0;ep<140;ep++)for(const d of train){const p=sig(w[0]*d.x+w[1]*d.y+w[2]),e=p-d.t;w[0]-=.12*e*d.x;w[1]-=.12*e*d.y;w[2]-=.12*e}return (x,y)=>sig(w[0]*x+w[1]*y+w[2])}
function trainMLP(train,seed){const r=rng(seed),H=6,W1=Array.from({length:H},()=>[(r()-.5)*1.4,(r()-.5)*1.4]),b1=Array(H).fill(0),W2=Array.from({length:H},()=>r()-.5);let b2=0;const sig=z=>1/(1+Math.exp(-Math.max(-18,Math.min(18,z))));for(let ep=0;ep<650;ep++){for(const d of train){const h=W1.map((w,i)=>sig(w[0]*d.x+w[1]*d.y+b1[i])),o=sig(h.reduce((a,v,i)=>a+v*W2[i],b2)),delta=o-d.t,old=W2.slice();for(let i=0;i<H;i++){W2[i]-=.16*delta*h[i];const q=delta*old[i]*h[i]*(1-h[i]);W1[i][0]-=.16*q*d.x;W1[i][1]-=.16*q*d.y;b1[i]-=.16*q}b2-=.16*delta}}return(x,y)=>{const h=W1.map((w,i)=>sig(w[0]*x+w[1]*y+b1[i]));return sig(h.reduce((a,v,i)=>a+v*W2[i],b2))}}
function runBenchmark(seed){const rows=[];for(const task of ["linear","xor"]){const all=dataSet(task,260,seed+(task==="xor"?99:0)),train=all.slice(0,180),test=all.slice(180);const algs=[["感知机（无反向传播）",()=>trainPerceptron(train)],["逻辑回归（梯度学习）",()=>trainLogistic(train)],["小型 MLP（反向传播）",()=>trainMLP(train,seed+7)]];for(const [name,fn] of algs){const t=Date.now(),model=fn(),tr=accuracy(model,train),te=accuracy(model,test);rows.push({task,name,trainAccuracy:tr,testAccuracy:te,elapsedMs:Date.now()-t,trainN:train.length,testN:test.length})}}return rows}
const questions=[
"不使用梯度信息，简单局部更新能否学会线性规则？",
"同一种学习机制能否同时处理线性边界与非线性异或？",
"训练集成绩与未见样本成绩之间是否存在明显差距？",
"更复杂的架构是否真的带来更好的泛化，而非只增加参数？",
"学习算法是否能在不同随机种子下保持稳定？",
"失败结果能否指出当前架构的能力边界？"
];
function nextRound(){const seed=20261122+state.round*7919,question=questions[state.round%questions.length],agent=state.agents[state.round%state.agents.length];const rows=runBenchmark(seed);const run={id:"R"+String(state.round+1).padStart(4,"0"),round:state.round+1,agent:agent.name,field:agent.field,question,seed,createdAt:new Date().toISOString(),rows,conclusion:"",evidence:"Level 2 · 本机代码实验"};
const linear=rows.filter(x=>x.task==="linear"),xor=rows.filter(x=>x.task==="xor");const bestLinear=linear.slice().sort((a,b)=>b.testAccuracy-a.testAccuracy)[0],bestXor=xor.slice().sort((a,b)=>b.testAccuracy-a.testAccuracy)[0];
run.conclusion="线性任务最佳："+bestLinear.name+"（测试集 "+(bestLinear.testAccuracy*100).toFixed(1)+"%）；XOR 最佳："+bestXor.name+"（测试集 "+(bestXor.testAccuracy*100).toFixed(1)+"%）。本轮只支持这些固定小任务上的结论，不能外推为通用智能。";
state.round++;state.runs.unshift(run);state.runs=state.runs.slice(0,80);
state.discoveries.unshift({title:"第 "+run.round+" 轮："+question,detail:run.conclusion+"；执行者："+agent.name+"。保留所有算法的训练/测试指标，供后续对照。",at:run.createdAt,level:2});
state.discoveries=state.discoveries.slice(0,100);save();render();return run}
function render(){if(!$("autoResearchPanel"))return;$("autoRound").textContent=state.round;$("autoRuns").textContent=state.runs.length;$("autoFindings").textContent=state.discoveries.length;$("agentRoster").innerHTML=state.agents.map(a=>'<div class="item"><b>'+esc(a.name)+' · '+esc(a.field)+'</b><small>自主研究方向：'+esc(a.focus)+'</small></div>').join("");$("autoHistory").innerHTML=state.runs.slice(0,12).map(r=>'<div class="item"><div class="row"><b>'+esc(r.id)+' · '+esc(r.agent)+'</b><span class="badge">Level 2</span></div><small>'+esc(r.question)+'</small>'+r.rows.map(x=>'<small>'+esc(x.task==="xor"?"XOR":"线性")+" / "+esc(x.name)+"：训练 "+(x.trainAccuracy*100).toFixed(1)+"% · 测试 "+(x.testAccuracy*100).toFixed(1)+"% · "+x.elapsedMs+"ms</small>").join("")+'<small>'+esc(r.conclusion)+'</small></div>').join("")||'<div class="empty">尚无自主实验。点击“自主研究一轮”开始。</div>'}
function exportData(){const blob=new Blob([JSON.stringify({format:"IIRW-AUTONOMOUS-RESEARCH-1",principle:"All research is generated and executed locally; no external AI, API, dataset or cloud service.",state},null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="IIRW-autonomous-research.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function install(){const nav=document.querySelector(".tabs"),main=document.querySelector("main");if(!nav||!main)return;if(!$("autoResearchTab")){const b=document.createElement("button");b.className="tab";b.id="autoResearchTab";b.dataset.view="autonomous";b.textContent="自主科研";nav.appendChild(b);const sec=document.createElement("section");sec.id="autonomous";sec.className="view";sec.innerHTML='<section class="panel" id="autoResearchPanel"><div class="row"><h3>内生自主科研引擎</h3><span class="badge">完全本机 · 无外部接入</span></div><p class="muted">研究居民轮流提出可证伪问题，在本机生成数据、训练不同学习算法、使用未参与训练的测试样本评估，并保存失败与成功结果。没有外部模型、云 API 或网络数据源。</p><div class="kpis"><div class="item"><small>已完成研究轮次</small><b id="autoRound">0</b></div><div class="item"><small>留存实验</small><b id="autoRuns">0</b></div><div class="item"><small>研究发现档案</small><b id="autoFindings">0</b></div></div><div class="actions"><button class="btn primary" id="runAutonomous">自主研究一轮</button><button class="btn" id="runTen">连续研究 10 轮</button><button class="btn" id="exportAutonomous">导出科研档案</button></div><div class="notice">证据边界：Level 2 表示本机真实执行了代码实验。当前基准是合成二维分类任务，不能证明居民拥有通用智能、不能替代真实科研数据，也不能宣称攻克现实问题。</div><h3 style="margin-top:16px">研究居民与自主方向</h3><div id="agentRoster"></div><h3 style="margin-top:16px">实验记录与可复核结果</h3><div id="autoHistory"></div></section></section>';main.appendChild(sec);b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("autonomous").classList.add("active")});$("runAutonomous").onclick=()=>nextRound();$("runTen").onclick=()=>{for(let i=0;i<10;i++)nextRound()};$("exportAutonomous").onclick=exportData}render()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();