/* =======================
   Student model + storage
   ======================= */
class Student {
  constructor({id=null,name,roll,dept,email='',phone='',grade=0,active=true,createdAt=null}){
    this.id = id || Student.generateId();
    this.name = name.trim();
    this.roll = roll.trim();
    this.dept = dept.trim();
    this.email = email.trim();
    this.phone = phone.trim();
    this.grade = Number(grade) || 0;
    this.active = !!active;
    this.createdAt = createdAt || new Date().toISOString();
  }

  static generateId(){
    // stable unique id: timestamp + 3-digit random
    return Date.now().toString(36) + '-' + Math.floor(Math.random()*1000).toString(36);
  }

  static validate(obj){
    if(!obj.name || obj.name.length < 2) return 'Name must be at least 2 characters';
    if(!obj.roll) return 'Roll is required';
    if(!obj.dept) return 'Department is required';
    if(obj.grade && (obj.grade < 0 || obj.grade > 100)) return 'Grade must be 0–100';
    return null;
  }
}

const STORAGE_KEY = 'sm_students_v1';

/* =======================
   App state + helpers
   ======================= */
const state = {
  students: [],
  filtered: [],
  editingId: null,
  filters: {
    q: '',
    dept: '',
    minGrade: 0,
    sort: 'name-asc'
  }
};

function saveToStorage(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.students));
}

function loadFromStorage(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return arr.map(o => new Student(o));
  } catch(e){
    console.error('load error', e);
    return [];
  }
}

/* ================
   Initial data seed
   ================ */
function seedIfEmpty(){
  if(loadFromStorage().length === 0){
    const seed = [
      new Student({name:'Arun Kumar',roll:'20CS001',dept:'CSE',grade:89,active:true}),
      new Student({name:'Beena S',roll:'20CS012',dept:'CSE',grade:76,active:true}),
      new Student({name:'Chitra M',roll:'20EC007',dept:'ECE',grade:64,active:false}),
      new Student({name:'Daniel R',roll:'20ME019',dept:'MECH',grade:91,active:true})
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  }
}

/* =======================
   Rendering utilities
   ======================= */
const tbody = document.getElementById('tbody');
const totalCountEl = document.getElementById('totalCount');
const activeCountEl = document.getElementById('activeCount');
const deptFilter = document.getElementById('deptFilter');
const showingFilter = document.getElementById('showingFilter');
const emptyEl = document.getElementById('empty');

function uniqueDepts(){
  const set = new Set(state.students.map(s=>s.dept || 'Unknown'));
  return Array.from(set).sort();
}

function renderDeptOptions(){
  const depts = uniqueDepts();
  deptFilter.innerHTML = '<option value="">All</option>';
  depts.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    deptFilter.appendChild(opt);
  });
}

/* search + filter + sort */
function applyFilters(){
  let arr = state.students.slice();

  // search
  const q = state.filters.q.trim().toLowerCase();
  if(q){
    arr = arr.filter(s => {
      return s.name.toLowerCase().includes(q)
        || s.roll.toLowerCase().includes(q)
        || s.dept.toLowerCase().includes(q)
        || (s.email||'').toLowerCase().includes(q);
    });
  }

  // department
  if(state.filters.dept){
    arr = arr.filter(s => s.dept === state.filters.dept);
  }

  // min grade
  if(state.filters.minGrade){
    arr = arr.filter(s => Number(s.grade) >= Number(state.filters.minGrade));
  }

  // sort
  const sort = state.filters.sort;
  if(sort === 'name-asc') arr.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort === 'name-desc') arr.sort((a,b)=>b.name.localeCompare(a.name));
  if(sort === 'roll-asc') arr.sort((a,b)=>a.roll.localeCompare(b.roll));
  if(sort === 'roll-desc') arr.sort((a,b)=>b.roll.localeCompare(a.roll));

  state.filtered = arr;
  renderList();
}

