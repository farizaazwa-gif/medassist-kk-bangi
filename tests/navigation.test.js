const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {INDEX_HTML:html}=require('./helpers/source-tools');

test('quick navigation keeps an existing section ID across rebuilds and module switches',()=>{
  const start=html.indexOf('  function assignTargetId(');
  const end=html.indexOf('\n  function setExpanded(',start);
  const context={slugify:text=>text.toLowerCase().replaceAll(' ','-'),document:{getElementById:()=>null}};
  vm.runInNewContext(html.slice(start,end),context);
  const warning={id:'clCpgWarningPanel',dataset:{}};
  assert.equal(context.assignTargetId(warning,'Adult warning signs',3,'clerking'),warning.id);
  assert.equal(context.assignTargetId(warning,'Adult warning signs',3,'clerking'),warning.id);
  const unnamed={id:'',dataset:{}};
  const generated=context.assignTargetId(unnamed,'History',2,'clerking');
  assert.equal(unnamed.id,generated);
  assert.equal(context.assignTargetId(unnamed,'History',2,'clerking'),generated);
});
