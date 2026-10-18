// Narrow and auditable checks. PASS proves only the named check, never overall security.
export const PROFILES = Object.freeze({
  static: { label: 'Static site', description: 'Browser-only apps and GitHub Pages sites.' },
  backend: { label: 'Backend', description: 'Services with endpoints or persistent data.' },
  agent: { label: 'AI agent', description: 'LLM apps with untrusted input or tool access.' }
});
export const STATUSES = ['PASS','FAIL','NOT TESTED','NOT APPLICABLE'];
export function isTextCandidate(path) {
  const name = path.split('/').pop().toLowerCase();
  return /^(dockerfile|makefile|license|readme|\.env(?:\..*)?|\.gitignore|\.npmrc)$/.test(name) ||
    /\.(js|jsx|ts|tsx|mjs|cjs|json|jsonc|html|css|scss|md|txt|yaml|yml|toml|ini|sh|py|rb|go|rs|java|kt|php|sql|xml|properties)$/.test(name);
}
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{60,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/
];
export function buildReport(entries, profile='static', source='local folder') {
  if (!Object.hasOwn(PROFILES, profile)) throw new Error('Unknown profile');
  const files = entries.map((f) => ({path:String(f.path||'').replaceAll('\\','/').replace(/^\/+/,''),content:typeof f.content==='string'?f.content:null}));
  const match = (re) => files.filter((f) => re.test(f.path.toLowerCase()));
  const results=[];
  const put=(id,category,title,status,detail,evidence=[])=>results.push({id,category,title,status,detail,evidence:[...new Set(evidence)].slice(0,15)});
  const sourceFiles=files.filter((f)=>isTextCandidate(f.path));
  const readable=sourceFiles.filter((f)=>f.content!==null);
  const unreadable=sourceFiles.filter((f)=>f.content===null);
  const secretHits=readable.filter((f)=>patterns.some((p)=>p.test(f.content)));
  put('RR-001','Security','Known secret signatures',secretHits.length?'FAIL':!readable.length||unreadable.length?'NOT TESTED':'PASS',
    secretHits.length?'Potential credential-like content. Inspect locally and rotate confirmed exposures; values are never reported.':unreadable.length?'Some source text was unreadable or exceeded the size cap. Scan is incomplete.':readable.length?'No listed signatures in readable text. Other secret types may exist.':'No readable text scanned.',
    (secretHits.length?secretHits:readable.slice(0,8)).map((f)=>f.path));
  const env=match(/(^|\/)\.env(?:$|\.)/).filter((f)=>!/\.(example|sample|template)$/.test(f.path));
  const ignores=match(/(^|\/)\.gitignore$/);
  const envIgnored=ignores.some((f)=>(f.content||'').split('\n').some((line)=>/^\s*(?:\*\*\/)?\.env(?:\*|(?:\.[^\s]*)?)(?:\s|$)/.test(line)));
  put('RR-002','Security','Environment files have ignore rules',envIgnored?'PASS':env.length?'FAIL':'NOT TESTED',
    envIgnored?'An .env ignore pattern exists. Git history was not inspected.':env.length?'Local .env files without a detected ignore rule. This does not establish they were committed.':'No .env ignore rule verified.',
    envIgnored?ignores.map((f)=>f.path):env.map((f)=>f.path));
  const packages=match(/(^|\/)package\.json$/), locks=match(/(^|\/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/);
  put('RR-003','Supply chain','JavaScript dependency lockfile',!packages.length?'NOT APPLICABLE':locks.length?'PASS':'FAIL',
    !packages.length?'No package.json detected.':locks.length?'Lockfile found. Dependency integrity and vulnerabilities are not verified.':'package.json found without a recognized lockfile.',
    (locks.length?locks:packages).map((f)=>f.path));
  const workflows=files.filter((f)=>/^\.github\/workflows\/.+\.ya?ml$/i.test(f.path));
  const ci=workflows.filter((f)=>/(?:npm (?:run )?test|node --test|pytest|cargo test|go test|vitest|jest)/i.test(f.content||''));
  put('RR-004','Delivery','CI declares a test command',ci.length?'PASS':'NOT TESTED',ci.length?'Recognized test command in CI config. This is not proof of a passing run.':'No supported test command verified in readable CI workflows.',ci.map((f)=>f.path));
  const tests=files.filter((f)=>/(^|\/)(?:__tests__\/|tests?\/|[^/]+\.(?:test|spec)\.[^/]+$)/i.test(f.path)&& /\.(js|jsx|ts|tsx|mjs|cjs|py|go|rs)$/i.test(f.path));
  put('RR-005','Quality','Automated test files exist',tests.length?'PASS':'NOT TESTED',tests.length?'Test files found; execution and coverage not verified.':'No matching test files found.',tests.map((f)=>f.path));
  for(const [id,category,title,re] of [
    ['RR-006','Documentation','README is present',/(^|\/)readme(?:\.[^/]*)?$/],
    ['RR-007','Supply chain','Dependabot configuration exists',/^\.github\/dependabot\.ya?ml$/],
    ['RR-008','Documentation','Security disclosure policy exists',/(^|\/)security\.md$/],
    ['RR-009','Governance','License file exists',/(^|\/)(license|licence)(?:\.[^/]*)?$/]
  ]) {const hits=match(re);put(id,category,title,hits.length?'PASS':'NOT TESTED',hits.length?'A matching file exists; contents not substantively reviewed.':'No matching file found.',hits.map((f)=>f.path));}
  const xss=readable.filter((f)=>/dangerouslySetInnerHTML|innerHTML\s*=|\beval\s*\(/.test(f.content));
  put('RR-010','Security','Dynamic HTML / eval review','NOT TESTED',xss.length?'Potentially sensitive browser APIs found. Human review required.':'Static heuristics cannot prove resistance to XSS.',xss.map((f)=>f.path));
  const service=profile!=='static',agent=profile==='agent';
  put('RR-011','Security','Server-side authorization',service?'NOT TESTED':'NOT APPLICABLE',service?'Needs negative permission tests against running endpoints.':'Outside the chosen browser-only profile.');
  put('RR-012','Resilience','Backup restore rehearsal',service?'NOT TESTED':'NOT APPLICABLE',service?'Needs restore receipts for applicable persistent data.':'Outside the chosen browser-only profile.');
  put('RR-013','AI governance','Prompt-injection boundary tests',agent?'NOT TESTED':'NOT APPLICABLE',agent?'Needs adversarial tests enforcing tool permissions.':'Outside the chosen profile.');
  put('RR-014','AI governance','Model evaluations and pinning',agent?'NOT TESTED':'NOT APPLICABLE',agent?'Needs evaluation receipts and deployed model version.':'Outside the chosen profile.');
  put('RR-015','Delivery','Human diff review','NOT TESTED','Review of actual pull request changes is required.');
  const otherDeps=match(/(^|\/)(requirements\.txt|pyproject\.toml|cargo\.toml|go\.mod)$/);
  put('RR-016','Supply chain','Dependency vulnerability audit',packages.length||otherDeps.length?'NOT TESTED':'NOT APPLICABLE','Needs a live advisory scan, not just a dependency manifest.');
  const counts=Object.fromEntries(STATUSES.map((s)=>[s,results.filter((r)=>r.status===s).length]));
  return {schema:'repoready.report/v0.1',generatedAt:new Date().toISOString(),profile,source,scope:'Local paths and bounded text reads only; no runtime, Git history or server inspection',fileCount:files.length,readableFiles:readable.length,unscannedTextFiles:unreadable.length,counts,results};
}
export const demoFiles = Object.freeze([
 {path:'package.json',content:'{"name":"example"}'},
 {path:'package-lock.json',content:'{"lockfileVersion":3}'},
 {path:'.gitignore',content:'node_modules/\n.env\n'},
 {path:'README.md',content:'# Example'},
 {path:'src/App.jsx',content:'export default function App() {return null;}'},
 {path:'tests/app.test.mjs',content:'import test from "node:test"; test("sample",()=>{});'},
 {path:'.github/workflows/ci.yml',content:'steps:\n - run: npm test'}
]);
