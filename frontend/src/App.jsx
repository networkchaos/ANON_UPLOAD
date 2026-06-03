import { useState, useEffect, useRef } from "react";

// ─── API CONFIG ───────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function apiGet(path, adminToken) {
  const res = await fetch(`${API}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function apiPatch(path, body, adminToken) {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function apiDelete(path, adminToken) {
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: {
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─── STATUS COLORS ────────────────────────────────────────────────────────────
const STATUS = {
  pending:    { label: "Pending Review", color: "#f59e0b" },
  approved:   { label: "Approved",       color: "#10b981" },
  rejected:   { label: "Rejected",       color: "#ef4444" },
  inprogress: { label: "In Progress",    color: "#3b82f6" },
  done:       { label: "Completed",      color: "#8b5cf6" },
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem("au_admin_token") || null);
  const [sessionData, setSessionData] = useState(null);
  const [glitch, setGlitch] = useState(false);

  const setAdmin = (token) => {
    setAdminToken(token);
    if (token) sessionStorage.setItem("au_admin_token", token);
    else sessionStorage.removeItem("au_admin_token");
  };

  useEffect(() => {
    const t = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 400); }, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={S.root}>
      <Scanlines />
      <Header view={view} setView={setView} adminAuthed={!!adminToken} glitch={glitch} />
      {view === "home"    && <Home setView={setView} />}
      {view === "upload"  && <UploadForm setView={setView} setSessionData={setSessionData} />}
      {view === "success" && <Success sessionData={sessionData} setView={setView} />}
      {view === "track"   && <Track />}
      {view === "admin"   && <Admin token={adminToken} setToken={setAdmin} />}
    </div>
  );
}

function Scanlines() {
  return <div style={S.scanlines} />;
}

function Header({ view, setView, adminAuthed, glitch }) {
  return (
    <header style={S.header}>
      <div style={{ ...S.logo, ...(glitch ? S.logoGlitch : {}) }} onClick={() => setView("home")}>
        <span style={S.logoSquare}>▓</span> ANON<span style={S.logoDot}>_</span>UPLOAD
      </div>
      <nav style={S.nav}>
        {[["home","HOME"],["upload","SUBMIT"],["track","TRACK"]].map(([v,l]) => (
          <NavBtn key={v} active={view===v} onClick={() => setView(v)}>{l}</NavBtn>
        ))}
        <NavBtn active={view==="admin"} onClick={() => setView("admin")} dim={!adminAuthed}>
          {adminAuthed ? "⬡ PANEL" : "⬡ ADMIN"}
        </NavBtn>
      </nav>
    </header>
  );
}

function NavBtn({ children, active, onClick, dim }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ ...S.navBtn, ...(active?S.navBtnActive:{}), ...(h&&!active?S.navBtnHover:{}), opacity:dim?.5:1 }}>
      {children}
    </button>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ setView }) {
  return (
    <main style={S.main}>
      <div style={S.heroBox}>
        <div style={S.heroTag}>[ ANONYMOUS // ENCRYPTED // ZERO-TRACE ]</div>
        <h1 style={S.heroTitle}>Drop your work.<br /><span style={S.heroAccent}>No names. No traces.</span></h1>
        <p style={S.heroSub}>
          Upload your school assignment brief. Set a deadline and budget. Get a random cryptographic
          session token. Your content is AES-256 encrypted before it hits our database — not even
          we can read it without your token.
        </p>
        <div style={S.heroBtns}>
          <BigBtn onClick={() => setView("upload")}>▶ SUBMIT A JOB</BigBtn>
          <BigBtn ghost onClick={() => setView("track")}>⬡ TRACK STATUS</BigBtn>
        </div>
        <div style={S.statsRow}>
          <Stat label="ENCRYPTION" value="AES-256-GCM" />
          <Stat label="TOKEN" value="CRYPTOGRAPHIC" />
          <Stat label="IP STORED" value="NEVER (HASHED)" />
          <Stat label="RESPONSE" value="&lt; 24H" />
        </div>
      </div>
      <div style={S.termBox}>
        <TermLine prefix="$" text="token = crypto.generateSessionToken()" delay={0} />
        <TermLine prefix=">" text="→ AU-K7MQ2P::a8fGhJ3mNpQrTvXy4Z6wR9s" delay={400} />
        <TermLine prefix=">" text="content.encrypt(AES-256-GCM)  ✓" delay={800} />
        <TermLine prefix=">" text="ip_address = SHA256(HMAC) → stored" delay={1100} />
        <TermLine prefix=">" text="plaintext_stored = false" delay={1400} />
        <TermLine prefix="$" text="█" delay={1700} blink />
      </div>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div style={S.stat}>
      <div style={S.statVal}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

function TermLine({ prefix, text, delay, blink }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!show) return null;
  return (
    <div style={S.termLine}>
      <span style={S.termPrefix}>{prefix}</span>
      <span style={blink ? S.termBlink : {}}>{text}</span>
    </div>
  );
}

// ─── UPLOAD FORM ──────────────────────────────────────────────────────────────
function UploadForm({ setView, setSessionData }) {
  const [form, setForm] = useState({ subject:"", description:"", deadline:"", budget:"", currency:"USD", fileName:"", fileContent:"" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 400_000) { setErrors(e => ({ ...e, fileContent: "File too large (max 400KB)" })); return; }
    set("fileName", file.name);
    const reader = new FileReader();
    reader.onload = ev => set("fileContent", ev.target.result);
    reader.readAsText(file);
  };

  const validate = () => {
    const e = {};
    if (!form.subject.trim())     e.subject = "Required";
    if (!form.description.trim()) e.description = "Required";
    if (!form.deadline)           e.deadline = "Required";
    if (!form.budget.trim() || isNaN(parseFloat(form.budget))) e.budget = "Enter a valid number";
    if (!form.fileContent.trim()) e.fileContent = "Upload a file or paste content";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setApiError("");
    try {
      const result = await apiPost("/submit", {
        subject:     form.subject,
        description: form.description,
        deadline:    form.deadline,
        budget:      parseFloat(form.budget),
        currency:    form.currency,
        fileName:    form.fileName,
        fileContent: form.fileContent,
      });
      setSessionData({ jobId: result.jobId, fullToken: result.fullToken });
      setView("success");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={S.main}>
      <div style={S.formWrap}>
        <div style={S.formHeader}>
          <div style={S.formTag}>NEW ANONYMOUS SUBMISSION</div>
          <h2 style={S.formTitle}>Upload Your Job Brief</h2>
          <p style={S.formSub}>No personal info collected. Content is AES-256 encrypted. You'll receive a cryptographic token — the only key to your submission.</p>
        </div>

        <div style={S.formGrid}>
          <Field label="SUBJECT / COURSE" error={errors.subject}>
            <input style={{...S.input,...(errors.subject?S.inputErr:{})}}
              placeholder="e.g. Computer Networks Assignment 3"
              value={form.subject} onChange={e => set("subject", e.target.value)} />
          </Field>

          <Field label="DESCRIPTION" error={errors.description} full>
            <textarea style={{...S.input,...S.textarea,...(errors.description?S.inputErr:{})}}
              placeholder="Describe the task, requirements, deliverables expected... and a way to contact you payment always done on Paypal"
              value={form.description} onChange={e => set("description", e.target.value)} rows={4} />
          </Field>

          <Field label="DEADLINE DATE" error={errors.deadline}>
            <input type="date" style={{...S.input,...(errors.deadline?S.inputErr:{})}}
              value={form.deadline} onChange={e => set("deadline", e.target.value)} />
          </Field>

          <Field label="BUDGET" error={errors.budget}>
            <div style={{ display:"flex", gap:8 }}>
              <select style={{...S.input, width:90, flex:"none"}}
                value={form.currency} onChange={e => set("currency", e.target.value)}>
                {["USD","KES","EUR","GBP","CAD","AUD"].map(c => <option key={c}>{c}</option>)}
              </select>
              <input style={{...S.input, flex:1,...(errors.budget?S.inputErr:{})}}
                placeholder="e.g. 20" value={form.budget}
                onChange={e => set("budget", e.target.value)} />
            </div>
          </Field>

          <Field label="ATTACH FILE" error={errors.fileContent} full>
            <div style={S.fileZone} onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" style={{display:"none"}}
                accept=".txt,.md,.doc,.docx,.pdf,.readme"
                onChange={handleFile} />
              {form.fileName
                ? <span style={{ color:"#0ff" }}>✓ {form.fileName}</span>
                : <span>Click to upload README, .txt, .md, .doc, .pdf (max 400KB)</span>}
            </div>
            <div style={S.orLine}><span>— OR PASTE CONTENT —</span></div>
            <textarea style={{...S.input,...S.textarea,...(errors.fileContent?S.inputErr:{})}}
              placeholder="Paste your README / brief text here... Remember to include a way to contact you (payment always done on Paypal)"
              value={form.fileContent} onChange={e => set("fileContent", e.target.value)} rows={5} />
          </Field>
        </div>

        {apiError && <div style={S.apiError}>⚠ {apiError}</div>}

        <div style={S.privacyNote}>
          🔒 AES-256-GCM encrypted before storage. Your IP is hashed with HMAC-SHA256 — never stored raw.
          Save your token — it cannot be recovered if lost.
        </div>

        <BigBtn onClick={submit} disabled={submitting} style={{ marginTop:24 }}>
          {submitting ? "ENCRYPTING & UPLOADING..." : "▶ SUBMIT ANONYMOUSLY"}
        </BigBtn>
      </div>
    </main>
  );
}

function Field({ label, children, error, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "span 1" }}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
      {error && <div style={S.fieldError}>{error}</div>}
    </div>
  );
}

// ─── SUCCESS ──────────────────────────────────────────────────────────────────
function Success({ sessionData, setView }) {
  const [copied, setCopied] = useState(null);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <main style={S.main}>
      <div style={S.successBox}>
        <div style={S.successIcon}>▓▓▓</div>
        <h2 style={S.successTitle}>SUBMISSION RECEIVED</h2>
        <p style={S.successSub}>
          Your job is queued for review. Below is your cryptographic session token.
          It is shown <strong style={{ color:"#f59e0b" }}>exactly once</strong> — copy it now.
        </p>

        <div style={S.credBox}>
          <CredRow label="JOB ID"        value={sessionData?.jobId}      onCopy={() => copy(sessionData?.jobId, "id")}    copied={copied==="id"} />
          <CredRow label="SESSION TOKEN" value={sessionData?.fullToken}  onCopy={() => copy(sessionData?.fullToken, "tok")} copied={copied==="tok"} />
        </div>

        <div style={S.tokenExplainer}>
          <div style={S.tokenPart}><span style={{ color:C.cyan }}>AU-XXXXXX</span> — your public Job ID</div>
          <div style={S.tokenPart}><span style={{ color:C.green }}>::YYYYYYYYYYYYYYYY</span> — your secret key</div>
          <div style={S.tokenPartNote}>Both parts together are required to track your job. Neither is stored in plain text.</div>
        </div>

        <p style={S.warningText}>⚠ This page will not show these again. Copy before leaving.</p>

        <div style={{ display:"flex", gap:16, marginTop:24 }}>
          <BigBtn onClick={() => setView("track")}>TRACK MY JOB</BigBtn>
          <BigBtn ghost onClick={() => setView("home")}>HOME</BigBtn>
        </div>
      </div>
    </main>
  );
}

function CredRow({ label, value, onCopy, copied }) {
  return (
    <div style={S.credRow}>
      <span style={S.credLabel}>{label}</span>
      <span style={S.credVal}>{value}</span>
      <button style={{ ...S.copyBtn, ...(copied ? { borderColor:C.green, color:C.green } : {}) }} onClick={onCopy}>
        {copied ? "✓ COPIED" : "COPY"}
      </button>
    </div>
  );
}

// ─── TRACK ────────────────────────────────────────────────────────────────────
function Track() {
  const [fullToken, setFullToken] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    setErr(""); setResult(null);
    const parts = fullToken.trim().split("::");
    if (parts.length !== 2 || !parts[0].startsWith("AU-")) {
      setErr("Token format invalid. Expected: AU-XXXXXX::YYYYYYYY");
      return;
    }
    const [jobId, _] = parts;
    setLoading(true);
    try {
      const sub = await apiPost("/track", { jobId, fullToken: fullToken.trim() });
      setResult(sub);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const s = result ? STATUS[result.status] : null;

  return (
    <main style={S.main}>
      <div style={S.trackWrap}>
        <div style={S.formTag}>ANONYMOUS TRACKER</div>
        <h2 style={S.formTitle}>Track Your Submission</h2>
        <p style={S.formSub}>Paste your full session token (AU-XXXXXX::YYYYYYYY) to check status.</p>

        <div style={S.trackInputs}>
          <input style={S.input}
            placeholder="AU-XXXXXX::YYYYYYYYYYYYYYYYyyyy"
            value={fullToken} onChange={e => setFullToken(e.target.value)}
            onKeyDown={e => e.key==="Enter" && lookup()} />
          <BigBtn onClick={lookup} disabled={loading}>{loading ? "LOOKING UP..." : "LOOK UP"}</BigBtn>
        </div>

        {err && <div style={S.trackErr}>⚠ {err}</div>}

        {result && (
          <div style={S.resultCard}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={S.resultId}>{result.id}</span>
              <span style={{ ...S.statusBadge, borderColor:s.color, color:s.color }}>{s.label}</span>
            </div>
            <InfoRow label="Subject"   value={result.subject} />
            <InfoRow label="Deadline"  value={result.deadline} />
            <InfoRow label="Budget"    value={`${result.currency} ${result.budget}`} />
            <InfoRow label="File"      value={result.fileName} />
            <InfoRow label="Submitted" value={new Date(result.submittedAt).toLocaleString()} />
            <InfoRow label="Updated"   value={new Date(result.updatedAt).toLocaleString()} />
            {result.adminNote && (
              <div style={S.adminNoteBox}>
                <div style={S.adminNoteLabel}>MESSAGE FROM PLATFORM</div>
                <div style={S.adminNoteText}>{result.adminNote}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={S.infoRow}>
      <span style={S.infoLabel}>{label}</span>
      <span style={S.infoVal}>{value}</span>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function Admin({ token, setToken }) {
  const [pass, setPass] = useState("");
  const [passErr, setPassErr] = useState("");
  const [logging, setLogging] = useState(false);
  const [subs, setSubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [selectedFull, setSelectedFull] = useState(null);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  const login = async () => {
    setPassErr(""); setLogging(true);
    try {
      const r = await apiPost("/admin/login", { password: pass });
      setToken(r.token);
    } catch (e) {
      setPassErr(e.message);
    } finally {
      setLogging(false);
    }
  };

  const fetchList = async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const r = await apiGet(`/admin/submissions?status=${filter}&page=1`, token);
      setSubs(r.submissions || []);
      setTotal(r.total || 0);
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("Unauthorized")) setToken(null);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchDetail = async (id) => {
    setLoadingDetail(true);
    setSelectedFull(null);
    try {
      const r = await apiGet(`/admin/submissions/${id}`, token);
      setSelectedFull(r);
      setNote(r.adminNote || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const update = async (status) => {
    setUpdateMsg("");
    try {
      await apiPatch(`/admin/submissions/${selectedFull.id}`, { status, adminNote: note }, token);
      setUpdateMsg("✓ Updated");
      fetchList();
      setSelectedFull(f => ({ ...f, status, adminNote: note }));
      setTimeout(() => setUpdateMsg(""), 2500);
    } catch (e) {
      setUpdateMsg("⚠ " + e.message);
    }
  };

  const del = async (id) => {
    if (!confirm(`Delete ${id}?`)) return;
    try {
      await apiDelete(`/admin/submissions/${id}`, token);
      setSelected(null); setSelectedFull(null);
      fetchList();
    } catch (e) { alert(e.message); }
  };

  useEffect(() => { if (token) fetchList(); }, [token, filter]);

  if (!token) {
    return (
      <main style={S.main}>
        <div style={S.adminLogin}>
          <div style={S.formTag}>PLATFORM OPERATOR ACCESS</div>
          <h2 style={S.formTitle}>Admin Panel</h2>
          <p style={S.formSub}>JWT-secured session. Expires in 4 hours.</p>
          <input type="password" style={{...S.input, marginTop:16, marginBottom:8,...(passErr?S.inputErr:{})}}
            placeholder="Enter admin password"
            value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key==="Enter" && login()} />
          {passErr && <div style={S.fieldError}>{passErr}</div>}
          <BigBtn onClick={login} disabled={logging} style={{ marginTop:16 }}>
            {logging ? "AUTHENTICATING..." : "AUTHENTICATE"}
          </BigBtn>
        </div>
      </main>
    );
  }

  const filtered = subs;

  return (
    <main style={{ ...S.main, padding:"24px 16px" }}>
      <div style={S.adminWrap}>
        {/* LEFT */}
        <div style={S.adminList}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={S.formTag}>JOBS ({total})</span>
            <div style={{ display:"flex", gap:8 }}>
              <button style={S.refreshBtn} onClick={fetchList}>↺</button>
              <button style={{ ...S.refreshBtn, color:C.red, borderColor:C.red }} onClick={() => setToken(null)}>LOGOUT</button>
            </div>
          </div>
          <div style={S.filterRow}>
            {["all","pending","approved","inprogress","done","rejected"].map(f => (
              <button key={f} style={{...S.filterBtn,...(filter===f?S.filterBtnActive:{})}} onClick={() => setFilter(f)}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {loadingList && <div style={S.emptyMsg}>Loading...</div>}
          {!loadingList && filtered.length === 0 && <div style={S.emptyMsg}>No submissions.</div>}
          {filtered.map(s => (
            <div key={s.id}
              style={{...S.subCard,...(selected===s.id?S.subCardActive:{})}}
              onClick={() => { setSelected(s.id); fetchDetail(s.id); }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={S.subId}>{s.id}</span>
                <span style={{ color:STATUS[s.status]?.color, fontSize:16 }}>●</span>
              </div>
              <div style={S.subMeta}>{s.currency} {s.budget_amount} · {s.deadline}</div>
              <div style={{ ...S.subMeta, color:STATUS[s.status]?.color, marginTop:2 }}>{STATUS[s.status]?.label}</div>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div style={S.adminDetail}>
          {!selectedFull && !loadingDetail && <div style={S.emptyMsg}>← Select a submission</div>}
          {loadingDetail && <div style={S.emptyMsg}>Decrypting...</div>}
          {selectedFull && !loadingDetail && (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={S.resultId}>{selectedFull.id}</div>
                  <span style={{...S.statusBadge, borderColor:STATUS[selectedFull.status]?.color, color:STATUS[selectedFull.status]?.color, marginTop:6, display:"inline-block"}}>
                    {STATUS[selectedFull.status]?.label}
                  </span>
                </div>
                <button style={S.deleteBtn} onClick={() => del(selectedFull.id)}>✕ DELETE</button>
              </div>

              <InfoRow label="Subject"   value={selectedFull.subject} />
              <InfoRow label="Deadline"  value={selectedFull.deadline} />
              <InfoRow label="Budget"    value={`${selectedFull.currency} ${selectedFull.budget}`} />
              <InfoRow label="File"      value={selectedFull.fileName} />
              <InfoRow label="Submitted" value={new Date(selectedFull.submittedAt).toLocaleString()} />
              <InfoRow label="Accesses"  value={selectedFull.accessCount} />

              <div style={S.filePreview}>
                <div style={S.adminNoteLabel}>FILE CONTENT (DECRYPTED)</div>
                <pre style={S.preText}>{selectedFull.fileContent}</pre>
              </div>

              <div style={{ marginTop:16 }}>
                <label style={S.fieldLabel}>MESSAGE TO CLIENT</label>
                <textarea style={{...S.input,...S.textarea}} rows={3}
                  placeholder="e.g. Accepted. Delivery by Thursday. Price confirmed: KES 1500"
                  value={note} onChange={e => setNote(e.target.value)} />
              </div>

              <div style={S.actionRow}>
                {["approved","inprogress","done","rejected"].map(st => (
                  <button key={st}
                    style={{...S.actionBtn, borderColor:STATUS[st]?.color, color:STATUS[st]?.color}}
                    onClick={() => update(st)}>
                    {STATUS[st]?.label.toUpperCase()}
                  </button>
                ))}
              </div>
              {updateMsg && <div style={{ marginTop:8, fontSize:12, color:updateMsg.startsWith("✓")?C.green:C.red }}>{updateMsg}</div>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function BigBtn({ children, onClick, ghost, disabled, style }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{...S.bigBtn,...(ghost?S.bigBtnGhost:{}),...(h&&!disabled?(ghost?S.bigBtnGhostHover:S.bigBtnHover):{}),...(disabled?{opacity:.5,cursor:"wait"}:{}),...style}}>
      {children}
    </button>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const C = { bg:"#090b0f", panel:"#0d1117", border:"#1a2232", green:"#00ff88", cyan:"#0ff", muted:"#4a5568", text:"#c9d1d9", dim:"#6e7681", red:"#ef4444", amber:"#f59e0b" };

const S = {
  root:{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Courier New', Courier, monospace", position:"relative", overflowX:"hidden" },
  scanlines:{ position:"fixed", inset:0, pointerEvents:"none", zIndex:999, background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,136,0.015) 2px,rgba(0,255,136,0.015) 4px)" },
  header:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 32px", borderBottom:`1px solid ${C.border}`, background:C.panel, position:"sticky", top:0, zIndex:10 },
  logo:{ fontSize:20, fontWeight:700, letterSpacing:4, color:C.green, cursor:"pointer", userSelect:"none", textShadow:`0 0 12px ${C.green}` },
  logoGlitch:{ textShadow:`2px 0 ${C.cyan}, -2px 0 #f00, 0 0 12px ${C.green}`, transform:"skewX(-2deg)" },
  logoSquare:{ color:C.cyan, marginRight:6 }, logoDot:{ color:C.amber },
  nav:{ display:"flex", gap:4 },
  navBtn:{ background:"transparent", border:"1px solid transparent", color:C.dim, padding:"6px 14px", cursor:"pointer", fontSize:11, letterSpacing:2, fontFamily:"inherit", transition:"all .15s" },
  navBtnActive:{ color:C.green, borderColor:C.green, textShadow:`0 0 8px ${C.green}` },
  navBtnHover:{ color:C.text, borderColor:C.border },
  main:{ maxWidth:960, margin:"0 auto", padding:"48px 24px" },
  heroBox:{ marginBottom:48 },
  heroTag:{ fontSize:10, letterSpacing:4, color:C.muted, marginBottom:16 },
  heroTitle:{ fontSize:"clamp(28px,5vw,52px)", fontWeight:700, lineHeight:1.15, color:C.text, margin:"0 0 20px" },
  heroAccent:{ color:C.green, textShadow:`0 0 20px ${C.green}` },
  heroSub:{ color:C.dim, lineHeight:1.7, maxWidth:560, marginBottom:32, fontSize:14 },
  heroBtns:{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:48 },
  statsRow:{ display:"flex", gap:32, flexWrap:"wrap" },
  stat:{ borderLeft:`2px solid ${C.green}`, paddingLeft:12 },
  statVal:{ fontSize:13, fontWeight:700, color:C.green, letterSpacing:1 },
  statLabel:{ fontSize:10, color:C.muted, letterSpacing:2, marginTop:2 },
  termBox:{ background:C.panel, border:`1px solid ${C.border}`, padding:"20px 24px", marginTop:32 },
  termLine:{ display:"flex", gap:12, padding:"4px 0", fontSize:13, color:C.dim },
  termPrefix:{ color:C.green, minWidth:12 },
  termBlink:{ animation:"blink 1s step-end infinite" },
  formWrap:{ maxWidth:640, margin:"0 auto" },
  formHeader:{ marginBottom:32 },
  formTag:{ fontSize:10, letterSpacing:4, color:C.muted, marginBottom:10 },
  formTitle:{ fontSize:28, fontWeight:700, color:C.text, margin:"0 0 8px" },
  formSub:{ color:C.dim, fontSize:13, lineHeight:1.6 },
  formGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px 24px" },
  fieldLabel:{ display:"block", fontSize:10, letterSpacing:3, color:C.muted, marginBottom:6 },
  fieldError:{ fontSize:11, color:C.red, marginTop:4 },
  input:{ width:"100%", background:"transparent", border:`1px solid ${C.border}`, color:C.text, padding:"10px 12px", fontFamily:"inherit", fontSize:13, outline:"none", boxSizing:"border-box", transition:"border-color .15s" },
  inputErr:{ borderColor:C.red },
  textarea:{ resize:"vertical", minHeight:80 },
  fileZone:{ border:`1px dashed ${C.border}`, padding:"20px", textAlign:"center", cursor:"pointer", color:C.dim, fontSize:13, marginBottom:8 },
  orLine:{ textAlign:"center", fontSize:11, color:C.muted, letterSpacing:2, margin:"8px 0" },
  privacyNote:{ background:"rgba(0,255,136,0.04)", border:`1px solid rgba(0,255,136,0.15)`, padding:"12px 16px", fontSize:12, color:C.dim, lineHeight:1.6, marginTop:24 },
  apiError:{ background:"rgba(239,68,68,0.08)", border:`1px solid ${C.red}`, padding:"10px 14px", fontSize:12, color:C.red, marginTop:16 },
  successBox:{ maxWidth:560, margin:"0 auto", textAlign:"center" },
  successIcon:{ fontSize:32, color:C.green, letterSpacing:6, marginBottom:16, textShadow:`0 0 20px ${C.green}` },
  successTitle:{ fontSize:28, fontWeight:700, color:C.green, marginBottom:8 },
  successSub:{ color:C.dim, fontSize:13, lineHeight:1.6, marginBottom:32 },
  credBox:{ background:C.panel, border:`1px solid ${C.border}`, padding:20, textAlign:"left", marginBottom:8 },
  credRow:{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` },
  credLabel:{ fontSize:10, letterSpacing:3, color:C.muted, minWidth:120 },
  credVal:{ flex:1, color:C.cyan, fontWeight:700, fontSize:12, wordBreak:"break-all" },
  copyBtn:{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"4px 10px", cursor:"pointer", fontSize:10, fontFamily:"inherit", letterSpacing:2, whiteSpace:"nowrap" },
  tokenExplainer:{ background:"rgba(0,255,136,0.03)", border:`1px solid rgba(0,255,136,0.1)`, padding:"12px 16px", textAlign:"left", marginTop:8 },
  tokenPart:{ fontSize:12, color:C.dim, padding:"4px 0" },
  tokenPartNote:{ fontSize:11, color:C.muted, marginTop:6, lineHeight:1.5 },
  warningText:{ color:C.amber, fontSize:12, marginTop:12, letterSpacing:1 },
  trackWrap:{ maxWidth:600, margin:"0 auto" },
  trackInputs:{ display:"flex", flexDirection:"column", gap:12, marginTop:24 },
  trackErr:{ color:C.red, fontSize:13, marginTop:12 },
  resultCard:{ background:C.panel, border:`1px solid ${C.border}`, padding:24, marginTop:24 },
  resultId:{ fontSize:20, fontWeight:700, color:C.cyan, letterSpacing:2 },
  statusBadge:{ border:"1px solid", padding:"4px 12px", fontSize:11, letterSpacing:2 },
  infoRow:{ display:"flex", gap:16, padding:"8px 0", borderBottom:`1px solid ${C.border}` },
  infoLabel:{ fontSize:10, letterSpacing:2, color:C.muted, minWidth:100 },
  infoVal:{ color:C.text, fontSize:13 },
  adminNoteBox:{ background:"rgba(0,255,136,0.05)", border:`1px solid rgba(0,255,136,0.2)`, padding:12, marginTop:16 },
  adminNoteLabel:{ fontSize:10, letterSpacing:3, color:C.green, marginBottom:6 },
  adminNoteText:{ color:C.text, fontSize:13, lineHeight:1.6 },
  adminLogin:{ maxWidth:380, margin:"0 auto" },
  adminWrap:{ display:"flex", gap:24, alignItems:"flex-start" },
  adminList:{ width:260, flexShrink:0 },
  adminDetail:{ flex:1, background:C.panel, border:`1px solid ${C.border}`, padding:24, minHeight:400 },
  refreshBtn:{ background:"transparent", border:`1px solid ${C.border}`, color:C.dim, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit", fontSize:10, letterSpacing:2 },
  filterRow:{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:12 },
  filterBtn:{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", fontSize:9, letterSpacing:1 },
  filterBtnActive:{ borderColor:C.green, color:C.green },
  subCard:{ border:`1px solid ${C.border}`, padding:"12px 14px", cursor:"pointer", marginBottom:8 },
  subCardActive:{ borderColor:C.cyan },
  subId:{ fontSize:11, color:C.cyan, letterSpacing:2, fontWeight:700 },
  subMeta:{ fontSize:10, color:C.muted, marginTop:4 },
  emptyMsg:{ color:C.muted, fontSize:12, padding:24, textAlign:"center" },
  filePreview:{ background:"#060a0f", border:`1px solid ${C.border}`, padding:12, marginTop:16 },
  preText:{ color:C.dim, fontSize:11, margin:0, whiteSpace:"pre-wrap", maxHeight:200, overflow:"auto" },
  actionRow:{ display:"flex", flexWrap:"wrap", gap:8, marginTop:16 },
  actionBtn:{ background:"transparent", border:"1px solid", padding:"8px 14px", cursor:"pointer", fontFamily:"inherit", fontSize:10, letterSpacing:2 },
  deleteBtn:{ background:"transparent", border:`1px solid ${C.red}`, color:C.red, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit", fontSize:10, letterSpacing:2 },
  bigBtn:{ background:C.green, color:"#000", border:"none", padding:"14px 32px", fontFamily:"inherit", fontWeight:700, fontSize:12, letterSpacing:3, cursor:"pointer", transition:"all .15s" },
  bigBtnHover:{ background:"#00ffaa", boxShadow:`0 0 20px ${C.green}` },
  bigBtnGhost:{ background:"transparent", color:C.green, border:`1px solid ${C.green}` },
  bigBtnGhostHover:{ background:"rgba(0,255,136,0.1)" },
};
