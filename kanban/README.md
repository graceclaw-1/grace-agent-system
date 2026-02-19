# ⚡ GRACE COMMAND CENTER

> Cyberpunk/Synthwave 3D Kanban Board for the Grace Agent System

**Live:** https://graceclaw-1.github.io/grace-agent-system/kanban/

---

## Overview

A stunning 3D holographic kanban board for managing tasks across all 8 agents of the Grace Agent System. Built with a synthwave/cyberpunk aesthetic using Three.js.

## Agents

| Agent | Role | Color |
|-------|------|-------|
| 🐙 Grace | Chief of Staff | Cyan `#00fff0` |
| 💰 Peter | Personal Finance | Gold `#f7c948` |
| 🌿 Dr. Maya | Health & Wellness | Green `#4ade80` |
| ⚖️ Liam | Legal & Compliance | Indigo `#818cf8` |
| 📈 Nina | Trading & Crypto | Pink `#f472b6` |
| 🛡️ Ivan | Security & Risk | Orange `#fb923c` |
| ⚙️ Sofia | Engineering | Sky `#38bdf8` |
| 📣 Mason | Marketing & Growth | Purple `#a78bfa` |

## Features

- **3D View**: Floating holographic agent panels arranged in a circle, Three.js powered
- **Synthwave Aesthetic**: Animated grid floor, particle system, neon glow effects, CRT scanlines
- **Interactive Camera**: Drag to orbit, scroll to zoom, click agent panels to zoom in
- **Agent Sidebar**: Click any panel to see all tasks for that agent
- **2D Flat View**: Accessible drag-and-drop kanban board (toggle with ☰ 2D button)
- **Full CRUD**: Add, edit, delete tasks via cyberpunk-styled modal
- **Drag & Drop**: Move cards between columns in 2D view
- **Persistence**: Tasks stored in localStorage, seeded with 40 real tasks on first load
- **HUD**: Bottom bar showing task stats and mission progress
- **Live Clock**: UTC clock in the navbar

## Tech Stack

- Pure HTML/CSS/JavaScript (no build step)
- [Three.js r134](https://threejs.org/) via CDN
- [Orbitron + Share Tech Mono](https://fonts.google.com/) fonts
- localStorage for data persistence

## File Structure

```
kanban/
├── index.html    # Main entry point
├── style.css     # Synthwave styles + animations
├── app.js        # Main application controller
├── scene.js      # Three.js 3D scene
├── agents.js     # Agent definitions + colors
├── tasks.js      # Task CRUD + localStorage
└── ui.js         # Modal + sidebar + flat view
```

## Usage

1. Visit the live URL above
2. **3D View**: Drag to rotate, scroll to zoom, click agent panels to focus
3. **Add tasks**: Click `+ TASK` in the nav bar, or `+ ADD TASK` in agent sidebar
4. **2D View**: Click `☰ 2D` to switch to drag-and-drop flat view
5. **Reset**: Click `⟳ SEED` to restore default seed data

## Development

No build step needed. Just edit files and push:

```bash
cd /home/ec2-user/grace-agent-system
# make changes...
git add kanban/
git commit -m "feat: update kanban"
git push
```

GitHub Pages auto-deploys from the `main` branch.

---

*Built with ❤️ by Grace 🐙 — GRACE AGENT SYSTEM*
