# Timer Machine (React)

A step-by-step interval timer web application rewritten in React, Vite, and Tailwind CSS.

## Features

- **Interval Timers**: Build, repeat, and run sequential step timers and looping groups.
- **Built-in Ball Mastery Timers**: Levels 1–3 drill progressions with practice and tempo beats (100 BPM & 180 BPM).
- **Interactive Runner**:
  - High-precision countdown timer with milliseconds tracking
  - Audio and haptic feedback (beeps, vibration, and screen wake lock)
  - Video and media previews with custom playback speeds (0.5×, 0.75×, 1×) and sound controls
  - Fullscreen support and orientation locking for workouts
  - Jump-to-step quick drawer
- **Timer & Step Editor**:
  - Customize labels, duration presets (hours, minutes, seconds)
  - Configure audio signals, announcements, countdown beeps, and pause-on-complete halts
  - Attach background music, images, or instructional videos via IndexedDB
  - Swipe sideways to remove steps
- **IBM Carbon Design System**: Clean, high-contrast, accessible typography and tokens defined in `DESIGN.md`.
- **shadcn UI & @shadcn/lint**:
  - `components.json` initialized for shadcn primitives
  - `@shadcn/lint` configured in `eslint.config.mjs` enforcing design system rules (component contracts, tokens, scale values, and inline style policies)

## Linting & Design System Verification

Run the linter:

```sh
npm run lint
```

This runs `@shadcn/lint` through ESLint and `tsc --noEmit`.

## Development

```sh
npm install
npm run dev
```

Build for production:

```sh
npm run build
```
