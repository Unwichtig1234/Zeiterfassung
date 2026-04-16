import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';

const STORAGE_KEY = 'zeiterfassung_pro_desktop_v1';
const HOURS_PER_DAY = 8;
const STATES = ['Baden-Wurttemberg','Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen','Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen','Rheinland-Pfalz','Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thuringen'];
const DEPARTMENTS = ['Architektur','Bau','Montage','Elektrotechnik','Rohrleitungstechnik','Maschinenbau','Prozess','Mechanik','Spezialisten'];

const defaultData = {
  employees: [
    { id: 'e1', name: 'Max Mustermann', role: 'Mitarbeiter', department: 'Prozess', state: 'Nordrhein-Westfalen', weeklyTargetHours: 40, hourlyRate: 95 },
    { id: 'e2', name: 'Lea Admin', role: 'Admin', department: 'Architektur', state: 'Nordrhein-Westfalen', weeklyTargetHours: 38.5, hourlyRate: 120 },
    { id: 'e3', name: 'Tom Projektleiter', role: 'Projektleiter', department: 'Maschinenbau', state: 'Bayern', weeklyTargetHours: 40, hourlyRate: 110 }
  ],
  projects: [
    { id: 'p1', name: 'Intern', customer: 'Helbig', budgetHours: 120, budgetCosts: 12000 },
    { id: 'p2', name: 'Kunde A', customer: 'Beispiel GmbH', budgetHours: 640, budgetCosts: 62000 },
    { id: 'p3', name: 'Support', customer: 'Bestandskunden', budgetHours: 240, budgetCosts: 22000 }
  ],
  entries: [
    { id: 'z1', employeeId: 'e1', projectId: 'p2', date: todayISO(), hours: 3.25, note: 'Planung und Abstimmung', status: 'Freigegeben' },
    { id: 'z2', employeeId: 'e1', projectId: 'p3', date: todayISO(), hours: 3.75, note: 'Tickets und Rückfragen', status: 'Eingereicht' }
  ],
  absences: [
    { id: 'a1', employeeId: 'e1', type: 'Urlaub', startDate: todayISO(), endDate: todayISO(), status: 'Genehmigt', note: 'Beispiel-Abwesenheit' }
  ],
  gantt: [
    { id: 'g1', projectId: 'p2', parentId: null, type: 'phase', name: 'Basic Engineering', ownerEmployeeId: 'e1', ownerDepartment: 'Prozess', startDate: todayISO(), endDate: addDaysISO(todayISO(), 14), progress: 45, dependencyIds: [], dependencyType: 'FS', lagDays: 0, plannedHours: 80, plannedDays: 10, milestoneDate: '' },
    { id: 'g2', projectId: 'p2', parentId: 'g1', type: 'task', name: 'P&ID Ausarbeitung', ownerEmployeeId: 'e1', ownerDepartment: 'Prozess', startDate: todayISO(), endDate: addDaysISO(todayISO(), 8), progress: 55, dependencyIds: [], dependencyType: 'FS', lagDays: 0, plannedHours: 48, plannedDays: 6, milestoneDate: '' },
    { id: 'g3', projectId: 'p2', parentId: 'g1', type: 'milestone', name: 'Review Meilenstein', ownerEmployeeId: 'e3', ownerDepartment: 'Maschinenbau', startDate: addDaysISO(todayISO(), 15), endDate: addDaysISO(todayISO(), 15), progress: 0, dependencyIds: ['g2'], dependencyType: 'FS', lagDays: 0, plannedHours: 8, plannedDays: 1, milestoneDate: addDaysISO(todayISO(), 15) }
  ],
  baselines: []
};

