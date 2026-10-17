import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { FeatureOptions } from 'homebridge-plugin-utils';
import { messages, selectLanguage } from '../public/i18n.mjs';
import { probeSettings, stableId, validateProjector, validateSettings } from '../public/settings-model.mjs';

const saved = { host:'old.example', id:'Cinema_A', language:'zh-CN', password:'test-only', protocol:'sdcp', port:53484, capabilities:{inputs:['hdmi1']}, customFutureField:{a:1} };
test('connection test uses the current edit and keeps explicit protocol, numeric port and an empty password',()=>{
  const draft=structuredClone(saved);draft.host=' new.example ';draft.port='54000';draft.password='';
  const before=JSON.stringify(draft);const {settings}=probeSettings(draft);
  assert.equal(settings.host,'new.example');assert.equal(settings.port,54000);assert.equal(settings.password,'');assert.equal(settings.protocol,'sdcp');
  assert.equal(settings.id,saved.id);assert.deepEqual(settings.capabilities,saved.capabilities);assert.deepEqual(settings.customFutureField,saved.customFutureField);
  assert.equal(JSON.stringify(draft),before);assert.equal(saved.host,'old.example');
});
test('connection settings reject invalid ports or an ambiguous custom port before contacting a device',()=>{
  for(const port of [0,65536,1.5,'abc'])assert.equal(probeSettings({...saved,port}).errors.port,'validationPort');
  assert.equal(probeSettings({...saved,protocol:'auto'}).errors.protocol,'validationProtocol');
  for(const port of [1,65535,'53595'])assert.ok(probeSettings({...saved,port}).settings);
  assert.equal(probeSettings({...saved,port:undefined,protocol:'auto'}).settings.port,undefined);
});
test('default credentials apply only when omitted and do not replace an empty password',()=>{
  assert.equal(probeSettings({host:'pj.example'}).settings.password,'Projector');
  assert.equal(probeSettings({host:'pj.example',password:''}).settings.password,'');
  assert.equal(probeSettings({host:'pj.example',username:' '}).settings.username,'root');
});
test('invalid or duplicate identity, community and capability overrides cannot be saved',()=>{
  assert.equal(validateProjector({...saved,host:'bad host;cmd'}).host,'validationHost');
  assert.equal(validateProjector({...saved,id:'bad.id'}).id,'validationId');
  assert.equal(validateProjector({...saved,community:'LONGER'}).community,'validationCommunity');
  assert.equal(validateProjector({...saved,capabilities:{hdrModes:['bad token']}})['capabilities.hdrModes'],'validationTokens');
  assert.equal(validateSettings({projectors:[saved,{...saved,host:'other'}]})[1].host,'validationDuplicate');
});
test('both languages cover every screen and preserve matching feature option keys',()=>{
  assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages['zh-CN']).sort());
  assert.deepEqual(Object.keys(messages.en.options).sort(),Object.keys(messages['zh-CN'].options).sort());
  assert.deepEqual(Object.keys(messages.en.choices).sort(),Object.keys(messages['zh-CN'].choices).sort());
  for(const copy of Object.values(messages))for(const required of ['showPassword','hidePassword','test','advanced','validationPort','cooling','settings','features','help'])assert.ok(copy[required]);
  assert.equal(selectLanguage(undefined,'zh-TW'),'zh-CN');assert.equal(selectLanguage('en','zh-CN'),'en');assert.equal(selectLanguage('zh-CN','en'),'zh-CN');
});
test('language preference does not change stable device IDs or configured accessory names',()=>{
  const config={projectors:[structuredClone(saved)],uiLanguage:'en',_bridge:{username:'test-identity'}};const before=structuredClone(config.projectors);
  config.uiLanguage='zh-CN';assert.deepEqual(config.projectors,before);assert.equal(stableId(saved),'cinema_a');assert.equal(config._bridge.username,'test-identity');
});
test('scoped feature edits preserve other projectors and unknown future options',()=>{
  const model=new FeatureOptions([{name:'Sensors'}],{Sensors:[{name:'Cooling',description:'Cooling',default:false}]},['Enable.Sensors.Cooling','Disable.Sensors.Cooling.other','Enable.Future.Unknown']);
  model.setOption({option:'Sensors.Cooling',id:'cinema_a',enabled:false});assert.equal(model.test('Sensors.Cooling','cinema_a'),false);assert.equal(model.test('Sensors.Cooling','other'),false);assert.equal(model.test('Sensors.Cooling','new'),true);
  assert.ok(model.configuredOptions.includes('Enable.Future.Unknown'));model.clearOption({option:'Sensors.Cooling',id:'cinema_a'});assert.equal(model.test('Sensors.Cooling','cinema_a'),true);
});
test('schema fallback renders port as a numeric entry while platform and package identities stay stable',()=>{
  const schema=JSON.parse(readFileSync(new URL('../../config.schema.json',import.meta.url)));const pkg=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url)));
  assert.equal(schema.schema.properties.projectors.items.properties.port['x-schema-form'].type,'number');assert.equal(schema.pluginAlias,'SonyProjectorUnified');assert.equal(pkg.name,'homebridge-sony-projector-control');assert.equal(pkg.displayName,'Sony Projector Control');
});
test('every shipped feature and remote choice has complete Chinese and English UI copy',async()=>{
  const {featureOptionCategories,featureOptions}=await import('../../src/options.ts');
  for(const lang of ['en','zh-CN'])for(const category of featureOptionCategories){
    assert.ok(messages[lang].categories[category.name],category.name);
    for(const option of featureOptions[category.name]){
      const key=category.name+(option.name?'.'+option.name:'');assert.equal(messages[lang].options[key].length,2,key);
      for(const choice of option.choices||[])assert.ok(messages[lang].choices[choice.value],choice.value);
    }
  }
});
