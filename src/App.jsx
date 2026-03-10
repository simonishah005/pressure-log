import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const GEMINI_KEY = "AIzaSyAry2OaFgiN-PH7cGNewjkFgZfNaEoCdgA";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

function classifyBP(sys, dia) {
  if (sys < 120 && dia < 80) return { label: "Normal", color: "#22c55e", bg: "#f0fdf4" };
  if (sys < 130 && dia < 80) return { label: "Elevated", color: "#f59e0b", bg: "#fffbeb" };
  if (sys < 140 || dia < 90) return { label: "High Stage 1", color: "#f97316", bg: "#fff7ed" };
  return { label: "High Stage 2", color: "#ef4444", bg: "#fef2f2" };
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
      <polyline points={spts} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={dpts} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4,3" strokeLinecap="round" strokeLinejoin="round" />
      {last7.map((r, i) => <circle key={i} cx={px(i)} cy={py(r.systolic)} r="3.5" fill="#e11d48" />)}
    </svg>
  );
}

export default function BPTracker() {
  const [readings, setReadings] = useState([]);
  const [view, setView] = useState("dashboard");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    fetchReadings();
  }, []);

  async function fetchReadings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("readings")
      .select("*")
      .order("created_at", { ascending: false });
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
            contents: [{
              parts: [
                { inline_data: { mime_type: file.type || "image/jpeg", data: base64 } },
                { text: 'This is a blood pressure monitor. Extract the readings. Respond ONLY with JSON: {"systolic":120,"diastolic":80,"pulse":72} — omit pulse if not visible. If unreadable: {"error":"Could not read"}. No other text, no markdown.' }
              ]
            }]
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
      } finally {
        setUploading(false);
      }
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
    });
    if (error) {
      setError("Failed to save. Check your Supabase table exists.");
    } else {
      await fetchReadings();
      setView("dashboard");
      setPreview(null); setExtracted(null); setNote(""); setError(null);
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
    app: { fontFamily: "Georgia, serif", background: "#faf7f4", minHeight: "100vh", maxWidth: 430, margin: "0 auto", paddingBottom: 90 },
    header: { background: "#1a0a0a", color: "#faf7f4", padding: "20px 24px 16px" },
    card: { background: "#fff", borderRadius: 16, padding: 20, margin: "14px 14px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    label: { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
    badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color, borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600 }),
    input: { width: "100%", border: "1.5px solid #e5e0da", borderRadius: 10, padding: "10px 14px", fontSize: 16, fontFamily: "Georgia,serif", background: "#fff", outline: "none", boxSizing: "border-box" },
    btn: (bg, color = "#fff") => ({ width: "100%", background: bg, color, border: "none", borderRadius: 12, padding: 14, fontSize: 16, fontFamily: "Georgia,serif", fontWeight: "bold", cursor: "pointer", marginTop: 12 }),
    fab: { position: "fixed", bottom: 90, right: 20, background: "#e11d48", color: "#fff", border: "none", borderRadius: "50%", width: 56, height: 56, fontSize: 28, cursor: "pointer", boxShadow: "0 4px 16px rgba(225,29,72,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #f0ece8", display: "flex", zIndex: 99 },
    navBtn: (a) => ({ flex: 1, padding: "12px 0 10px", border: "none", background: "none", cursor: "pointer", fontSize: 11, fontFamily: "Georgia,serif", color: a ? "#e11d48" : "#9ca3af", fontWeight: a ? 700 : 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }),
  };

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ fontSize: 20, fontWeight: "bold", letterSpacing: "-0.5px" }}>💓 Pressure Log</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{readings.length} reading{readings.length !== 1 ? "s" : ""} recorded</div>
      </div>

      {/* DASHBOARD */}
      {view === "dashboard" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>Loading…</div>
          ) : latest ? (
            <>
              <div style={s.card}>
                <div style={s.label}>Latest reading</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, margin: "8px 0" }}>
                  <span style={{ fontSize: 56, fontWeight: "bold", lineHeight: 1, color: "#1a0a0a" }}>{latest.systolic}</span>
                  <span style={{ fontSize: 40, color: "#d1d5db", lineHeight: 1.2 }}>/</span>
                  <span style={{ fontSize: 40, fontWeight: "bold", lineHeight: 1, color: "#6b7280" }}>{latest.diastolic}</span>
                  <span style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6, marginLeft: 4 }}>mmHg</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={s.badge(latestClass.bg, latestClass.color)}>{latestClass.label}</div>
                  <div style={s.badge("#f0ece8", "#9ca3af")}>
                    {trend === "up" ? "↑ Rising" : trend === "down" ? "↓ Falling" : "→ Stable"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  {latest.pulse && (
                    <div style={{ flex: 1, background: "#faf7f4", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                      <div style={s.label}>Pulse</div>
                      <div style={{ fontSize: 22, fontWeight: "bold" }}>{latest.pulse}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>bpm</div>
                    </div>
                  )}
                  <div style={{ flex: 1, background: "#faf7f4", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                    <div style={s.label}>Date</div>
                    <div style={{ fontSize: 14, fontWeight: "bold" }}>{new Date(latest.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(latest.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  {latest.note && (
                    <div style={{ flex: 2, background: "#faf7f4", borderRadius: 12, padding: "10px 14px" }}>
                      <div style={s.label}>Note</div>
                      <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4, fontStyle: "italic" }}>{latest.note}</div>
                    </div>
                  )}
                </div>
              </div>

              {readings.length >= 2 && (
                <div style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={s.label}>Last 7 readings</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      <span style={{ color: "#e11d48" }}>— Sys</span>{"  "}
                      <span style={{ color: "#6366f1" }}>-- Dia</span>
                    </div>
                  </div>
                  <MiniChart readings={[...readings].reverse()} />
                </div>
              )}

              <div style={s.card}>
                <div style={s.label}>BP reference</div>
                {[
                  ["Normal", "< 120/80", "#22c55e"],
                  ["Elevated", "120–129 / < 80", "#f59e0b"],
                  ["High Stage 1", "130–139 / 80–89", "#f97316"],
                  ["High Stage 2", "≥ 140 / ≥ 90", "#ef4444"],
                ].map(([label, range, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8f6f3" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 13 }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{range}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ ...s.card, textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💓</div>
              <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>No readings yet</div>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>Tap + to log your first reading</div>
            </div>
          )}
        </>
      )}

      {/* ADD */}
      {view === "add" && (
        <div style={{ padding: "16px 14px 0" }}>
          <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>New Reading</div>

          {!preview ? (
            <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #e5e0da", borderRadius: 16, padding: "36px 20px", textAlign: "center", cursor: "pointer", background: "#faf7f4" }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>📸</div>
              <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 4 }}>Photo of your monitor</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>AI reads the numbers automatically</div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
            </div>
          ) : (
            <div style={{ borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <img src={preview} alt="monitor" style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }} />
              {uploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                  <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ color: "#fff", fontSize: 13 }}>Reading monitor…</div>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ef4444", marginTop: 12 }}>{error}</div>}

          {extracted && (
            <div style={s.card}>
              <div style={s.label}>Confirm values</div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                {[["Systolic", "systolic", "e.g. 120"], ["Diastolic", "diastolic", "e.g. 80"], ["Pulse", "pulse", "bpm"]].map(([lbl, key, ph]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{lbl}</div>
                    <input style={s.input} type="number" value={extracted[key] || ""} placeholder={ph} onChange={e => setExtracted({ ...extracted, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
              {extracted.systolic && extracted.diastolic && (() => {
                const c = classifyBP(+extracted.systolic, +extracted.diastolic);
                return <div style={{ marginTop: 10 }}><span style={s.badge(c.bg, c.color)}>{c.label}</span></div>;
              })()}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Note (optional)</div>
                <input style={s.input} type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. after walk, felt dizzy…" maxLength={80} />
              </div>
              <button style={s.btn("#e11d48")} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Reading"}
              </button>
            </div>
          )}

          {!extracted && !uploading && (
            <button style={s.btn("#f0ece8", "#6b7280")} onClick={() => setExtracted({ systolic: "", diastolic: "", pulse: "" })}>
              Enter manually instead
            </button>
          )}

          <button style={s.btn("#f0ece8", "#6b7280")} onClick={() => { setView("dashboard"); setPreview(null); setExtracted(null); setNote(""); setError(null); }}>
            Cancel
          </button>
        </div>
      )}

      {/* HISTORY */}
      {view === "history" && (
        <div style={{ padding: "16px 14px 0" }}>
          <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 4 }}>History</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>{readings.length} reading{readings.length !== 1 ? "s" : ""}</div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>Loading…</div>
          ) : readings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>No readings yet</div>
          ) : readings.map(r => {
            const c = classifyBP(r.systolic, r.diastolic);
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f0ece8" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: "bold" }}>{r.systolic}<span style={{ color: "#d1d5db" }}>/</span>{r.diastolic} <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: "normal" }}>mmHg</span></div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {r.note && <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", marginTop: 2 }}>{r.note}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={s.badge(c.bg, c.color)}>{c.label}</span>
                  {r.pulse && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>♥ {r.pulse} bpm</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view !== "add" && <button style={s.fab} onClick={() => setView("add")}>+</button>}

      <nav style={s.nav}>
        {[["dashboard", "💓", "Today"], ["history", "📋", "History"]].map(([id, icon, lbl]) => (
          <button key={id} style={s.navBtn(view === id)} onClick={() => setView(id)}>
            <span style={{ fontSize: 18 }}>{icon}</span>{lbl}
          </button>
        ))}
      </nav>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
