const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../assets/dengue-cpg4.js');
const { INDEX_HTML: html } = require('./helpers/source-tools.js');
const ui = fs.readFileSync(path.join(__dirname, '../assets/dengue-cpg4-ui.js'), 'utf8');
const newCase = html.slice(html.indexOf('function dengueUrineWarningLine(){'), html.indexOf('function dengueActivityLine(){'));
const followUp = html.slice(html.indexOf('  const assessedUrine='), html.indexOf('  const examinationLines=', html.indexOf('  const assessedUrine=')));

function copiedUrine(p, overrides = {}) {
  const values = {
    dfGroup:'adult', dfuGroup:'adult', clDxType:'Dengue fever', clUrine:'no', dfuUrine:'normal',
    [`${p}Phase`]:'critical phase', [`${p}Weight`]:'60', [`${p}Height`]:'170', [`${p}Sex`]:'Male',
    ...overrides
  };
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id,
    typeof value === 'boolean' ? {checked:value,value:''} : {value:String(value),checked:false}]));
  const value = id => elements[id]?.value || '';
  const context = {
    window:{MedAssistDengueCpg4:C}, value, fv:value,
    document:{readyState:'loading', addEventListener(){}, getElementById:id=>elements[id], querySelectorAll:()=>[]}
  };
  vm.runInNewContext(ui, context);
  vm.runInNewContext(p === 'cl'
    ? `${newCase}\nresult=dengueUrineWarningLine();`
    : `${followUp}\nresult=salientLines.find(line=>line.startsWith('Urine output:'));`, context);
  return context.result;
}

for (const p of ['cl','dfu']) {
  test(`${p} copied clerking does not describe measured absent urine as normal`, () => {
    const output = copiedUrine(p, {[`${p}CpgUrineMl`]:'0',[`${p}CpgUrineHours`]:'6'});
    assert.match(output, /no urine output/);
    assert.doesNotMatch(output, /normal/);
  });
  test(`${p} copied clerking respects the measured urine boundary and frequency review`, () => {
    assert.match(copiedUrine(p, {[`${p}CpgUrineMl`]:'120',[`${p}CpgUrineHours`]:'4'}), /normal/);
    assert.match(copiedUrine(p, {[`${p}CpgUrineMl`]:'119',[`${p}CpgUrineHours`]:'4'}), /reduced/);
    assert.match(copiedUrine(p, {[`${p}CpgVoids`]:'2'}), /review required/);
  });
  test(`${p} paediatric copied clerking ignores hidden adult urine measurements`, () => {
    const output = copiedUrine(p, {dfGroup:'paeds',dfuGroup:'paeds',[`${p}CpgUrineMl`]:'0',[`${p}CpgUrineHours`]:'6'});
    assert.match(output, /normal/);
    assert.doesNotMatch(output, /no urine output/);
  });
}
