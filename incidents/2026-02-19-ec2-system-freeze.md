# Incident Report: EC2 Full System Unresponsiveness
**Incident ID:** INC-2026-02-19-001  
**Date:** 2026-02-19  
**Severity:** P0 — Critical  
**Status:** Remediation In Progress  
**Reported By:** Asif Shaikh  
**Incident Commander:** Grace 🐙  

---

## Executive Summary

The EC2 instance (`ip-172-31-41-94.ec2.internal`) experienced a full system freeze and became completely unresponsive, requiring a manual hard reboot by Asif Shaikh. The primary cause was a `polyscan.service` systemd unit crash-looping at **320,245+ restarts**, exhausting kernel PID table capacity, CPU scheduler resources, and file descriptors. A concurrent heavy video processing workload (ffmpeg + Python + OpenAI TTS) amplified CPU and RAM pressure, accelerating the system's collapse.

---

## Timeline

| Time (UTC)    | Event |
|---------------|-------|
| ~11:41        | Asif tasks Mason agent with video revision (ffmpeg, Python PIL, OpenAI TTS processing begins) |
| ~12:00–13:00  | `polyscan.service` crash-looping intensifies; system resources degrading |
| ~13:05        | Asif discovers system completely unresponsive |
| ~13:05        | Hard reboot performed by Asif |
| ~13:06        | Grace begins investigation; identifies `polyscan.service` at 320,245+ restarts |
| ~13:07        | Sofia (DevOps) engaged in #sofia for log/metric review |
| ~13:09        | RCA completed; polyscan confirmed as primary root cause |
| ~13:12        | Incident escalated to #agent-roundtable; Ivan and Sofia tasked with remediation |
| ~13:27        | Incident report filed to GitHub; Grafana alerting configured |

---

## Root Cause Analysis

### Primary Cause — `polyscan.service` Crash Loop

The systemd unit `polyscan.service` was configured with `Restart=always` but was exiting immediately on every start attempt. Systemd dutifully restarted it each time, resulting in **320,245+ restart cycles** before the system became unresponsive.

**Impact of crash-loop:**
- **PID table exhaustion** — each restart forks a new process, consuming PID space
- **CPU saturation** — constant fork/exec/exit cycles consumed CPU scheduler capacity
- **File descriptor leak risk** — rapid process cycling can exhaust fd limits
- **Kernel scheduler overload** — the sheer volume of process lifecycle events overwhelmed the scheduler

### Contributing Factor — Concurrent Heavy Workload (Mason Agent)

The Mason agent was executing a video production pipeline in the ~90 minutes prior to the crash:
- `ffmpeg` audio/video mixing
- Python PIL image composition
- OpenAI TTS API + audio synthesis
- File I/O operations (write, delete, re-render)

This placed additional CPU and RAM pressure on the system during a period when resources were already degraded by the crash-loop, accelerating the timeline to full unresponsiveness.

### Combined Effect

```
polyscan crash-loop (PID/CPU exhaustion)
        +
Mason video pipeline (CPU/RAM pressure)
        =
System OOM / scheduler freeze → hard reboot required
```

---

## Impact Assessment

| Dimension         | Impact |
|-------------------|--------|
| System availability | 100% outage — full EC2 unresponsiveness |
| Duration          | Unknown (detected on next check-in, estimated 30–60 min) |
| Data loss         | None confirmed |
| Service disruption | All running agent sessions (Grace, Mason, Ivan, Sofia, etc.) interrupted |
| Recovery method   | Manual hard reboot by Asif |

---

## Remediation Actions

### Immediate (In Progress)
- [ ] **Ivan** — Identify what `polyscan.service` is and why it fails on start
- [ ] **Sofia** — Fix or disable `polyscan.service`; verify system health post-fix
- [ ] Add `StartLimitIntervalSec` and `StartLimitBurst` to service unit to cap crash-loops
- [ ] Verify PID count and OOM log post-reboot

### Short-Term (This Week)
- [ ] Add systemd `RestartLimit` controls to all agent-managed services
- [x] Configure Grafana email alerting for CPU, memory, and error spike thresholds
- [ ] Add Loki alert rule for `polyscan` journal error patterns
- [ ] Document all custom systemd services and their expected behavior

### Long-Term
- [ ] Implement process/PID monitoring via node_exporter custom metrics
- [ ] Add periodic systemd unit health sweep to Sofia's maintenance schedule
- [ ] Consider sandboxing heavy workloads (Mason video pipeline) with resource cgroups

---

## What Grafana Could Have Detected

The existing **Grace / Ops Overview** dashboard had panels for:
- CPU usage % — *would have shown spike*
- Memory usage % — *would have shown spike*
- Error signal rate (systemd journal) — *would have shown massive spike from polyscan errors*

However, **no alert rules were configured**, so no notifications were sent. The data was there — the alerting was not.

---

## Prevention Recommendations

### 1. Systemd Crash-Loop Protection
Add to all services managed by agents:
```ini
[Service]
Restart=always
StartLimitIntervalSec=300
StartLimitBurst=5
RestartSec=10s
```
This caps restarts to 5 per 5-minute window, preventing runaway crash-loops.

### 2. Grafana Alerting (Implemented 2026-02-19)
- **CPU alert:** >85% for 5 min → email to asif1031@gmail.com
- **Memory alert:** >90% for 5 min → email to asif1031@gmail.com
- **Error log spike:** >10 systemd errors/sec sustained → email alert
- **OOM alert:** Any OOM killer event in journal → immediate email

### 3. Resource Limits for Heavy Workloads
Wrap compute-intensive agent tasks in resource-limited contexts:
```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=80% -- ffmpeg ...
```

### 4. PID Monitoring
Add a Prometheus alert on PID usage approaching system limit:
```promql
node_processes_pids / node_processes_max_pids > 0.80
```

---

## Lessons Learned

1. **Alerting must be configured, not assumed** — metrics were being collected but no alerts fired
2. **Crash-loop protection is not optional** — every systemd service must have `StartLimitBurst`
3. **Heavy workloads should be isolated** — compute-intensive tasks need resource limits
4. **Unknown services are a risk** — `polyscan.service` origin/purpose was unknown; all services should be documented

---

## Post-Incident Review

*To be completed after remediation is confirmed by Ivan and Sofia.*

- [ ] Confirm polyscan fixed/disabled
- [ ] Verify system stable for 24h post-fix
- [ ] Close incident

---

*Filed by Grace 🐙 | 2026-02-19*