/* render table rows */
function renderList(){
  tbody.innerHTML = '';
  const arr = state.filtered;
  totalCountEl.textContent = state.students.length;
  activeCountEl.textContent = state.students.filter(s=>s.active).length;

  if(arr.length === 0){
    emptyEl.style.display = 'block';
  } else {
    emptyEl.style.display = 'none';
    arr.forEach(s => {
      const tr = document.createElement('tr');
      tr.classList.add('row-enter');
      tr.innerHTML = `
        <td>
          <div style="display:flex;gap:12px;align-items:center">
            <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));display:flex;align-items:center;justify-content:center;font-weight:700">
              ${(s.name.charAt(0)||'S').toUpperCase()}
            </div>
            <div>
              <div style="font-weight:700">${escapeHtml(s.name)}</div>
              <div class="muted small">${escapeHtml(s.email || s.phone || '—')}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(s.roll)}</td>
        <td>${escapeHtml(s.dept)}</td>
        <td>${escapeHtml(String(s.grade))}%</td>
        <td>
          <span class="badge ${s.active ? 'active' : 'inactive'}">${s.active ? 'Active' : 'Inactive'}</span>
        </td>
        <td style="text-align:right">
          <div class="actions">
            <button class="icon-btn" title="Toggle active" data-action="toggle" data-id="${s.id}">🔁</button>
            <button class="icon-btn" title="Edit" data-action="edit" data-id="${s.id}">✏️</button>
            <button class="icon-btn" title="Delete" data-action="delete" data-id="${s.id}">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // showing filter text
  const pieces = [];
  if(state.filters.q) pieces.push(`query "${state.filters.q}"`);
  if(state.filters.dept) pieces.push(state.filters.dept);
  if(state.filters.minGrade) pieces.push(`grade ≥ ${state.filters.minGrade}`);
  showingFilter.textContent = pieces.length ? pieces.join(' • ') : 'all students';
}

/* safe helper */
function escapeHtml(s=''){
  return String(s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

/* =======================
   CRUD operations
   ======================= */
function addStudent(raw){
  const validation = Student.validate(raw);
  if(validation) return {error: validation};
  const student = new Student(raw);
  state.students.unshift(student); // newest on top
  saveToStorage();
  refresh();
  return {student};
}

function updateStudent(id, raw){
  const validation = Student.validate(raw);
  if(validation) return {error: validation};
  const idx = state.students.findIndex(s => s.id === id);
  if(idx === -1) return {error: 'Student not found'};
  state.students[idx] = Object.assign(new Student({}), Object.assign({}, state.students[idx], raw, {id}));
  saveToStorage();
  refresh();
  return {student: state.students[idx]};
}

function deleteStudent(id){
  const idx = state.students.findIndex(s => s.id === id);
  if(idx === -1) return false;
  state.students.splice(idx,1);
  saveToStorage();
  refresh();
  return true;
}

function toggleActive(id){
  const s = state.students.find(x=>x.id===id);
  if(!s) return false;
  s.active = !s.active;
  saveToStorage();
  refresh();
  return true;
}

/* =======================
   UI interactions
   ======================= */
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sortSelect');
const minGrade = document.getElementById('minGrade');
const minGradeValue = document.getElementById('minGradeValue');
const addBtn = document.getElementById('addBtn');
const modalBackdrop = document.getElementById('modalBackdrop');
const studentForm = document.getElementById('studentForm');
const inputs = {
  name: document.getElementById('name'),
  roll: document.getElementById('roll'),
  dept: document.getElementById('dept'),
  email: document.getElementById('email'),
  phone: document.getElementById('phone'),
  grade: document.getElementById('grade')
};
const cancelModal = document.getElementById('cancelModal');
const emptyAdd = document.getElementById('emptyAdd');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const clearBtn = document.getElementById('clearBtn');

// wire events
searchInput.addEventListener('input', (e)=> {
  state.filters.q = e.target.value;
  applyFilters();
});
sortSelect.addEventListener('change', (e)=> {
  state.filters.sort = e.target.value;
  applyFilters();
});
deptFilter.addEventListener('change', (e)=> {
  state.filters.dept = e.target.value;
  applyFilters();
});
minGrade.addEventListener('input', (e)=> {
  state.filters.minGrade = Number(e.target.value||0);
  minGradeValue.textContent = state.filters.minGrade;
  applyFilters();
});
addBtn.addEventListener('click', ()=> openModal());
emptyAdd.addEventListener('click', ()=> openModal());
cancelModal.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (ev)=>{
  if(ev.target === modalBackdrop) closeModal();
});

// keyboard: Esc closes
document.addEventListener('keydown',(e)=>{
  if(e.key === 'Escape' && modalBackdrop.style.display === 'flex') closeModal();
});

// table actions (delegation)
tbody.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if(action === 'delete'){
    if(confirm('Delete this student?')) deleteStudent(id);
  } else if(action === 'edit'){
    openModalForEdit(id);
  } else if(action === 'toggle'){
    toggleActive(id);
  }
});

// form submit
studentForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const raw = {
    name: inputs.name.value,
    roll: inputs.roll.value,
    dept: inputs.dept.value,
    email: inputs.email.value,
    phone: inputs.phone.value,
    grade: Number(inputs.grade.value||0),
    active: true
  };
  if(state.editingId){
    const res = updateStudent(state.editingId, raw);
    if(res.error) return alert(res.error);
    closeModal();
  } else {
    const res = addStudent(raw);
    if(res.error) return alert(res.error);
    closeModal();
  }
});

// export CSV
exportBtn.addEventListener('click', ()=>{
  const csv = toCSV(state.students);
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'students.csv'; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
});

// import CSV
importBtn.addEventListener('click', ()=>{
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.csv,text/csv';
  input.onchange = async (ev)=>{
    const file = ev.target.files[0]; if(!file) return;
    const text = await file.text();
    const arr = fromCSV(text);
    // quick merge - keep existing ids if provided, otherwise assign
    arr.forEach(item => {
      const existing = state.students.find(s => s.roll === item.roll);
      if(!existing) state.students.push(new Student(item));
    });
    saveToStorage();
    refresh();
    alert(`Imported ${arr.length} rows (duplicates by roll skipped)`);
  };
  input.click();
});

// clear storage (danger)
clearBtn.addEventListener('click', ()=>{
  if(confirm('Clear all stored students? This cannot be undone.')){
    localStorage.removeItem(STORAGE_KEY);
    state.students = [];
    refresh();
  }
});

/* =======================
   Modal helpers
   ======================= */
function openModal(){
  state.editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Student';
  studentForm.reset();
  inputs.grade.value = 0;
  showModal();
}
function openModalForEdit(id){
  const s = state.students.find(x=>x.id===id);
  if(!s) return alert('Student not found');
  state.editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Student';
  inputs.name.value = s.name;
  inputs.roll.value = s.roll;
  inputs.dept.value = s.dept;
  inputs.email.value = s.email;
  inputs.phone.value = s.phone;
  inputs.grade.value = s.grade;
  showModal();
}
function showModal(){
  modalBackdrop.style.display = 'flex';
  setTimeout(()=> modalBackdrop.querySelector('.modal').classList.add('show'), 15);
  modalBackdrop.setAttribute('aria-hidden','false');
  inputs.name.focus();
}
function closeModal(){
  modalBackdrop.querySelector('.modal').classList.remove('show');
  setTimeout(()=> {
    modalBackdrop.style.display = 'none';
    modalBackdrop.setAttribute('aria-hidden','true');
  }, 220);
  state.editingId = null;
}

/* =======================
   CSV helpers
   ======================= */
function toCSV(list){
  const header = ['id','name','roll','dept','email','phone','grade','active','createdAt'];
  const rows = list.map(s => header.map(h => JSON.stringify(String(s[h] ?? ''))).join(','));
  return header.join(',') + '\n' + rows.join('\n');
}
function fromCSV(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(lines.length <= 1) return [];
  const header = lines[0].split(',').map(h => h.replace(/(^"|"$)/g,'').trim());
  const out = [];
  for(let i=1;i<lines.length;i++){
    const cols = parseCSVLine(lines[i]);
    if(cols.length !== header.length) continue;
    const obj = {};
    header.forEach((h,idx)=> obj[h] = cols[idx]);
    out.push({
      id: obj.id || undefined,
      name: obj.name || 'Unknown',
      roll: obj.roll || `R-${Math.floor(Math.random()*9999)}`,
      dept: obj.dept || 'Unknown',
      email: obj.email || '',
      phone: obj.phone || '',
      grade: Number(obj.grade||0),
      active: obj.active === 'true' || obj.active === '1' || obj.active === true,
      createdAt: obj.createdAt || new Date().toISOString()
    });
  }
  return out;
}
function parseCSVLine(line){
  // Simple CSV parse (handles quoted fields)
  const res = [];
  let cur = '', inQ = false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch === '"' ){
      if(inQ && line[i+1] === '"'){ cur += '"'; i++; }
      else inQ = !inQ;
    } else if(ch === ',' && !inQ){
      res.push(cur); cur = '';
    } else cur += ch;
  }
  res.push(cur);
  return res.map(s => s.replace(/^"|"$/g,''));
}

/* =======================
   Refresh (load & render)
   ======================= */
function refresh(){
  state.students = loadFromStorage();
  renderDeptOptions();
  applyFilters();
}

/* initial setup */
seedIfEmpty();
state.students = loadFromStorage();
renderDeptOptions();
applyFilters();

/* small accessibility enhancement: focus trap not implemented but keyboard closes */
