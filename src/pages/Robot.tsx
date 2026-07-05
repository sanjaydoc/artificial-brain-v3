import { useState, useEffect, useRef, useCallback } from 'react'
import { useBrain } from '@/context/BrainContext'
import { useAuth } from '@/context/AuthContext'

const JOINTS = [
  'L Hip pitch', 'L Knee', 'L Ankle',
  'R Hip pitch', 'R Knee', 'R Ankle',
  'Torso yaw',
]

const EMOTIONS = [
  { id: 'anger', label: 'Anger', emoji: '\u{1F620}' },
  { id: 'contempt', label: 'Contempt', emoji: '\u{1F612}' },
  { id: 'disgust', label: 'Disgust', emoji: '\u{1F922}' },
  { id: 'happiness', label: 'Happy', emoji: '\u{1F60A}' },
  { id: 'fear', label: 'Fear', emoji: '\u{1F47B}' },
  { id: 'sadness', label: 'Sadness', emoji: '\u{1F622}' },
  { id: 'surprise', label: 'Surprise', emoji: '\u{1F3CE}' },
]

const QUICK_CMDS = ['sit', 'walk', 'jump', 'wave', 'stand', 'turn L', 'turn R', 'observe']

const _EMOTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  excited:  { bg: '#fbbf2418', border: '#fbbf2440', text: '#fbbf24' },
  calm:     { bg: '#60a5fa18', border: '#60a5fa40', text: '#60a5fa' },
  alert:    { bg: '#f9731618', border: '#f9731640', text: '#f97316' },
  fearful:  { bg: '#a78bfa18', border: '#a78bfa40', text: '#a78bfa' },
  sad:      { bg: '#60a5fa18', border: '#60a5fa40', text: '#60a5fa' },
  neutral:  { bg: '#94a3b818', border: '#94a3b840', text: '#94a3b8' },
  subdued:  { bg: '#64748b18', border: '#64748b40', text: '#64748b' },
  angry:    { bg: '#ef444418', border: '#ef444440', text: '#ef4444' },
}

const _EMOTION_EMOJI: Record<string, string> = {
  excited: '\u{1F929}', calm: '\u{1F60C}', alert: '\u{1F440}', fearful: '\u{1F628}',
  sad: '\u{1F622}', neutral: '\u{1F610}', subdued: '\u{1F614}', angry: '\u{1F621}',
}

interface ThoughtEntry {
  src: string
  msg: string
  ts: number
}

