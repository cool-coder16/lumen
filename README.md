# Lumen — a living-light studio

Interactive generative-art studio: tens of thousands of particles flow through noise fields, react to your cursor
(and microphone), mirror into kaleidoscopes, and can be saved to a personal gallery or shared with the community.

**Live:** https://cool-coder16.github.io/lumen/

## Features
- 4 physics modes (flow, curl, orbit, nebula), 8 palettes, symmetry/mirror, trails, glow, bloom
- Click to burst, hold to pull; idle autopilot; microphone-reactive mode; cinema mode (auto-directed show)
- Firebase Auth (Google, email/password, guest) + Firestore gallery (private, public, likes, search, sort)
- PNG export, WebM clip recording, shareable links (scene encoded in the URL), undo history
- No build step: plain ES modules, hosted on GitHub Pages. Falls back to a local demo mode if Firebase is unreachable/unconfigured.

## Shortcuts
`Space` remix · `1-4` mode · `[ ]` symmetry · `C` palette · `Z` undo · `P` pause · `S` save · `D` PNG · `R` record · `V` cinema · `L` link · `M` mic · `G` gallery · `H` hide UI · `F` fullscreen · `?` help

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Firebase setup
1. Create a Firebase project, add a Web app, paste its config into `firebase-config.js`.
2. Authentication → enable Google, Email/Password, Anonymous. Add your GitHub Pages domain under Authorized domains.
3. Create a Firestore database and publish `firestore.rules`.
