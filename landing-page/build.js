/**
 * ByaHero Landing Page - Component Build & Assembly Tool
 * 
 * Usage:
 *   node build.js          # Builds index.html once
 *   node build.js --watch  # Watches components and template, rebuilding on changes
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const TEMPLATE_FILE = path.join(BASE_DIR, 'template.html');
const OUTPUT_FILE = path.join(BASE_DIR, 'index.html');
const COMPONENTS_DIR = path.join(BASE_DIR, 'components');

function build() {
    const startTime = Date.now();
    try {
        if (!fs.existsSync(TEMPLATE_FILE)) {
            console.error(`Error: Template file not found at ${TEMPLATE_FILE}`);
            return false;
        }

        let template = fs.readFileSync(TEMPLATE_FILE, 'utf8');

        // Regex to match <!-- include: path/to/file.html -->
        const includeRegex = /<!--\s*include:\s*([^\s]+)\s*-->/g;

        const assembled = template.replace(includeRegex, (match, relPath) => {
            const componentPath = path.resolve(BASE_DIR, relPath);
            if (!fs.existsSync(componentPath)) {
                console.warn(`Warning: Component not found: ${componentPath}`);
                return `<!-- Missing component: ${relPath} -->`;
            }
            const content = fs.readFileSync(componentPath, 'utf8');
            return content.trim();
        });

        fs.writeFileSync(OUTPUT_FILE, assembled, 'utf8');
        const duration = Date.now() - startTime;
        const stats = fs.statSync(OUTPUT_FILE);
        const kb = (stats.size / 1024).toFixed(1);

        console.log(`[${new Date().toLocaleTimeString()}] Built index.html successfully (${kb} KB in ${duration}ms)`);
        return true;
    } catch (err) {
        console.error('Build failed:', err);
        return false;
    }
}

// Initial Build
build();

// Watch Mode
if (process.argv.includes('--watch')) {
    console.log('\n[Watch Mode] Watching for changes in template.html and components/ ... (Press Ctrl+C to stop)');

    let debounceTimer = null;
    const triggerRebuild = (eventType, filename) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log(`Change detected: ${filename || eventType}. Rebuilding...`);
            build();
        }, 100);
    };

    if (fs.existsSync(TEMPLATE_FILE)) {
        fs.watch(TEMPLATE_FILE, triggerRebuild);
    }

    if (fs.existsSync(COMPONENTS_DIR)) {
        fs.watch(COMPONENTS_DIR, triggerRebuild);
    }
}
