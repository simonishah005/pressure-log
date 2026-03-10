import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const GEMINI_KEY = "AIzaSyAOTj82sgMuQyhhZ5GV2XKzKW_3V0HbirU";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
const CORRECT_PIN = "7777";

const C = {
  cream:    "#FAE3B1",
  olive:    "#998731",
  sky:      "#5FA8C2",
  skyLight: "#ddf0f7",
  skyMid:   "#a8d4e3",
  orange:   "#CF5527",
  red:      "#7D2027",
  brown:    "#673C34",
  brownLight:"#8a5a50",
  green:    "#2d6a4f",
  greenLight:"#d8f3dc",
  teal:     "#3a8a7a",
  tealLight:"#d0eeea",
  white:    "#FDFAF5",
  offwhite: "#F5EFE4",
};

const DAILY_MESSAGES = [
  "Every breath is a fresh start. You are doing wonderfully, Kamlesh.",
  "The body heals best when the heart is at peace. Rest easy today.",
  "Small steps every day add up to something beautiful. Keep going.",
  "You are loved more than you know. Today is a good day.",
  "Like a calm river, let today flow gently and peacefully.",
  "You have faced every challenge life has thrown at you. Today is no different!",
  "Taking care of yourself is an act of courage. You're doing great!",
  "Champions take care of their health. That's exactly what you're doing.",
  "Every reading logged is a step towards a healthier, stronger you!",
  "You inspire the people around you more than you realise. Keep shining!",
  "Gratitude opens the door to abundance. Today, be thankful for this body that carries you.",
  "God's greatest gift is health. You are blessed.",
  "The present moment is a gift. Breathe it in deeply.",
  "What you nurture today blooms tomorrow. Take good care of yourself.",
  "You are a blessing to your family. They are grateful for every day with you.",
  "Good morning! Your blood pressure called — it wants to be normal today.",
  "Age is just a number. Yours happens to be a very distinguished one!",
  "You're not getting older, you're getting better — like a fine chai!",
  "Doctor's orders: one smile every morning. You've already completed today's dose!",
  "Life is short. Enjoy the good stuff and check your BP so you can enjoy more of it!",
];

function getDailyMessage() {
  const day = Math.floor(Date.now() / 86400000);
  return DAILY_MESSAGES[day % DAILY_MESSAGES.length];
}

function classifyBP(sys, dia) {
  if (sys < 120 && dia < 80) return { label: "Normal",       color: C.green,  bg: C.greenLight };
  if (sys < 130 && dia < 80) return { label: "Elevated",     color: C.olive,  bg: "#fdf3d0" };
  if (sys < 140 || dia < 90) return { label: "High Stage 1", color: C.orange, bg: "#fde8dc" };
  return                             { label: "High Stage 2", color: C.red,    bg: "#f5d0d2" };
}

