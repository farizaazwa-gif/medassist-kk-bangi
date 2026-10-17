(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MedAssistNoteEdits=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  // Baselines live only in this page. Reset / opening another draft clears them.
  const states=new Map();
  function changes(base,next){
    let start=0,end=base.length,stop=next.length;
    while(start<end&&start<stop&&base[start]===next[start])start++;
    while(end>start&&stop>start&&base[end-1]===next[stop-1]){end--;stop--;}
    if(start===end&&start===stop)return [];
    const a=base.slice(start,end),b=next.slice(start,stop),n=a.length,m=b.length;
    // Bound work for very large pasted notes; the whole edited span is retained.
    if(n*m>4000000)return [{start,end,lines:b}];
    const dp=Array.from({length:n+1},()=>new Uint32Array(m+1));
    for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    const out=[];let i=0,j=0,edit=null;
    const flush=()=>{if(edit){out.push(edit);edit=null;}};
    while(i<n||j<m){
      if(i<n&&j<m&&a[i]===b[j]){flush();i++;j++;continue;}
      if(!edit)edit={start:start+i,end:start+i,lines:[]};
      if(j<m&&(i===n||dp[i][j+1]>dp[i+1][j]))edit.lines.push(b[j++]);
      else{edit.end=start+(++i);}
    }
    flush();return out;
  }
  function overlaps(a,b){
    if(a.start===a.end&&b.start===b.end)return a.start===b.start;
    if(a.start===a.end)return a.start>b.start&&a.start<b.end;
    if(b.start===b.end)return b.start>a.start&&b.start<a.end;
    return a.start<b.end&&b.start<a.end;
  }
  function apply(base,start,end,edits){
    let at=start;const out=[];
    for(const e of edits){out.push(...base.slice(at,e.start),...e.lines);at=e.end;}
    out.push(...base.slice(at,end));return out;
  }
  function merge(base,current,fresh){
    if(current===base||current===fresh)return {text:fresh,conflicts:0};
    if(fresh===base)return {text:current,conflicts:0};
    const lines=base.split('\n');
    const automatic=changes(lines,fresh.split('\n'));
    const manual=changes(lines,current.split('\n')).filter(e=>!(e.start===e.end&&automatic.some(a=>
      (a.start===e.start&&e.lines.every((line,i)=>line===a.lines[i]))||
      (a.end===e.start&&e.lines.every((line,i)=>line===a.lines[a.lines.length-e.lines.length+i]))
    )));
    const edits=[...manual.map(e=>({...e,manual:true})),...automatic.map(e=>({...e,manual:false}))]
      .sort((a,b)=>a.start-b.start||a.end-b.end);
    const groups=[];
    for(const edit of edits){
      const group=groups.at(-1);
      if(group&&group.some(e=>overlaps(e,edit)))group.push(edit);else groups.push([edit]);
    }
    const out=[];let at=0,conflicts=0;
    for(const group of groups){
      const start=Math.min(...group.map(e=>e.start)),end=Math.max(...group.map(e=>e.end));
      out.push(...lines.slice(at,start));
      const manual=group.filter(e=>e.manual),auto=group.filter(e=>!e.manual);
      let kept=apply(lines,start,end,manual.length?manual:auto);
      if(manual.length&&auto.length){
        const generated=apply(lines,start,end,auto);
        if(start===end&&kept.join('\n')!==generated.join('\n'))kept=[...generated,...kept];
        else if(kept.join('\n')!==generated.join('\n'))conflicts++;
      }
      out.push(...kept);at=end;
    }
    out.push(...lines.slice(at));return {text:out.join('\n'),conflicts};
  }
  function write(id,fresh){
    const field=document.getElementById(id);if(!field)return fresh;
    const state=states.get(id),current=field.value;
    const result=state&&current?merge(state.base,current,fresh):{text:current&&current!==fresh?fresh+'\n\n'+current:fresh,conflicts:0};
    const conflicts=result.conflicts||(state?.conflicts&&result.text!==fresh?state.conflicts:0);
    field.value=result.text;states.set(id,{base:fresh,conflicts});
    const hint=document.getElementById(id+'Hint');
    if(hint)hint.textContent=conflicts
      ?'Manual edits kept. Some edited lines also changed in the form; review these lines before copying.'
      :'Editable. Manual additions and edits are kept when you generate again.';
    return result.text;
  }
  function clear(prefix){
    for(const id of states.keys())if(id.startsWith(prefix))states.delete(id);
    for(const suffix of ['Output','ReferralOutput']){
      const hint=document.getElementById(prefix+suffix+'Hint');
      if(hint)hint.textContent='Editable. Manual additions and edits are kept when you generate again.';
    }
  }
  function begin(prefix){
    const status=document.getElementById(prefix+'CpgValidation');
    if(status){status.textContent='';status.classList.add('hidden');}
  }
  return {merge,write,clear,begin};
});