export default function Robot() {
  const { connected } = useBrain()
  const { isAdmin } = useAuth()
  const [camError, setCamError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [light, setLight] = useState(1.0)
  const [simStep, setSimStep] = useState(0)
  const [jointPos, setJointPos] = useState<number[]>([])
  const [fallen, setFallen] = useState(false)
  const [reward, setReward] = useState(0)
  const [height, setHeight] = useState(0)
  const [fwdVel, setFwdVel] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const refreshTimer = useRef<ReturnType<typeof setInterval>>()

  // Emotion state
  const [activeEmo, setActiveEmo] = useState<string | null>(null)
  const [emoFeedback, setEmoFeedback] = useState('')
  const [valence, setValence] = useState(0)
  const [arousal, setArousal] = useState(0.5)
  const [emotionLabel, setEmotionLabel] = useState('calm')
  const emoTimer = useRef<ReturnType<typeof setTimeout>>()

  // Brain thoughts terminal
  const [thoughts, setThoughts] = useState<ThoughtEntry[]>([])
  const [prefrontalGoal, setPrefrontalGoal] = useState('')
  const [brocaUtterance, setBrocaUtterance] = useState('')
  const [visionDesc, setVisionDesc] = useState('')
  const [visionMeta, setVisionMeta] = useState('')
  const lastValRef = useRef(0)
  const lastAroRef = useRef(0.5)
  const lastEmoRef = useRef('')
  const thoughtsEndRef = useRef<HTMLDivElement>(null)

  // Robot command
  const [robotCmd, setRobotCmd] = useState('')
  const [robotFeedback, setRobotFeedback] = useState('')

  // Camera refresh
  const refreshCamera = useCallback(() => {
    if (imgRef.current) {
      imgRef.current.src = `/api/sim/camera?t=${Date.now()}&light=${light}`
    }
  }, [light])

  useEffect(() => {
    refreshCamera()
    refreshTimer.current = setInterval(refreshCamera, 1500)
    return () => clearInterval(refreshTimer.current)
  }, [refreshCamera])

  // Poll sim state
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/sim/state')
        const d = await r.json()
        if (typeof d.reward === 'number') setReward(d.reward)
        if (typeof d.step === 'number') setSimStep(d.step)
        if (d.base_pos && Array.isArray(d.base_pos)) setHeight(d.base_pos[2] ?? 0)
        if (d.base_vel && Array.isArray(d.base_vel)) setFwdVel(d.base_vel[0] ?? 0)
        if (typeof d.fallen === 'boolean') setFallen(d.fallen)
        if (d.joint_pos && Array.isArray(d.joint_pos)) setJointPos(d.joint_pos)
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [])

  // Poll emotion state + brain thoughts
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/brain/state')
        const d = await r.json()
        const amy = d.amygdala || {}
        const pf = d.prefrontal || {}
        const br = d.broca || {}
        const vis = d.visualCortex || {}

        const newVal = amy.valence ?? 0
        const newAro = amy.arousal ?? 0.5
        const newEmo = amy.emotion || 'neutral'

        setValence(newVal)
        setArousal(newAro)
        setEmotionLabel(newEmo)

        // Emit thoughts on state changes
        const now = Date.now()
        if (newEmo !== lastEmoRef.current && newEmo) {
          addThought('amygdala', `emotion shifted to ${newEmo} (v=${newVal.toFixed(2)}, a=${newAro.toFixed(2)})`, now)
          lastEmoRef.current = newEmo
        }
        if (Math.abs(newVal - lastValRef.current) > 0.15) {
          lastValRef.current = newVal
        }
        if (Math.abs(newAro - lastAroRef.current) > 0.15) {
          lastAroRef.current = newAro
        }

        if (pf.current_goal && pf.current_goal !== prefrontalGoal) {
          setPrefrontalGoal(pf.current_goal)
          addThought('prefrontal', `goal: ${pf.current_goal}`, now)
          if (pf.conflict) addThought('conflict', pf.conflict, now)
        }

        if (br.last_utterance && br.last_utterance !== brocaUtterance) {
          setBrocaUtterance(br.last_utterance)
          addThought('broca', br.last_utterance, now)
        }

        if (vis.scene_description && vis.scene_description !== visionDesc) {
          setVisionDesc(vis.scene_description)
          addThought('vision', vis.scene_description, now)
        }
        if (vis.brightness !== undefined) {
          setVisionMeta(`brightness: ${vis.brightness}  edge: ${vis.edge_density}  frames: ${vis.frame_count}`)
        }
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addThought = (src: string, msg: string, ts: number) => {
    setThoughts((prev) => [...prev.slice(-39), { src, msg, ts }])
  }

  // Auto-scroll thoughts (only within the thoughts container, not the page)
  useEffect(() => {
    const el = thoughtsEndRef.current
    if (el) {
      const container = el.parentElement
      if (container) container.scrollTop = container.scrollHeight
    }
  }, [thoughts])

  const triggerEmotion = async (emo: string) => {
    if (activeEmo === emo) {
      setActiveEmo(null)
      setEmoFeedback('Scene cleared.')
      return
    }
    setActiveEmo(emo)
    setEmoFeedback(`Injecting ${emo} scene...`)
    try {
      const r = await fetch('/api/sim/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion: emo }),
      })
      const d = await r.json()
      if (d.ok) {
        const rwd = d.results?.reward?.value
        setEmoFeedback(`${emo} scene active${rwd !== undefined ? ` (reward: ${rwd})` : ''}`)
      } else {
        setEmoFeedback(`Failed: ${d.error || 'unknown'}`)
        setActiveEmo(null)
      }
    } catch (e) {
      setEmoFeedback(`Error: ${e}`)
      setActiveEmo(null)
    }
    if (emoTimer.current) clearTimeout(emoTimer.current)
    emoTimer.current = setTimeout(() => {
      setActiveEmo(null)
      setEmoFeedback('')
    }, 30000)
  }

  const sendRobotCmd = async (cmd: string) => {
    setRobotFeedback(`Executing: ${cmd}...`)
    try {
      // Send to brain
      await fetch('/api/chat/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cmd }),
      })
      setRobotFeedback(`Sent: ${cmd}`)
    } catch (e) {
      setRobotFeedback(`Error: ${e}`)
    }
    setTimeout(() => setRobotFeedback(''), 4000)
  }


  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const emoColor = _EMOTION_COLORS[emotionLabel] || _EMOTION_COLORS.neutral
  const emoEmoji = _EMOTION_EMOJI[emotionLabel] || '\u{1F610}'

  const rewardColor = reward > 1 ? '#16a34a' : reward > 0 ? '#0284c7' : '#ef4444'

  return (
    <div>
      <h1 className="text-lg font-kanit font-semibold tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
        Unitree G1 — Robot Body (MuJoCo Live)
        <span className="ml-3 text-[0.65rem] font-mono text-primary bg-primary/5 border border-primary/15 rounded px-2 py-0.5">
          SmolVLA {'\u00b7'} 7-DoF
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Camera feed */}
        <div className="space-y-3">
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {/* Camera header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="text-xs font-mono text-muted-foreground">Simulator Canvas</span>
              <span className="text-xs text-muted-foreground">{'\u00b7'} G1 Front Camera</span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} className="w-6 h-6 rounded bg-muted hover:bg-accent text-muted-foreground text-sm">{'\u2212'}</button>
                <span className="text-[0.6rem] font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))} className="w-6 h-6 rounded bg-muted hover:bg-accent text-muted-foreground text-sm">+</button>
                <button onClick={() => setZoom(1)} className="w-6 h-6 rounded bg-muted hover:bg-accent text-muted-foreground text-sm ml-1">{'\u229E'}</button>
              </div>
            </div>

            {/* Camera body */}
            <div className="relative bg-muted aspect-video overflow-hidden flex items-center justify-center">
              {camError ? (
                <div className="text-muted-foreground text-sm font-mono">Camera offline</div>
              ) : (
                <img
                  ref={imgRef}
                  alt="G1 camera"
                  className="max-w-full max-h-full object-contain transition-transform"
                  style={{ transform: `scale(${zoom})` }}
                  onError={() => setCamError(true)}
                  onLoad={() => setCamError(false)}
                />
              )}
              <div className="absolute bottom-2 left-3 text-[0.6rem] font-mono text-primary/70 bg-muted/80 px-2 py-0.5 rounded">
                step {simStep.toLocaleString()}
              </div>
              {fallen && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-sm">
                  <div className="text-red-500 font-kanit font-bold text-lg text-center">
                    {'\u26A0'} G1 FALLEN<br />RESETTING{'\u2026'}
                  </div>
                </div>
              )}
            </div>

            {/* Lighting controls */}
            <div className="flex items-center gap-2 px-4 py-2 border-t border-border">
              <span className="text-sm">{'\u{1F311}'}</span>
              <span className="text-[0.6rem] text-muted-foreground">Lighting</span>
              <button onClick={() => setLight((l) => Math.max(0.1, +(l - 0.15).toFixed(2)))} className="w-5 h-5 rounded bg-muted hover:bg-accent text-muted-foreground text-xs">{'\u2212'}</button>
              <input type="range" min="0.1" max="3.0" step="0.05" value={light} onChange={(e) => setLight(+e.target.value)} className="flex-1 h-1 accent-primary" />
              <button onClick={() => setLight((l) => Math.min(3, +(l + 0.15).toFixed(2)))} className="w-5 h-5 rounded bg-muted hover:bg-accent text-muted-foreground text-xs">+</button>
              <span className="text-[0.6rem] font-mono text-muted-foreground w-8">{light.toFixed(1)}{'\u00d7'}</span>
              <span className="text-sm">{'\u2600\ufe0f'}</span>
            </div>
          </div>

          {/* Vision panel */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[0.68rem] font-kanit font-bold text-sky-600 uppercase tracking-widest bg-sky-400/10 border border-sky-400/20 rounded px-2.5 py-0.5">
                Visual Cortex
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            </div>
            <div className="text-xs text-foreground mb-1">{visionDesc || 'Waiting for visual input...'}</div>
            <div className="text-[0.6rem] font-mono text-muted-foreground">{visionMeta}</div>
          </div>

          {/* Robot commands */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[0.68rem] font-kanit font-bold text-primary uppercase tracking-widest">Robot Command</span>
              <span className="text-[0.6rem] font-mono text-muted-foreground">send goal to motor cortex</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_CMDS.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => sendRobotCmd(cmd)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground text-[0.65rem] font-kanit hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
                >
                  {cmd}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={robotCmd}
                onChange={(e) => setRobotCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && robotCmd.trim()) { sendRobotCmd(robotCmd.trim()); setRobotCmd('') } }}
                placeholder="Custom command..."
                className="flex-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
              <button
                onClick={() => { if (robotCmd.trim()) { sendRobotCmd(robotCmd.trim()); setRobotCmd('') } }}
                className="px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
              >
                Send
              </button>
            </div>
            {robotFeedback && <div className="mt-2 text-[0.6rem] font-mono text-muted-foreground">{robotFeedback}</div>}
            {isAdmin && (
              <div className="mt-3 pt-3 border-t border-border">
                <button
                  disabled
                  className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-destructive/10 border border-destructive/20 text-destructive opacity-50 cursor-not-allowed transition-colors"
                >
                  {'\u{1F5D1}'} Format Brain
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: stats + thoughts + joints + emotions */}
        <div className="flex flex-col gap-3">
          {/* Sim stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Reward', value: reward.toFixed(2), color: rewardColor },
              { label: 'Sim Step', value: simStep.toLocaleString(), color: '#16a34a' },
              { label: 'Height m', value: height.toFixed(3), color: '#0284c7' },
              { label: 'Fwd vel', value: fwdVel.toFixed(3), color: '#d97706' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-card border border-border px-3 py-2.5 text-center">
                <div className="text-base font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Emotion scene buttons */}
          <div className="rounded-xl bg-primary/[.04] border border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[0.68rem] font-kanit font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 rounded px-2.5 py-0.5">
                Emotion Scene
              </span>
              <span className="text-[0.6rem] font-mono text-muted-foreground">inject scene into sim {'\u00b7'} robot observes</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {EMOTIONS.map((emo) => (
                <button
                  key={emo.id}
                  onClick={() => triggerEmotion(emo.id)}
                  className={`py-1.5 px-1 border rounded-lg text-[0.65rem] font-kanit font-bold transition-all ${
                    activeEmo === emo.id
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-border text-foreground hover:border-border hover:bg-accent'
                  }`}
                >
                  {emo.emoji} {emo.label}
                </button>
              ))}
            </div>
            {emoFeedback && <div className="mt-2 text-[0.6rem] font-mono text-primary/70">{emoFeedback}</div>}
          </div>

          {/* Brain Thoughts Terminal */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
              <span className="text-[0.65rem] font-kanit font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 rounded px-2 py-0.5">
                Brain Thoughts
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>

            {/* Emotion gauges */}
            <div className="px-4 py-3 space-y-2">
              {/* Valence */}
              <div className="flex items-center gap-2">
                <span className="text-[0.6rem] text-muted-foreground w-14">Valence</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${((valence + 1) / 2 * 100).toFixed(1)}%`,
                      background: valence < -0.3 ? '#ef4444' : valence > 0.3 ? '#16a34a' : '#3b82f6',
                    }}
                  />
                </div>
                <span className="text-[0.6rem] font-mono text-muted-foreground w-10 text-right">{valence.toFixed(2)}</span>
              </div>
              {/* Arousal */}
              <div className="flex items-center gap-2">
                <span className="text-[0.6rem] text-muted-foreground w-14">Arousal</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-700"
                    style={{ width: `${(arousal * 100).toFixed(1)}%` }}
                  />
                </div>
                <span className="text-[0.6rem] font-mono text-muted-foreground w-10 text-right">{arousal.toFixed(2)}</span>
              </div>
              {/* Emotion pill */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[0.7rem] font-kanit font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border"
                  style={{ color: emoColor.text, borderColor: emoColor.border, background: emoColor.bg }}
                >
                  {emoEmoji} {emotionLabel}
                </span>
                <span className="text-[0.6rem] font-mono text-muted-foreground">
                  v:{valence >= 0 ? '+' : ''}{valence.toFixed(3)} a:{arousal.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Thoughts divider */}
            <div className="border-t border-border" />

            {/* Thoughts log */}
            <div className="h-[200px] overflow-y-auto p-3 font-mono text-[0.6rem] space-y-0.5">
              {thoughts.length === 0 && (
                <div className="text-muted-foreground text-center py-4">Waiting for brain thoughts...</div>
              )}
              {thoughts.map((t, i) => {
                const srcColor =
                  t.src === 'amygdala' ? '#db2777' :
                  t.src === 'prefrontal' ? '#0891b2' :
                  t.src === 'broca' ? '#7c3aed' :
                  t.src === 'vision' ? '#0284c7' :
                  t.src === 'conflict' ? '#ef4444' : '#6b7280'
                return (
                  <div key={i} className="text-foreground leading-relaxed">
                    <span className="text-muted-foreground">{fmtTime(t.ts)} </span>
                    <span style={{ color: srcColor }}>{t.src}</span>
                    <span className="text-muted-foreground"> {'\u2014'} </span>
                    <span className="text-foreground">{t.msg}</span>
                  </div>
                )
              })}
              <div ref={thoughtsEndRef} />
            </div>
          </div>

          {/* Joint angles */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-kanit uppercase tracking-widest text-primary/70">7-DoF Joint Targets</span>
              <span className="text-[0.6rem] font-mono text-muted-foreground">radians {'\u00b7'} live</span>
            </div>
            <div className="space-y-2">
              {JOINTS.map((joint, idx) => {
                const val = jointPos[idx] ?? 0
                const pct = Math.min(100, Math.max(0, ((val + 1.5) / 3) * 100))
                return (
                  <div key={joint} className="flex items-center gap-2">
                    <span className="text-[0.6rem] font-mono text-muted-foreground w-24 truncate">{joint}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[0.6rem] font-mono text-muted-foreground w-10 text-right">{val.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Status */}
          <div className="rounded-lg bg-card border border-border px-3 py-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-600' : 'bg-red-500'}`} />
            <span className="text-[0.6rem] text-muted-foreground">{connected ? 'Brain connected' : 'Brain offline'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
