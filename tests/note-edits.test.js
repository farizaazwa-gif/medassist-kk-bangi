const test=require('node:test');
const assert=require('node:assert/strict');
const {merge}=require('../assets/note-edits');

test('unchanged note takes fresh form values; unchanged form keeps edits exactly',()=>{
 assert.deepEqual(merge('D4','D4','D5'),{text:'D5',conflicts:0});
 assert.deepEqual(merge('D4','D4\n  Manual note\n','D4'),{text:'D4\n  Manual note\n',conflicts:0});
});
test('manual additions at the beginning, middle and end survive updated form lines',()=>{
 const base='History\nD4\n\nPlan\nReview CM';
 const current='Manual header\nHistory\nD4\nManual detail\n\nPlan\nReview CM\nManual footer';
 const fresh='History\nD5\n\nPlan\nReview CM';
 const expected=current.replace('D4','D5');
 assert.equal(merge(base,current,fresh).text,expected);
 assert.equal(merge(fresh,expected,fresh).text,expected);
});
test('manual replacements and deletions survive unrelated form changes',()=>{
 assert.deepEqual(merge('D4\nold symptom\nremove me\nPlan','D4\nClinician wording\nPlan','D5\nold symptom\nremove me\nPlan'),{text:'D5\nClinician wording\nPlan',conflicts:0});
});
test('overlapping edits keep the manual version and flag a review',()=>{
 assert.deepEqual(merge('History\nD4\nPlan','History\nD4 per patient\nPlan','History\nD5\nPlan'),{text:'History\nD4 per patient\nPlan',conflicts:1});
});
test('same inserted line is not duplicated; distinct additions are both retained',()=>{
 assert.deepEqual(merge('History\nPlan','History\nNew detail\nPlan','History\nNew detail\nUpdated plan'),{text:'History\nNew detail\nUpdated plan',conflicts:0});
 assert.equal(merge('History\nPlan','History\nPlan\nManual footer','History\nPlan\nNew form detail').text,'History\nPlan\nNew form detail\nManual footer');
});
test('blank lines, literal HTML and Unicode manual text remain plain text',()=>{
 const current='D4\n\n  <script>alert(1)</script> — µmol/L\n';
 assert.equal(merge('D4\n',current,'D5\n').text,current.replace('D4','D5'));
});
test('manual changes remain stable across successive fresh generations',()=>{
 let base='A\nD4\nB\nPlan',current='Manual start\nA\nD4\nEdited B\nPlan\nManual end';
 for(let day=5;day<20;day++){
  const fresh='A\nD'+day+'\nB\nPlan';current=merge(base,current,fresh).text;base=fresh;
  assert.equal(current,'Manual start\nA\nD'+day+'\nEdited B\nPlan\nManual end');
 }
});
test('large overlapping replacements retain manual content with bounded diff work',()=>{
 const base=Array.from({length:2100},(_,i)=>'base '+i).join('\n');
 const current=Array.from({length:2100},(_,i)=>'manual '+i).join('\n');
 const fresh=Array.from({length:2100},(_,i)=>'form '+i).join('\n');
 assert.deepEqual(merge(base,current,fresh),{text:current,conflicts:1});
});
test('overlap review survives repeated generation and clears on reset',()=>{
 const api=require('../assets/note-edits'),fields={clOutput:{value:''},clOutputHint:{textContent:''}};
 global.document={getElementById:id=>fields[id]};
 try{
  api.clear('cl');api.write('clOutput','D4');fields.clOutput.value='D4 per patient';
  api.write('clOutput','D5');api.write('clOutput','D5');
  assert.equal(fields.clOutput.value,'D4 per patient');assert.match(fields.clOutputHint.textContent,/edited lines also changed/);
  api.clear('cl');fields.clOutput.value='';api.write('clOutput','New patient');
  assert.equal(fields.clOutput.value,'New patient');assert.doesNotMatch(fields.clOutputHint.textContent,/edited lines also changed/);
 }finally{delete global.document;}
});
