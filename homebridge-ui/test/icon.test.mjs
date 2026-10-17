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
