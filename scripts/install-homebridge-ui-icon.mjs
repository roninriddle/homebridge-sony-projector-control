/* Explicit, reversible compatibility adapter for Homebridge UI 5.29's private-plugin cards.
 * Never runs during package installation. Curated icons retain precedence.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const uiRoot=resolve(process.argv[2] || '');
if(!process.argv[2])throw Error('Usage: node scripts/install-homebridge-ui-icon.mjs /absolute/path/homebridge-config-ui-x');
const version=JSON.parse(readFileSync(resolve(uiRoot,'package.json'))).version;
if(version!=='5.29.0')throw Error('Unsupported Homebridge UI version; no files changed.');
const target=resolve(uiRoot,'dist/modules/plugins/plugins.service.js');
const current=readFileSync(target,'utf8');
const backup=target+'.before-sony-projector-control';
const source=current.includes('/* sony-projector-control-icon */') && existsSync(backup) ? readFileSync(backup,'utf8') : current;
// Match the icon expression rather than unrelated nullable metadata.
const expression=/icon: this\.pluginIcons\[pkgJson\.name\][\s\S]{0,220}?: null,/g;
const match=source.match(expression);
if(!match)throw Error('Unexpected plugin metadata implementation; no files changed.');
const icon=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../homebridge-ui/public/projector.svg'));
const data='data:image/svg+xml;base64,'+icon.toString('base64');
const updated=source.replace(expression,expression=>expression.replace(': null,',': (pkgJson.name === "homebridge-sony-projector-control" ? '+JSON.stringify(data)+' : null), /* sony-projector-control-icon */'));
if(current===updated){console.log('Icon adapter already installed.');process.exit(0);}
if(!existsSync(backup))writeFileSync(backup,source,{mode:0o600,flag:'wx'});
writeFileSync(target,updated);
console.log('Projector card icon installed; original metadata source backed up. Restart Homebridge UI to apply. UI updates may require reapplying this adapter.');