const fixedNationalHolidays = [{ md: '01-01', name: 'Neujahr' },{ md: '05-01', name: 'Tag der Arbeit' },{ md: '10-03', name: 'Tag der Deutschen Einheit' },{ md: '12-25', name: '1. Weihnachtstag' },{ md: '12-26', name: '2. Weihnachtstag' }];
const stateHolidayRules = {
  'Baden-Wurttemberg': [{ md: '01-06', name: 'Heilige Drei Konige' },{ easterOffset: 60, name: 'Fronleichnam' },{ md: '11-01', name: 'Allerheiligen' }],
  Bayern: [{ md: '01-06', name: 'Heilige Drei Konige' },{ easterOffset: 60, name: 'Fronleichnam' },{ md: '08-15', name: 'Maria Himmelfahrt' },{ md: '11-01', name: 'Allerheiligen' }],
  Berlin: [{ md: '03-08', name: 'Internationaler Frauentag' }],
  Brandenburg: [{ easterOffset: 60, name: 'Fronleichnam' },{ md: '10-31', name: 'Reformationstag' }],
  Bremen: [{ md: '10-31', name: 'Reformationstag' }],
  Hamburg: [{ md: '10-31', name: 'Reformationstag' }],
  Hessen: [{ easterOffset: 60, name: 'Fronleichnam' }],
  'Mecklenburg-Vorpommern': [{ md: '03-08', name: 'Internationaler Frauentag' },{ md: '10-31', name: 'Reformationstag' }],
  Niedersachsen: [{ md: '10-31', name: 'Reformationstag' }],
  'Nordrhein-Westfalen': [{ easterOffset: 60, name: 'Fronleichnam' },{ md: '11-01', name: 'Allerheiligen' }],
  'Rheinland-Pfalz': [{ easterOffset: 60, name: 'Fronleichnam' },{ md: '11-01', name: 'Allerheiligen' }],
  Saarland: [{ easterOffset: 60, name: 'Fronleichnam' },{ md: '08-15', name: 'Maria Himmelfahrt' },{ md: '11-01', name: 'Allerheiligen' }],
  Sachsen: [{ md: '10-31', name: 'Reformationstag' },{ wednesdayBeforeNovember23: true, name: 'Buss- und Bettag' }],
  'Sachsen-Anhalt': [{ md: '01-06', name: 'Heilige Drei Konige' },{ md: '10-31', name: 'Reformationstag' }],
  'Schleswig-Holstein': [{ md: '10-31', name: 'Reformationstag' }],
  Thuringen: [{ md: '09-20', name: 'Weltkindertag' },{ md: '10-31', name: 'Reformationstag' }]
};

function uid() { return Math.random().toString(36).slice(2, 10); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(iso, days) { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function currency(v) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0); }
function hoursFmt(v) { return `${Number(v || 0).toFixed(1).replace('.', ',')} h`; }
function pct(v) { return `${Math.round(v)}%`; }
function dateDiffDays(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function isWeekend(iso) { const d = new Date(iso); const day = d.getDay(); return day === 0 || day === 6; }
function getEasterSunday(year) { const a = year % 19; const b = Math.floor(year / 100); const c = year % 100; const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451); const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1; return new Date(year, month - 1, day); }
function getBussUndBettag(year) { const nov23 = new Date(year, 10, 23); const day = nov23.getDay(); const offset = day >= 3 ? day - 3 : day + 4; const d = new Date(nov23); d.setDate(d.getDate() - offset); return d; }
function toISO(date) { return new Date(date).toISOString().slice(0, 10); }
function getHolidayMap(year, state) {
  const map = {};
  fixedNationalHolidays.forEach((h) => { map[`${year}-${h.md}`] = h.name; });
  const easter = getEasterSunday(year);
  [{ date: new Date(easter.getTime() - 2 * 86400000), name: 'Karfreitag' },{ date: new Date(easter.getTime() + 1 * 86400000), name: 'Ostermontag' },{ date: new Date(easter.getTime() + 39 * 86400000), name: 'Christi Himmelfahrt' },{ date: new Date(easter.getTime() + 50 * 86400000), name: 'Pfingstmontag' }].forEach((h) => { map[toISO(h.date)] = h.name; });
  (stateHolidayRules[state] || []).forEach((rule) => {
    if (rule.md) map[`${year}-${rule.md}`] = rule.name;
    if (rule.easterOffset !== undefined) map[toISO(new Date(easter.getTime() + rule.easterOffset * 86400000))] = rule.name;
    if (rule.wednesdayBeforeNovember23) map[toISO(getBussUndBettag(year))] = rule.name;
  });
  return map;
}