function MiniChart({ readings }) {
  if (readings.length < 2) return null;
  const last7 = readings.slice(-7);
  const allVals = [...last7.map(r => r.systolic), ...last7.map(r => r.diastolic)];
  const maxV = Math.max(...allVals) + 10;
  const minV = Math.min(...allVals) - 10;
  const w = 300, h = 80;
  const px = (i) => (i / (last7.length - 1)) * (w - 20) + 10;
  const py = (v) => h - ((v - minV) / (maxV - minV)) * (h - 20) + 5;
  const spts = last7.map((r, i) => `${px(i)},${py(r.systolic)}`).join(" ");
  const dpts = last7.map((r, i) => `${px(i)},${py(r.diastolic)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 80 }}>
      <polyline points={spts} fill="none" stroke={C.sky} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={dpts} fill="none" stroke={C.teal} strokeWidth="2" strokeDasharray="4,3" strokeLinecap="round" strokeLinejoin="round" />
      {last7.map((r, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(r.systolic)} r="3.5" fill={C.sky} />
          {r.exercised && <text x={px(i)} y={py(r.systolic) - 8} textAnchor="middle" fontSize="9">🏃</text>}
        </g>
      ))}
    </svg>
  );
}

function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleDigit(d) {
    if (pin.length >= 4) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(false);
    if (newPin.length === 4) {
      setTimeout(() => {
        if (newPin === CORRECT_PIN) {
          onUnlock();
        } else {
          setShake(true); setError(true);
          setTimeout(() => { setPin(""); setShake(false); }, 600);
        }
      }, 100);
    }
  }

  function handleDelete() { setPin(p => p.slice(0, -1)); setError(false); }
  const rows = [[1,2,3],[4,5,6],[7,8,9],["",0,"⌫"]];

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: C.brown, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 44, marginBottom: 8 }}>💓</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.cream, marginBottom: 4, letterSpacing: "-0.5px" }}>Pressure Log</div>
      <div style={{ fontSize: 14, color: "rgba(250,227,177,0.6)", marginBottom: 40, fontFamily: "'Inter', sans-serif" }}>Enter your PIN to continue</div>

      <div style={{ display: "flex", gap: 16, marginBottom: 40, animation: shake ? "shake 0.5s ease" : "none" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: error ? C.orange : i < pin.length ? C.sky : "transparent",
            border: `2px solid ${error ? C.orange : i < pin.length ? C.sky : "rgba(95,168,194,0.4)"}`,
            transition: "all 0.15s"
          }} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12 }}>
        {rows.flat().map((d, i) => (
          <button key={i}
            onClick={() => d === "⌫" ? handleDelete() : d !== "" ? handleDigit(String(d)) : null}
            style={{
              width: 72, height: 72, borderRadius: "50%", border: "none",
              background: d === "" ? "transparent" : "rgba(95,168,194,0.15)",
              color: C.cream, fontSize: d === "⌫" ? 20 : 24,
              fontFamily: "'Poppins', sans-serif", fontWeight: 500,
              cursor: d === "" ? "default" : "pointer",
              transition: "background 0.15s",
            }}
          >{d}</button>
        ))}
      </div>

      {error && <div style={{ marginTop: 24, color: C.skyMid, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Incorrect PIN, try again</div>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@400;500&display=swap');
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
      `}</style>
    </div>
  );
}

