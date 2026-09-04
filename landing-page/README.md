# ByaHero Landing Page (Modularized)

Welcome to the modularized ByaHero landing page codebase.

## Directory Structure

```
landing-page/
├── assets/
│   ├── images/              # Logos, banners, QR codes
│   └── videos/              # Demo MP4s, posters, and VTT captions
├── components/              # Modular HTML sections
│   ├── navbar.html          # Top navigation bar & mobile offcanvas
│   ├── hero.html            # Hero section with banner & action buttons
│   ├── walkthroughs.html    # 9 smartphone video mockups & category filters
│   ├── survey.html          # Capstone study survey card & QR code
│   ├── roles.html           # "For Everyone" role cards
│   ├── cta.html             # Bottom download call-to-action
│   └── footer.html          # Multi-column footer & scroll-to-top button
├── css/                     # Modular CSS stylesheets
│   ├── tokens.css           # Design tokens, brand colors, typography variables
│   ├── base.css             # Base reset, typography, common section headings
│   ├── navbar.css           # Navbar styling, glassmorphism blur, offcanvas
│   ├── hero.css             # Hero layout, badges, buttons, visual mockups
│   ├── walkthroughs.css     # Phone mockups, video player, audio controls, captions
│   ├── survey.css           # Survey card, QR code box styling
│   ├── roles.css            # Role cards and features list
│   ├── cta.css              # Bottom CTA banner
│   ├── footer.css           # Footer links and social icons
│   ├── animations.css       # Keyframes, scroll reveal, scroll-to-top button
│   ├── responsive.css       # Media queries for tablet & mobile breakpoints
│   └── styles.css           # Central stylesheet importing all modules
├── js/                      # Modular JavaScript files
│   ├── animations.js        # Navbar blur, smooth scroll, reveal observer
│   ├── walkthroughs.js      # Video autoplay on scroll, audio toggle, fullscreen, filters
│   ├── release.js           # Dynamic GitHub Release latest APK link resolver
│   └── main.js              # Application entry point & initialization
├── build.js                 # Zero-dependency build & watch script
├── package.json             # NPM build and dev scripts
├── template.html            # Master HTML shell with component placeholders
└── index.html               # Compiled production-ready standalone HTML
```

## How to Edit

### 1. Modifying HTML Content
Edit individual sections directly in `components/`:
- To update the navigation: edit `components/navbar.html`
- To update walkthrough videos: edit `components/walkthroughs.html`
- To update the survey: edit `components/survey.html`
- To update the hero text: edit `components/hero.html`

Then compile by running:
```bash
npm run build
# or
node build.js
```

### 2. Live Watch Mode (Auto-recompile)
During development, run the watcher to automatically rebuild `index.html` whenever you save changes:
```bash
npm run dev
# or
node build.js --watch
```

### 3. Modifying Styles & Logic
- CSS styles are imported via `css/styles.css` — you can edit any specific module in `css/` without needing to rebuild.
- JavaScript files in `js/` are loaded directly by `index.html` — changes take effect immediately on browser refresh.