function StatCard({ label, value, sub }) {
  return <div className="card stat-card"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{sub && <div className="stat-sub">{sub}</div>}</div>;
}

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState(defaultData);
  const [selectedEmployee, setSelectedEmployee] = useState('e1');
  const [selectedProject, setSelectedProject] = useState('p2');
  const [entryForm, setEntryForm] = useState({ employeeId: 'e1', projectId: 'p2', date: todayISO(), hours: 8, note: '', status: 'Entwurf' });
  const [absenceForm, setAbsenceForm] = useState({ employeeId: 'e1', type: 'Urlaub', startDate: todayISO(), endDate: todayISO(), status: 'Genehmigt', note: '' });
  const [projectForm, setProjectForm] = useState({ name: '', customer: '', budgetHours: 0, budgetCosts: 0 });
  const [employeeForm, setEmployeeForm] = useState({ name: '', role: 'Mitarbeiter', department: DEPARTMENTS[0], state: STATES[10], weeklyTargetHours: 40, hourlyRate: 90 });
  const [ganttForm, setGanttForm] = useState({ projectId: 'p2', type: 'task', name: '', ownerEmployeeId: 'e1', ownerDepartment: 'Prozess', startDate: todayISO(), endDate: addDaysISO(todayISO(), 5), progress: 0, plannedHours: 40, plannedDays: 5, dependencyIds: '', dependencyType: 'FS', lagDays: 0 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const employeesById = useMemo(() => Object.fromEntries(data.employees.map(e => [e.id, e])), [data.employees]);
  const projectsById = useMemo(() => Object.fromEntries(data.projects.map(p => [p.id, p])), [data.projects]);

  const entriesWithCosts = useMemo(() => data.entries.map(e => {
    const rate = employeesById[e.employeeId]?.hourlyRate || 0;
    return { ...e, cost: e.hours * rate };
  }), [data.entries, employeesById]);

  const projectSummaries = useMemo(() => data.projects.map(project => {
    const projectEntries = entriesWithCosts.filter(e => e.projectId === project.id);
    const actualHours = projectEntries.reduce((s, e) => s + e.hours, 0);
    const actualCosts = projectEntries.reduce((s, e) => s + e.cost, 0);
    const remainingHours = (project.budgetHours || 0) - actualHours;
    const remainingCosts = (project.budgetCosts || 0) - actualCosts;
    const forecastCosts = project.budgetHours > 0 && actualHours > 0 ? (actualCosts / actualHours) * project.budgetHours : actualCosts;
    return { ...project, actualHours, actualCosts, remainingHours, remainingCosts, forecastCosts };
  }), [data.projects, entriesWithCosts]);

  const ganttView = useMemo(() => {
    const items = data.gantt.filter(g => selectedProject === 'alle' ? true : g.projectId === selectedProject);
    const minStart = items.length ? items.map(i => i.startDate).sort()[0] : todayISO();
    const maxEnd = items.length ? items.map(i => i.endDate).sort().slice(-1)[0] : todayISO();
    const totalRangeDays = Math.max(1, dateDiffDays(minStart, maxEnd) + 1);
    return { rows: items, minStart, maxEnd, totalRangeDays };
  }, [data.gantt, selectedProject]);

  const resourcesByProject = useMemo(() => {
    return data.projects.map(project => {
      const gantt = data.gantt.filter(g => g.projectId === project.id);
      const map = {};
      gantt.forEach(g => {
        if (!g.ownerEmployeeId) return;
        const empId = g.ownerEmployeeId;
        const actualHours = entriesWithCosts.filter(e => e.projectId === project.id && e.employeeId === empId).reduce((s, e) => s + e.hours, 0);
        const plannedHours = gantt.filter(x => x.ownerEmployeeId === empId).reduce((s, x) => s + Number(x.plannedHours || 0), 0);
        const start = new Date(g.startDate);
        const end = new Date(g.endDate);
        const days = Math.max(1, dateDiffDays(start, end) + 1);
        const forecastWeeklyHours = Math.max(map[empId]?.forecastWeeklyHours || 0, (Number(g.plannedHours || 0) / days) * 5);
        map[empId] = { actualHours, plannedHours, forecastWeeklyHours };
      });
      return { project, employees: map };
    });
  }, [data.projects, data.gantt, entriesWithCosts]);

  const todayTotal = entriesWithCosts.filter(e => e.date === todayISO()).reduce((s, e) => s + e.hours, 0);
  const thisMonth = todayISO().slice(0,7);
  const monthlyHours = entriesWithCosts.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.hours, 0);
  const totalProjectCosts = projectSummaries.reduce((s,p) => s + p.actualCosts, 0);
  const warningCount = projectSummaries.filter(p => p.actualCosts > p.budgetCosts || p.actualHours > p.budgetHours).length;

  function addEntry() {
    setData(prev => ({ ...prev, entries: [{ ...entryForm, id: uid(), hours: Number(entryForm.hours) }, ...prev.entries] }));
    setEntryForm(prev => ({ ...prev, note: '' }));
  }

  function addAbsence() {
    setData(prev => ({ ...prev, absences: [{ ...absenceForm, id: uid() }, ...prev.absences] }));
  }

  function addProject() {
    if (!projectForm.name.trim()) return;
    const next = { ...projectForm, id: uid(), budgetHours: Number(projectForm.budgetHours), budgetCosts: Number(projectForm.budgetCosts) };
    setData(prev => ({ ...prev, projects: [...prev.projects, next] }));
    setProjectForm({ name: '', customer: '', budgetHours: 0, budgetCosts: 0 });
  }

  function addEmployee() {
    if (!employeeForm.name.trim()) return;
    const next = { ...employeeForm, id: uid(), weeklyTargetHours: Number(employeeForm.weeklyTargetHours), hourlyRate: Number(employeeForm.hourlyRate) };
    setData(prev => ({ ...prev, employees: [...prev.employees, next] }));
    setEmployeeForm({ name: '', role: 'Mitarbeiter', department: DEPARTMENTS[0], state: STATES[10], weeklyTargetHours: 40, hourlyRate: 90 });
  }

  function addGanttItem() {
    if (!ganttForm.name.trim()) return;
    const next = {
      ...ganttForm,
      id: uid(),
      lagDays: Number(ganttForm.lagDays),
      progress: Number(ganttForm.progress),
      plannedHours: Number(ganttForm.plannedHours),
      plannedDays: Number(ganttForm.plannedDays),
      dependencyIds: ganttForm.dependencyIds ? ganttForm.dependencyIds.split(',').map(v => v.trim()).filter(Boolean) : [],
      milestoneDate: ganttForm.type === 'milestone' ? ganttForm.endDate : ''
    };
    setData(prev => ({ ...prev, gantt: [...prev.gantt, next] }));
  }

  function saveBaseline() {
    const items = data.gantt.filter(g => g.projectId === selectedProject);
    const currentVersion = data.baselines.filter(b => b.projectId === selectedProject).reduce((m, b) => Math.max(m, b.version), 0);
    const nextVersion = currentVersion + 1;
    const snapshot = items.map(item => ({ id: uid(), projectId: item.projectId, itemId: item.id, version: nextVersion, startDate: item.startDate, endDate: item.endDate, plannedHours: item.plannedHours, savedAt: todayISO() }));
    setData(prev => ({ ...prev, baselines: [...prev.baselines, ...snapshot] }));
  }

  function exportPdf(mode) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 50;
    const write = (txt, size = 11, gap = 18) => {
      if (y > 760) { doc.addPage(); y = 50; }
      doc.setFontSize(size);
      doc.text(String(txt), 40, y);
      y += gap;
    };
    write(mode === 'management' ? 'Management Report' : 'Technischer Projektbericht', 18, 28);
    projectSummaries.forEach((p, i) => {
      write(`${i + 1}. ${p.name} (${p.customer})`, 14, 20);
      write(`Kosten: ${Math.round(p.actualCosts)} EUR / Budget ${Math.round(p.budgetCosts)} EUR`);
      write(`Stunden: ${p.actualHours.toFixed(1)} / Budget ${p.budgetHours}`);
      write(`Forecast: ${Math.round(p.forecastCosts)} EUR`, 11, 22);
      if (mode === 'technical') {
        data.gantt.filter(g => g.projectId === p.id).slice(0, 12).forEach(g => write(`- ${g.name}: ${g.startDate} bis ${g.endDate} | ${g.progress}%`, 10, 15));
      }
    });
    doc.save(mode === 'management' ? 'management-report.pdf' : 'detail-report.pdf');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Zeiterfassung Pro</div>
        <button className={tab === 'dashboard' ? 'nav active' : 'nav'} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={tab === 'entries' ? 'nav active' : 'nav'} onClick={() => setTab('entries')}>Zeiten</button>
        <button className={tab === 'projects' ? 'nav active' : 'nav'} onClick={() => setTab('projects')}>Projekte</button>
        <button className={tab === 'gantt' ? 'nav active' : 'nav'} onClick={() => setTab('gantt')}>Gantt</button>
        <button className={tab === 'resources' ? 'nav active' : 'nav'} onClick={() => setTab('resources')}>Ressourcen</button>
        <button className={tab === 'report' ? 'nav active' : 'nav'} onClick={() => setTab('report')}>Report</button>
        <button className={tab === 'admin' ? 'nav active' : 'nav'} onClick={() => setTab('admin')}>Administration</button>
      </aside>

      <main className="content">
        <div className="topbar">
          <div>
            <h1>Installierbare Desktop-App</h1>
            <p>Zeiterfassung, Projektplanung, Gantt, Ressourcenboard und Reporting.</p>
          </div>
          <div className="row gap">
            <select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); setEntryForm(prev => ({ ...prev, employeeId: e.target.value })); setAbsenceForm(prev => ({ ...prev, employeeId: e.target.value })); }}>
              {data.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setEntryForm(prev => ({ ...prev, projectId: e.target.value === 'alle' ? prev.projectId : e.target.value })); }}>
              <option value="alle">Alle Projekte</option>
              {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {tab === 'dashboard' && (
          <>
            <div className="stats-grid">
              <StatCard label="Heute" value={hoursFmt(todayTotal)} sub="Erfasste Stunden heute" />
              <StatCard label="Dieser Monat" value={hoursFmt(monthlyHours)} sub={thisMonth} />
              <StatCard label="Projektkosten" value={currency(totalProjectCosts)} sub="Personalkosten aus Zeiterfassung" />
              <StatCard label="Warnungen" value={warningCount} sub="Budget / Stunden / Termin" />
            </div>
            <div className="grid two">
              <div className="card">
                <h3>Projektübersicht</h3>
                <table className="table">
                  <thead><tr><th>Projekt</th><th>Ist h</th><th>Ist Kosten</th><th>Forecast</th></tr></thead>
                  <tbody>
                    {projectSummaries.map(p => (
                      <tr key={p.id}>
                        <td>{p.name}</td><td>{p.actualHours.toFixed(1)}</td><td>{currency(p.actualCosts)}</td><td>{currency(p.forecastCosts)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <h3>Abwesenheiten</h3>
                {data.absences.map(a => <div key={a.id} className="list-row"><strong>{employeesById[a.employeeId]?.name}</strong><span>{a.type}</span><span>{a.startDate} bis {a.endDate}</span></div>)}
              </div>
            </div>
          </>
        )}

        {tab === 'entries' && (
          <div className="grid two">
            <div className="card">
              <h3>Neue Buchung</h3>
              <div className="form-grid">
                <label>Mitarbeiter<select value={entryForm.employeeId} onChange={e => setEntryForm(prev => ({ ...prev, employeeId: e.target.value }))}>{data.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
                <label>Projekt<select value={entryForm.projectId} onChange={e => setEntryForm(prev => ({ ...prev, projectId: e.target.value }))}>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                <label>Datum<input type="date" value={entryForm.date} onChange={e => setEntryForm(prev => ({ ...prev, date: e.target.value }))} /></label>
                <label>Stunden<input type="number" step="0.25" value={entryForm.hours} onChange={e => setEntryForm(prev => ({ ...prev, hours: e.target.value }))} /></label>
                <label>Status<select value={entryForm.status} onChange={e => setEntryForm(prev => ({ ...prev, status: e.target.value }))}><option>Entwurf</option><option>Eingereicht</option><option>Freigegeben</option><option>Abgelehnt</option></select></label>
                <label className="full">Notiz<input value={entryForm.note} onChange={e => setEntryForm(prev => ({ ...prev, note: e.target.value }))} /></label>
              </div>
              <div className="row gap"><button className="primary" onClick={addEntry}>Buchung speichern</button></div>
            </div>
            <div className="card">
              <h3>Zeiteinträge</h3>
              <table className="table">
                <thead><tr><th>Datum</th><th>Mitarbeiter</th><th>Projekt</th><th>Std.</th><th>Status</th></tr></thead>
                <tbody>
                  {entriesWithCosts.slice().sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                    <tr key={e.id}><td>{e.date}</td><td>{employeesById[e.employeeId]?.name}</td><td>{projectsById[e.projectId]?.name}</td><td>{e.hours.toFixed(2)}</td><td>{e.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'projects' && (
          <div className="grid two">
            <div className="card">
              <h3>Projekt anlegen</h3>
              <div className="form-grid">
                <label>Name<input value={projectForm.name} onChange={e => setProjectForm(prev => ({ ...prev, name: e.target.value }))} /></label>
                <label>Kunde<input value={projectForm.customer} onChange={e => setProjectForm(prev => ({ ...prev, customer: e.target.value }))} /></label>
                <label>Budget Stunden<input type="number" value={projectForm.budgetHours} onChange={e => setProjectForm(prev => ({ ...prev, budgetHours: e.target.value }))} /></label>
                <label>Budget Kosten<input type="number" value={projectForm.budgetCosts} onChange={e => setProjectForm(prev => ({ ...prev, budgetCosts: e.target.value }))} /></label>
              </div>
              <button className="primary" onClick={addProject}>Projekt speichern</button>
            </div>
            <div className="card">
              <h3>Projekte</h3>
              <table className="table">
                <thead><tr><th>Projekt</th><th>Kunde</th><th>Budget h</th><th>Budget</th></tr></thead>
                <tbody>{data.projects.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.customer}</td><td>{p.budgetHours}</td><td>{currency(p.budgetCosts)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'gantt' && (
          <div className="stack">
            <div className="card">
              <div className="row space-between center"><h3>Gantt-Steuerung</h3><button onClick={saveBaseline}>Baseline für aktuelles Projekt speichern</button></div>
              <div className="form-grid">
                <label>Projekt<select value={ganttForm.projectId} onChange={e => setGanttForm(prev => ({ ...prev, projectId: e.target.value }))}>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                <label>Typ<select value={ganttForm.type} onChange={e => setGanttForm(prev => ({ ...prev, type: e.target.value }))}><option value="phase">Phase</option><option value="task">Untervorgang</option><option value="milestone">Meilenstein</option></select></label>
                <label>Name<input value={ganttForm.name} onChange={e => setGanttForm(prev => ({ ...prev, name: e.target.value }))} /></label>
                <label>Verantwortlich<select value={ganttForm.ownerEmployeeId} onChange={e => setGanttForm(prev => ({ ...prev, ownerEmployeeId: e.target.value, ownerDepartment: employeesById[e.target.value]?.department || prev.ownerDepartment }))}>{data.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
                <label>Start<input type="date" value={ganttForm.startDate} onChange={e => setGanttForm(prev => ({ ...prev, startDate: e.target.value }))} /></label>
                <label>Ende<input type="date" value={ganttForm.endDate} onChange={e => setGanttForm(prev => ({ ...prev, endDate: e.target.value }))} /></label>
                <label>Fortschritt<input type="number" value={ganttForm.progress} onChange={e => setGanttForm(prev => ({ ...prev, progress: e.target.value }))} /></label>
                <label>Geplante Stunden<input type="number" value={ganttForm.plannedHours} onChange={e => setGanttForm(prev => ({ ...prev, plannedHours: e.target.value }))} /></label>
                <label>Geplante Tage<input type="number" value={ganttForm.plannedDays} onChange={e => setGanttForm(prev => ({ ...prev, plannedDays: e.target.value }))} /></label>
                <label>Abhängigkeiten (IDs)<input value={ganttForm.dependencyIds} onChange={e => setGanttForm(prev => ({ ...prev, dependencyIds: e.target.value }))} /></label>
                <label>Typ<select value={ganttForm.dependencyType} onChange={e => setGanttForm(prev => ({ ...prev, dependencyType: e.target.value }))}><option value="FS">FS</option><option value="SS">SS</option><option value="FF">FF</option></select></label>
                <label>Lag Tage<input type="number" value={ganttForm.lagDays} onChange={e => setGanttForm(prev => ({ ...prev, lagDays: e.target.value }))} /></label>
              </div>
              <button className="primary" onClick={addGanttItem}>Vorgang anlegen</button>
            </div>

            <div className="card">
              <h3>Gantt-Übersicht</h3>
              <div className="gantt-list">
                {ganttView.rows.map(item => {
                  const offsetPct = Math.max(0, (dateDiffDays(ganttView.minStart, item.startDate) / ganttView.totalRangeDays) * 100);
                  const widthPct = Math.max(2, ((dateDiffDays(item.startDate, item.endDate) + 1) / ganttView.totalRangeDays) * 100);
                  const baseline = data.baselines.slice().reverse().find(b => b.itemId === item.id);
                  const baselineOffsetPct = baseline ? Math.max(0, (dateDiffDays(ganttView.minStart, baseline.startDate) / ganttView.totalRangeDays) * 100) : 0;
                  const baselineWidthPct = baseline ? Math.max(2, ((dateDiffDays(baseline.startDate, baseline.endDate) + 1) / ganttView.totalRangeDays) * 100) : 0;
                  return (
                    <div className="gantt-row" key={item.id}>
                      <div className="gantt-meta">
                        <div className="gantt-title">{item.name}</div>
                        <div className="muted">{projectsById[item.projectId]?.name} · {employeesById[item.ownerEmployeeId]?.name} · {item.dependencyType}</div>
                      </div>
                      <div className="gantt-track">
                        {baseline && <div className="gantt-bar baseline" style={{ left: `${baselineOffsetPct}%`, width: `${baselineWidthPct}%` }} />}
                        <div className={`gantt-bar ${affectedTaskIds.includes(item.id) ? 'affected' : ''} ${item.type === 'milestone' ? 'milestone' : ''}`} style={{ left: `${offsetPct}%`, width: `${widthPct}%` }} />
                      </div>
                      <div className="gantt-actions">
                        <button onClick={() => shiftGanttItem(item.id, -1)}>-1 T</button>
                        <button onClick={() => shiftGanttItem(item.id, 1)}>+1 T</button>
                        {item.type !== 'milestone' && <button onClick={() => resizeGanttItem(item.id, 1, 'end')}>Ende +1</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'resources' && (
          <div className="card">
            <h3>Projektbezogenes Ressourcenboard inkl. Zukunftsprognose</h3>
            <div className="resource-grid">
              {resourcesByProject.map(({ project, employees }) => {
                const employeeIds = Object.keys(employees);
                return (
                  <div key={project.id} className="resource-card">
                    <div className="resource-title">{project.name}</div>
                    {employeeIds.length === 0 && <div className="muted">Keine Daten</div>}
                    {employeeIds.map(empId => {
                      const emp = employeesById[empId];
                      const info = employees[empId];
                      const plannedUtil = Math.min(150, Math.round((info.plannedHours / 40) * 100));
                      const forecastUtil = Math.min(180, Math.round((info.forecastWeeklyHours / 40) * 100));
                      const forecastLabel = forecastUtil > 120 ? 'kritisch' : forecastUtil > 100 ? 'eng' : 'stabil';
                      return (
                        <div key={empId} className="resource-person">
                          <div className="row space-between"><strong>{emp?.name || empId}</strong><span>{info.actualHours.toFixed(1)}h / {info.plannedHours.toFixed(1)}h / {info.forecastWeeklyHours.toFixed(1)}h</span></div>
                          <div className="muted">Ist / Plan / Prognose</div>
                          <div className="bar-bg"><div className="bar plan" style={{ width: `${plannedUtil}%` }} /></div>
                          <div className="bar-bg"><div className={`bar forecast ${forecastUtil > 120 ? 'bad' : forecastUtil > 100 ? 'warn' : 'good'}`} style={{ width: `${forecastUtil}%` }} /></div>
                          <div className="tiny">Prognose: {forecastLabel}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'report' && (
          <div className="stack">
            <div className="row gap"><button onClick={() => exportPdf('management')}>Management-PDF</button><button onClick={() => exportPdf('technical')}>Technik-PDF</button></div>
            <div className="report-grid">
              {projectSummaries.map(p => {
                const status = p.actualCosts > p.budgetCosts * 1.1 ? 'kritisch' : p.actualCosts > p.budgetCosts * 1.05 ? 'risiko' : 'ok';
                return (
                  <div key={p.id} className="card">
                    <div className="row space-between"><h3>{p.name}</h3><span className={`badge ${status}`}>{status}</span></div>
                    <div className="kv"><span>Kosten</span><span>{currency(p.actualCosts)} / {currency(p.budgetCosts)}</span></div>
                    <div className="kv"><span>Stunden</span><span>{p.actualHours.toFixed(1)} / {p.budgetHours}</span></div>
                    <div className="kv"><span>Restbudget</span><span>{currency(p.remainingCosts)}</span></div>
                    <div className="kv"><span>Forecast</span><span>{currency(p.forecastCosts)}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'admin' && (
          <div className="grid two">
            <div className="card">
              <h3>Mitarbeiter anlegen</h3>
              <div className="form-grid">
                <label>Name<input value={employeeForm.name} onChange={e => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))} /></label>
                <label>Rolle<select value={employeeForm.role} onChange={e => setEmployeeForm(prev => ({ ...prev, role: e.target.value }))}><option>Mitarbeiter</option><option>Admin</option><option>Projektleiter</option><option>Teamlead</option></select></label>
                <label>Fachbereich<select value={employeeForm.department} onChange={e => setEmployeeForm(prev => ({ ...prev, department: e.target.value }))}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></label>
                <label>Bundesland<select value={employeeForm.state} onChange={e => setEmployeeForm(prev => ({ ...prev, state: e.target.value }))}>{STATES.map(s => <option key={s}>{s}</option>)}</select></label>
                <label>Sollstunden/Woche<input type="number" value={employeeForm.weeklyTargetHours} onChange={e => setEmployeeForm(prev => ({ ...prev, weeklyTargetHours: e.target.value }))} /></label>
                <label>Stundensatz<input type="number" value={employeeForm.hourlyRate} onChange={e => setEmployeeForm(prev => ({ ...prev, hourlyRate: e.target.value }))} /></label>
              </div>
              <button className="primary" onClick={addEmployee}>Mitarbeiter speichern</button>
            </div>
            <div className="card">
              <h3>Abwesenheit anlegen</h3>
              <div className="form-grid">
                <label>Mitarbeiter<select value={absenceForm.employeeId} onChange={e => setAbsenceForm(prev => ({ ...prev, employeeId: e.target.value }))}>{data.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
                <label>Typ<select value={absenceForm.type} onChange={e => setAbsenceForm(prev => ({ ...prev, type: e.target.value }))}><option>Urlaub</option><option>Krank</option><option>Fortbildung</option></select></label>
                <label>Von<input type="date" value={absenceForm.startDate} onChange={e => setAbsenceForm(prev => ({ ...prev, startDate: e.target.value }))} /></label>
                <label>Bis<input type="date" value={absenceForm.endDate} onChange={e => setAbsenceForm(prev => ({ ...prev, endDate: e.target.value }))} /></label>
                <label>Status<select value={absenceForm.status} onChange={e => setAbsenceForm(prev => ({ ...prev, status: e.target.value }))}><option>Genehmigt</option><option>Beantragt</option></select></label>
                <label className="full">Notiz<input value={absenceForm.note} onChange={e => setAbsenceForm(prev => ({ ...prev, note: e.target.value }))} /></label>
              </div>
              <button className="primary" onClick={addAbsence}>Abwesenheit speichern</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
