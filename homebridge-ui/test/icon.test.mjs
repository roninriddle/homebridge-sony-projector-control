import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('icon adapter covers every installed-metadata path, preserves backups and is idempotent',()=>{
  const root=mkdtempSync(join(tmpdir(),'sony-icon-'));
  try {
    writeFileSync(join(root,'package.json'),JSON.stringify({version:'5.29.0'}));
    mkdirSync(join(root,'dist/modules/plugins'),{recursive:true});
    const target=join(root,'dist/modules/plugins/plugins.service.js');
    const source='icon: this.pluginIcons[pkgJson.name] ? `${this.pluginListUrl}${this.pluginIcons[pkgJson.name]}` : null,\n';
    writeFileSync(target,source.repeat(2));
    const script=fileURLToPath(new URL('../../scripts/install-homebridge-ui-icon.mjs',import.meta.url));
    execFileSync(process.execPath,[script,root]);
    const updated=readFileSync(target,'utf8');assert.equal(updated.split('/* sony-projector-control-icon */').length,3);
    assert.equal(readFileSync(target+'.before-sony-projector-control','utf8'),source.repeat(2));
    execFileSync(process.execPath,[script,root]);assert.equal(readFileSync(target,'utf8'),updated);
    writeFileSync(join(root,'package.json'),JSON.stringify({version:'5.30.0'}));
    assert.throws(()=>execFileSync(process.execPath,[script,root],{stdio:'pipe'}));assert.equal(readFileSync(target,'utf8'),updated);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('native loader overlay removes only the obsolete diagnostic and survives a repeated build',()=>{
  const root=mkdtempSync(join(tmpdir(),'sony-loader-'));
  try {
    const path=join(root,'index.html');
    const html='before\n      if(typeof import.meta.resolve !== "function") {\n old diagnostic\n    } else {\n\n      window.webUiBoot.fail("manifest", error);\n    }\nafter';
    writeFileSync(path,html);
    const script=fileURLToPath(new URL('../../scripts/prepare-native-loader.mjs',import.meta.url));
    execFileSync(process.execPath,[script,path]);const first=readFileSync(path,'utf8');
    assert.ok(!first.includes('import.meta.resolve'));assert.ok(first.includes('window.webUiBoot.fail("import", error)'));assert.ok(first.includes('window.webUiBoot.fail("manifest", error)'));
    execFileSync(process.execPath,[script,path]);assert.equal(readFileSync(path,'utf8'),first);
    writeFileSync(path,'unexpected template');assert.throws(()=>execFileSync(process.execPath,[script,path],{stdio:'pipe'}));assert.equal(readFileSync(path,'utf8'),'unexpected template');
  }finally{rmSync(root,{recursive:true,force:true});}
});
