import {useMemo, useState} from 'react';
import {buildReport, demoFiles, isTextCandidate, PROFILES, STATUSES} from './scanner.js';
import {TOPICS} from './topics.js';

const statusSlug = (status) => status.toLowerCase().replaceAll(' ','-');
const FILTERS = ['ALL','FAIL','NOT TESTED','PASS','NOT APPLICABLE'];
const GROUPS = ['All topics', ...new Set(TOPICS.map((topic) => topic.group))];

function downloadReport(report) {
  const blob = new Blob([JSON.stringify(report, null, 2) + '\n'], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href=url;
  link.download='repoready-evidence-' + report.profile + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [profile,setProfile] = useState('static');
  const [entries,setEntries] = useState(demoFiles);
  const [source,setSource] = useState('illustrative demo');
  const [view,setView] = useState('readiness');
  const [filter,setFilter] = useState('ALL');
  const [search,setSearch] = useState('');
  const [group,setGroup] = useState('All topics');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  const report = useMemo(()=>buildReport(entries,profile,source),[entries,profile,source]);
  const visible = useMemo(()=>report.results.filter((r)=>filter==='ALL'||r.status===filter),[report,filter]);
  const topicRows = useMemo(()=>TOPICS.filter((t)=>(group==='All topics'||t.group===group)&&
    (t.name.toLowerCase().includes(search.toLowerCase())||String(t.number)===search.trim())),[search,group]);

  async function readFolder(event) {
    const sourceFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if(!sourceFiles.length)return;
    setLoading(true);setError('');
    try {
      const relevant=sourceFiles.filter((file)=>{
        const rel=file.webkitRelativePath || file.name;
        return !/(^|\/)(?:node_modules|\.git|dist|\.next|coverage)\//.test(rel);
      });
      if(relevant.length>1500) throw new Error('This folder contains more than 1,500 relevant files. Select a smaller source folder.');
      const selected = await Promise.all(relevant.map(async(file)=>{
        const parts=(file.webkitRelativePath||file.name).split('/');
        const path=parts.length>1?parts.slice(1).join('/'):file.name;
        let content=null;
        if(isTextCandidate(path)&&file.size<=256*1024) {
          try {content=await file.text();}catch {content=null;}
        }
        return {path,content};
      }));
      setEntries(selected);setSource('local folder');setFilter('ALL');setView('readiness');
    } catch(e) {setError(e instanceof Error?e.message:'Could not read the selected folder.');}
    finally {setLoading(false);}
  }

  return (
    <div className="app">
      <header className="header">
        <div className="identity"><div className="mark">R<span>.</span></div><div><strong>RepoReady</strong><small>ENGINEERING READINESS</small></div></div>
        <div className="header-right"><span className="local-indicator"><span className="indicator-dot"/> LOCAL-FIRST / READ-ONLY</span><a className="github-link" href="https://github.com/MichaelWave369/RepoReady" target="_blank" rel="noreferrer">GitHub ↗</a></div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-intro"><div className="eyebrow">YOUR WORKSPACE</div><h1>Evidence before<br/><em>green.</em></h1><p>Make the software prove what it knows. Never mistake a missing test for a passing one.</p></div>
          <div className="sidebar-title">PROJECT PROFILE</div>
          <div className="profiles" role="group" aria-label="Project profile">
            {Object.entries(PROFILES).map(([key,value])=><button key={key} className={'profile '+(profile===key?'selected':'')} onClick={()=>{setProfile(key);setFilter('ALL');}}>
              <span className="profile-symbol">{key==='static'?'◇':key==='backend'?'▤':'✳'}</span><span><strong>{value.label}</strong><small>{value.description}</small></span><span className="radio"/>
            </button>)}
          </div>
          <div className="privacy"><div className="privacy-head">◈ &nbsp; Your code stays here</div><p>Folder files are read in this browser tab. Nothing is uploaded to RepoReady. Reports include paths and findings, never file contents or secret values.</p></div>
          <div className="side-footer">v0.1.0 · MIT LICENSE<br/>LEDGER ABOVE EGO</div>
        </aside>

        <main className="main">
          <div className="page-top"><div><div className="eyebrow accent">THE READINESS WORKBENCH</div><h2>Know what is <span>verified.</span></h2><p>A focused starting point for the 250-topic engineering map. Sixteen scoped assessments, not 250 security guarantees.</p></div><div className="number-seal"><b>250</b><small>TOPICS</small></div></div>
          <div className="actions">
            <label className={'button primary upload '+(loading?'disabled':'')}>{loading?'Reading files…':'Select local source folder'}<input type="file" multiple {...{webkitdirectory:''}} onChange={readFolder} disabled={loading} aria-label="Select a source folder"/></label>
            <button className="button ghost" onClick={()=>{setEntries(demoFiles);setSource('illustrative demo');setError('');}}>Load demo</button>
            <button className="button ghost" onClick={()=>{setEntries([]);setSource('no folder selected');setError('');}}>Clear</button>
            <button className="button export" onClick={()=>downloadReport(report)} disabled={!entries.length}>Export evidence JSON ↓</button>
          </div>
          {error&&<div role="alert" className="error">{error}</div>}
          <div className="source-strip"><span className={'source-pill '+(source==='illustrative demo'?'demo':'')}>{source==='illustrative demo'?'ILLUSTRATIVE DEMO':source==='local folder'?'LOCAL SCAN':'NO SCAN'}</span><span>{report.fileCount} files inventoried</span><span>{report.readableFiles} text files read</span>{report.unscannedTextFiles>0&&<span>{report.unscannedTextFiles} text files not read</span>}<span className="read-limit">256 KB per text file limit</span></div>

          <nav className="tabs" aria-label="Workbench views"><button className={view==='readiness'?'active':''} onClick={()=>setView('readiness')}>Readiness results <span>16</span></button><button className={view==='topics'?'active':''} onClick={()=>setView('topics')}>250-topic map <span>250</span></button></nav>

          {view==='readiness' ? <>
            <section className="metric-grid" aria-label="Assessment counts">
              {STATUSES.map((s)=><button key={s} className={'metric '+statusSlug(s)} onClick={()=>setFilter(filter===s?'ALL':s)} aria-pressed={filter===s}><span>{s}</span><strong>{report.counts[s]}</strong><small>{s==='PASS'?'Scoped evidence':s==='FAIL'?'Attention needed':s==='NOT TESTED'?'Evidence missing':'Outside profile'}</small></button>)}
            </section>
            <div className="health-bar" aria-label="Distribution of rule statuses">{STATUSES.map((s)=><span key={s} className={statusSlug(s)} style={{width:(report.counts[s]/report.results.length*100)+'%'}}/>)}</div>
            <div className="section-heading"><div><h3>Evidence ledger</h3><p>PASS means the specific named condition was observed. It does not certify the project.</p></div><div className="filter-row"><label htmlFor="resultFilter">Show</label><select id="resultFilter" value={filter} onChange={(e)=>setFilter(e.target.value)}>{FILTERS.map((x)=><option key={x} value={x}>{x==='ALL'?'All findings':x}</option>)}</select></div></div>
            <div className="ledger">
              {visible.length===0&&<p className="empty">No findings in this status.</p>}
              {visible.map((item)=><article key={item.id} className="finding"><div className="finding-top"><div className="finding-copy"><div className="finding-meta"><span>{item.id}</span><span>·</span><span>{item.category}</span></div><h4>{item.title}</h4></div><span className={'status '+statusSlug(item.status)}><span className="status-dot"/>{item.status}</span></div><p>{item.detail}</p>{item.evidence.length>0&&<div className="evidence"><span>EVIDENCE PATHS</span>{item.evidence.map((p)=><code key={p}>{p}</code>)}</div>}</article>)}
            </div>
          </> : <>
            <div className="topic-heading"><div><h3>The 250-topic map</h3><p>These are subjects to learn and investigate, not automated checks that have passed.</p></div><div className="topic-count">{topicRows.length} / 250</div></div>
            <div className="topic-tools"><input type="search" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search topics or exact number…" aria-label="Search topic map"/><select aria-label="Topic category" value={group} onChange={(e)=>setGroup(e.target.value)}>{GROUPS.map((g)=><option key={g} value={g}>{g}</option>)}</select></div>
            <div className="topic-list">{topicRows.map((t)=><div className="topic" key={t.number}><span className="topic-id">{String(t.number).padStart(3,'0')}</span><strong>{t.name}</strong><small>{t.group}</small></div>)}{!topicRows.length&&<p className="empty">No matching topics.</p>}</div>
          </>}
          <footer className="main-footer"><span>Source code is never executed by the scanner. No vulnerability databases, auth checks, CI results, or restore tests are queried.</span><span>© 2026 RepoReady</span></footer>
        </main>
      </div>
    </div>
  );
}
