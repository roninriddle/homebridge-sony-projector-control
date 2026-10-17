/* Run after the upstream UI generator: our native page no longer imports webUi.mjs.
 * Keep the generated boot monitor/importmap, but remove its obsolete webUi diagnostic
 * probe. The probe also triggers a CodeQL parser error in generated inline HTML.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const file=process.argv[2] || new URL('../homebridge-ui/public/index.html',import.meta.url);
const html=readFileSync(file,'utf8');
const start=html.indexOf('      if(typeof import.meta.resolve !== "function") {');
const end=html.indexOf('\n    } else {\n\n      window.webUiBoot.fail("manifest", error);',start);
if(start<0){
  if(html.includes('/* Native UI: no webUi import to probe. */'))process.exit(0);
  throw Error('Unexpected upstream UI loader; native overlay not applied.');
}
if(end<start)throw Error('Cannot locate native loader diagnostic boundary.');
const updated=html.slice(0,start)+'      /* Native UI: no webUi import to probe. */\n      window.webUiBoot.fail("import", error);'+html.slice(end);
writeFileSync(file,updated);
