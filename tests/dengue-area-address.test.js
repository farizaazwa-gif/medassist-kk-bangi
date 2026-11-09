const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { INDEX_HTML: html } = require('./helpers/source-tools.js');

const fieldStart = html.indexOf('<div class="cl-area-field">');
const fieldHtml = html.slice(fieldStart, html.indexOf('<div>', html.indexOf('clAreaIdengueLink', fieldStart)));
const fnStart = html.indexOf('function syncDengueAreaAddress(){');
const fnSource = html.slice(fnStart, html.indexOf('\n}', fnStart) + 2);

function runSync(addressValue) {
  const classes = new Set(['hidden']);
  const elements = {
    clAddress: { value: addressValue },
    clAreaAddress: { classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } },
    clAreaAddressText: { textContent: 'stale' },
    clArea: { value: 'no' }
  };
  const context = { $: id => elements[id], String };
  vm.runInNewContext(`${fnSource}\nsyncDengueAreaAddress();`, context);
  return { text: elements.clAreaAddressText.textContent, hidden: classes.has('hidden'), area: elements.clArea.value };
}

test('dengue-prone area keeps its yes/no question with a small iDengue link underneath', () => {
  assert.ok(fieldStart > 0, 'dengue-prone area field must exist');
  assert.match(fieldHtml, /<select id="clArea"><option>no<\/option><option>yes<\/option><\/select>/);
  assert.ok(fieldHtml.indexOf('id="clArea"') < fieldHtml.indexOf('clAreaIdengueLink'), 'link sits below the question');
  assert.match(fieldHtml, /class="helper cl-area-link"><a id="clAreaIdengueLink" href="https:\/\/idengue\.mysa\.gov\.my\/ide_v3\/index\.php" target="_blank" rel="noopener noreferrer"/);
});

test('address reference is hidden by default and not a form field', () => {
  assert.match(fieldHtml, /class="helper cl-area-address hidden" id="clAreaAddress"/);
  assert.match(fieldHtml, /<span id="clAreaAddressText"><\/span>/);
  assert.doesNotMatch(fieldHtml, /<input[^>]*clAreaAddress/);
});

test('address entered above is shown under the dengue-prone area question', () => {
  const result = runSync('  No 12, Jalan 3/1,\n Bandar Baru Bangi  ');
  assert.equal(result.text, 'No 12, Jalan 3/1, Bandar Baru Bangi');
  assert.equal(result.hidden, false);
});

test('no address means nothing is extracted', () => {
  for (const empty of ['', '   ', '\n']) {
    const result = runSync(empty);
    assert.equal(result.text, '');
    assert.equal(result.hidden, true);
  }
});

test('the address never answers the dengue-prone area question', () => {
  assert.equal(runSync('Taman Hotspot, Kajang').area, 'no');
  assert.doesNotMatch(fnSource, /clArea"\)\.value\s*=|clArea\b[^A-Za-z]/);
});

test('address display is wired to typing, reset and draft restore events', () => {
  assert.match(html, /\$\("clAddress"\)\?\.addEventListener\("input",syncDengueAreaAddress\)/);
  assert.match(html, /\$\("clAddress"\)\?\.addEventListener\("change",syncDengueAreaAddress\)/);
});