export default function BPTracker() {
  const [unlocked, setUnlocked] = useState(false);
  const [readings, setReadings] = useState([]);
  const [view, setView] = useState("dashboard");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [exercised, setExercised] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef();
  const galleryRef = useRef();

  useEffect(() => { if (unlocked) fetchReadings(); }, [unlocked]);

  async function fetchReadings() {
    setLoading(true);
    const { data, error } = await supabase.from("readings").select("*").order("created_at", { ascending: false });
    if (!error) setReadings(data || []);
    setLoading(false);
  }

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null); setExtracted(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setPreview(ev.target.result);
      setUploading(true);
      try {
        const res = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: file.type || "image/jpeg", data: base64 } },
              { text: 'This is a blood pressure monitor. Extract the readings. Respond ONLY with JSON: {"systolic":120,"diastolic":80,"pulse":72} — omit pulse if not visible. If unreadable: {"error":"Could not read"}. No other text, no markdown.' }
            ]}]
          })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        if (parsed.error) throw new Error(parsed.error);
        setExtracted(parsed);
      } catch {
        setError("Couldn't read the monitor automatically — please fill in manually.");
        setExtracted({ systolic: "", diastolic: "", pulse: "" });
      } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!extracted?.systolic || !extracted?.diastolic) return;
    setSaving(true);
    const { error } = await supabase.from("readings").insert({
      systolic: Number(extracted.systolic),
      diastolic: Number(extracted.diastolic),
      pulse: extracted.pulse ? Number(extracted.pulse) : null,
      note: note.trim() || null,
      exercised,
    });
    if (error) {
      setError("Failed to save. Please try again.");
    } else {
      await fetchReadings();
      setView("dashboard");
      setPreview(null); setExtracted(null); setNote(""); setError(null); setExercised(false);
    }
    setSaving(false);
  }

  function getTrend() {
    if (readings.length < 2) return "stable";
    const d = readings[0].systolic - readings[1].systolic;
    return d > 3 ? "up" : d < -3 ? "down" : "stable";
  }

  const latest = readings[0];
  const latestClass = latest ? classifyBP(latest.systolic, latest.diastolic) : null;
  const trend = getTrend();

  const s = {
    app: { fontFamily: "'Inter', sans-serif", background: C.offwhite, minHeight: "100vh", maxWidth: 430, margin: "0 auto", paddingBottom: 90 },
    header: { background: C.brown, color: C.cream, padding: "22px 24px 18px" },
    card: { background: "#fff", borderRadius: 16, padding: 20, margin: "14px 14px 0", boxShadow: "0 1px 6px rgba(103,60,52,0.08)" },
    label: { fontSize: 11, color: "#a08070", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4, fontFamily: "'Inter', sans-serif" },
    badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif" }),
    input: { width: "100%", border: `1.5px solid ${C.cream}`, borderRadius: 10, padding: "10px 14px", fontSize: 15, fontFamily: "'Inter', sans-serif", background: "#fff", outline: "none", boxSizing: "border-box", color: C.brown },
    btn: (bg, color = C.cream) => ({ width: "100%", background: bg, color, border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "'Poppins', sans-serif", fontWeight: 600, cursor: "pointer", marginTop: 12 }),
    fab: { position: "fixed", bottom: 90, right: 20, background: C.sky, color: "#fff", border: "none", borderRadius: "50%", width: 58, height: 58, fontSize: 28, cursor: "pointer", boxShadow: `0 4px 16px rgba(95,168,194,0.5)`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: `1px solid ${C.cream}`, display: "flex", zIndex: 99 },
    navBtn: (a) => ({ flex: 1, padding: "12px 0 10px", border: "none", background: "none", cursor: "pointer", fontSize: 11, fontFamily: "'Poppins', sans-serif", color: a ? C.sky : "#b09080", fontWeight: a ? 700 : 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }),
  };

  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: ${C.sky} !important; box-shadow: 0 0 0 3px rgba(95,168,194,0.15); }
      `}</style>

      {/* HEADER */}
      <div style={s.header}>
        <div style={{ fontSize: 12, color: C.skyMid, marginBottom: 2, fontFamily: "'Inter', sans-serif", letterSpacing: 0.5 }}>Good day</div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", fontFamily: "'Poppins', sans-serif" }}>Hello, Kamlesh</div>
        <div style={{ fontSize: 12, color: "rgba(250,227,177,0.6)", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>{readings.length} reading{readings.length !== 1 ? "s" : ""} recorded</div>
      </div>

      {/* Daily message */}
      <div style={{ margin: "14px 14px 0", background: `linear-gradient(135deg, ${C.teal}, ${C.sky})`, borderRadius: 16, padding: "18px 20px" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>Today's message</div>
        <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.7, fontStyle: "italic", fontFamily: "'Inter', sans-serif" }}>{getDailyMessage()}</div>
      </div>

      {/* DASHBOARD */}
      {view === "dashboard" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#b09080" }}>Loading…</div>
          ) : latest ? (
            <>
              <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={s.label}>Latest reading</div>
                  {latest.exercised && <span style={s.badge(C.greenLight, C.green)}>🏃 Exercised</span>}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, margin: "8px 0" }}>
                  <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1, color: C.brown, fontFamily: "'Poppins', sans-serif" }}>{latest.systolic}</span>
                  <span style={{ fontSize: 42, color: C.skyMid, lineHeight: 1.2, fontFamily: "'Poppins', sans-serif" }}>/</span>
                  <span style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, color: C.brownLight, fontFamily: "'Poppins', sans-serif" }}>{latest.diastolic}</span>
                  <span style={{ fontSize: 13, color: "#b09080", marginBottom: 8, marginLeft: 4 }}>mmHg</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={s.badge(latestClass.bg, latestClass.color)}>{latestClass.label}</div>
                  <div style={s.badge(C.skyLight, C.sky)}>
                    {trend === "up" ? "↑ Rising" : trend === "down" ? "↓ Falling" : "→ Stable"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  {latest.pulse && (
                    <div style={{ flex: 1, background: C.offwhite, borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                      <div style={s.label}>Pulse</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.brown, fontFamily: "'Poppins', sans-serif" }}>{latest.pulse}</div>
                      <div style={{ fontSize: 11, color: "#b09080" }}>bpm</div>
                    </div>
                  )}
                  <div style={{ flex: 1, background: C.skyLight, borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ ...s.label, color: C.sky }}>Date</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.brown, fontFamily: "'Poppins', sans-serif" }}>{new Date(latest.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                    <div style={{ fontSize: 11, color: "#b09080" }}>{new Date(latest.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  {latest.note && (
                    <div style={{ flex: 2, background: C.offwhite, borderRadius: 12, padding: "10px 14px" }}>
                      <div style={s.label}>Note</div>
                      <div style={{ fontSize: 12, color: "#6b5050", marginTop: 4, fontStyle: "italic" }}>{latest.note}</div>
                    </div>
                  )}
                </div>
              </div>

              {readings.length >= 2 && (
                <div style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={s.label}>Last 7 readings</div>
                    <div style={{ fontSize: 11, color: "#b09080" }}>
                      <span style={{ color: C.sky }}>— Sys</span>{"  "}
                      <span style={{ color: C.teal }}>-- Dia</span>{"  "}
                      <span>🏃 Exercise</span>
                    </div>
                  </div>
                  <MiniChart readings={[...readings].reverse()} />
                </div>
              )}

              <div style={s.card}>
                <div style={s.label}>BP reference</div>
                {[
                  ["Normal",       "< 120/80",         C.green,  C.greenLight],
                  ["Elevated",     "120–129 / < 80",   C.olive,  "#fdf3d0"],
                  ["High Stage 1", "130–139 / 80–89",  C.orange, "#fde8dc"],
                  ["High Stage 2", "≥ 140 / ≥ 90",     C.red,    "#f5d0d2"],
                ].map(([label, range, color, bg]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.offwhite}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 13, color: C.brown }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#b09080" }}>{range}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ ...s.card, textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💓</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.brown, fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>No readings yet</div>
              <div style={{ fontSize: 14, color: "#b09080" }}>Tap + to log your first reading</div>
            </div>
          )}
        </>
      )}

      {/* ADD */}
      {view === "add" && (
        <div style={{ padding: "16px 14px 0" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.brown, fontFamily: "'Poppins', sans-serif", marginBottom: 16 }}>New Reading</div>

          {!preview ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div onClick={() => cameraRef.current.click()} style={{ border: `2px dashed ${C.skyMid}`, borderRadius: 16, padding: "24px 20px", textAlign: "center", cursor: "pointer", background: C.skyLight }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>📸</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.brown, marginBottom: 2, fontFamily: "'Poppins', sans-serif" }}>Take a photo now</div>
                <div style={{ fontSize: 13, color: "#b09080" }}>Open camera and capture your monitor</div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
              </div>
              <div onClick={() => galleryRef.current.click()} style={{ border: `2px dashed ${C.cream}`, borderRadius: 16, padding: "24px 20px", textAlign: "center", cursor: "pointer", background: "#fff" }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🖼️</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.brown, marginBottom: 2, fontFamily: "'Poppins', sans-serif" }}>Upload from gallery</div>
                <div style={{ fontSize: 13, color: "#b09080" }}>Pick a photo you already took</div>
                <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <img src={preview} alt="monitor" style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }} />
              {uploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(95,168,194,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                  <div style={{ width: 32, height: 32, border: `3px solid rgba(255,255,255,0.4)`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ color: "#fff", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Reading monitor…</div>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ background: "#fde8dc", border: `1px solid ${C.orange}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.orange, marginTop: 12 }}>{error}</div>}

          {extracted && (
            <div style={s.card}>
              <div style={s.label}>Confirm values</div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                {[["Systolic", "systolic", "e.g. 120"], ["Diastolic", "diastolic", "e.g. 80"], ["Pulse", "pulse", "bpm"]].map(([lbl, key, ph]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#a08070", marginBottom: 4 }}>{lbl}</div>
                    <input style={s.input} type="number" value={extracted[key] || ""} placeholder={ph} onChange={e => setExtracted({ ...extracted, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
              {extracted.systolic && extracted.diastolic && (() => {
                const c = classifyBP(+extracted.systolic, +extracted.diastolic);
                return <div style={{ marginTop: 10 }}><span style={s.badge(c.bg, c.color)}>{c.label}</span></div>;
              })()}

              <div onClick={() => setExercised(!exercised)} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "14px 16px", background: exercised ? C.greenLight : C.offwhite, borderRadius: 12, cursor: "pointer", border: `2px solid ${exercised ? C.green : C.cream}`, transition: "all 0.2s" }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: exercised ? C.green : "#fff", border: `2px solid ${exercised ? C.green : C.cream}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                  {exercised && <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.brown, fontFamily: "'Poppins', sans-serif" }}>🏃 I exercised today</div>
                  <div style={{ fontSize: 12, color: "#b09080" }}>Helps track how exercise affects your BP</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#a08070", marginBottom: 4 }}>Note (optional)</div>
                <input style={s.input} type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. after walk, felt dizzy…" maxLength={80} />
              </div>
              <button style={s.btn(C.sky)} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Reading"}
              </button>
            </div>
          )}

          {!extracted && !uploading && (
            <button style={s.btn(C.offwhite, C.brown)} onClick={() => setExtracted({ systolic: "", diastolic: "", pulse: "" })}>
              Enter manually instead
            </button>
          )}
          <button style={s.btn(C.offwhite, C.brown)} onClick={() => { setView("dashboard"); setPreview(null); setExtracted(null); setNote(""); setError(null); setExercised(false); }}>
            Cancel
          </button>
        </div>
      )}

      {/* HISTORY */}
      {view === "history" && (
        <div style={{ padding: "16px 14px 0" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.brown, fontFamily: "'Poppins', sans-serif", marginBottom: 4 }}>History</div>
          <div style={{ fontSize: 13, color: "#b09080", marginBottom: 16 }}>{readings.length} reading{readings.length !== 1 ? "s" : ""}</div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#b09080" }}>Loading…</div>
          ) : readings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#b09080" }}>No readings yet</div>
          ) : readings.map(r => {
            const c = classifyBP(r.systolic, r.diastolic);
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.offwhite}` }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.brown, fontFamily: "'Poppins', sans-serif" }}>
                      {r.systolic}<span style={{ color: C.skyMid }}>/</span>{r.diastolic}
                      <span style={{ fontSize: 12, color: "#b09080", fontWeight: 400 }}> mmHg</span>
                    </div>
                    {r.exercised && <span title="Exercised today">🏃</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#b09080", marginTop: 2 }}>
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {r.note && <div style={{ fontSize: 12, color: "#8a6055", fontStyle: "italic", marginTop: 2 }}>{r.note}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={s.badge(c.bg, c.color)}>{c.label}</span>
                  {r.pulse && <div style={{ fontSize: 12, color: "#b09080", marginTop: 4 }}>♥ {r.pulse} bpm</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view !== "add" && <button style={s.fab} onClick={() => setView("add")}>+</button>}

      <nav style={s.nav}>
        {[["dashboard", "🗓️", "Today"], ["history", "📋", "History"]].map(([id, icon, lbl]) => (
          <button key={id} style={s.navBtn(view === id)} onClick={() => setView(id)}>
            <span style={{ fontSize: 18 }}>{icon}</span>{lbl}
          </button>
        ))}
      </nav>
    </div>
  );
}
