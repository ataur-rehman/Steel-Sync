#!/usr/bin/env node

/**
 * Web-based Installer for macOS
 * This creates a web version that can run in any browser on Mac
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 Creating Web-based macOS Distribution...');

// Copy the dist folder for web deployment
const webDistPath = path.join(__dirname, 'web-dist-mac');

if (fs.existsSync(webDistPath)) {
    fs.rmSync(webDistPath, { recursive: true });
}

// Copy built web assets
fs.cpSync(path.join(__dirname, 'dist'), webDistPath, { recursive: true });

// Create macOS-specific index.html
const macOSHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ittehad Iron Store - macOS Web App</title>
    <link rel="manifest" href="./manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Ittehad Iron Store">
    <link rel="apple-touch-icon" href="./icons/icon-192x192.png">
    <style>
        .install-banner {
            background: #007AFF;
            color: white;
            padding: 1rem;
            text-align: center;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 9999;
        }
        .install-banner button {
            background: white;
            color: #007AFF;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            margin-left: 1rem;
            cursor: pointer;
        }
        body { margin-top: 60px; }
    </style>
</head>
<body>
    <div id="install-banner" class="install-banner" style="display: none;">
        🍎 Install Ittehad Iron Store on your Mac
        <button onclick="installApp()">Install Now</button>
        <button onclick="dismissBanner()" style="background: transparent; color: white;">Dismiss</button>
    </div>
    
    <div id="root"></div>
    
    <script>
        // PWA Installation Logic
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('install-banner').style.display = 'block';
        });
        
        function installApp() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                    dismissBanner();
                });
            }
        }
        
        function dismissBanner() {
            document.getElementById('install-banner').style.display = 'none';
        }
        
        // Check if running on macOS
        if (navigator.platform.indexOf('Mac') !== -1) {
            console.log('🍎 Running on macOS');
        }
    </script>
    
    <!-- Load the original app scripts -->
    ${fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8').match(/<script[^>]*>.*?<\/script>|<link[^>]*>/g)?.join('\n') || ''}
</body>
</html>
`;

fs.writeFileSync(path.join(webDistPath, 'index.html'), macOSHTML);

// Create PWA manifest for macOS
const manifest = {
    "name": "Ittehad Iron Store",
    "short_name": "Iron Store",
    "description": "Steel Store Management System",
    "start_url": "./",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#007AFF",
    "icons": [
        {
            "src": "./icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "./icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
};

fs.writeFileSync(path.join(webDistPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Create simple HTTP server script
const serverScript = `#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const webRoot = __dirname;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(webRoot, req.url === '/' ? 'index.html' : req.url);
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            const ext = path.extname(filePath);
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log('🍎 Ittehad Iron Store - macOS Web Version');
    console.log(\`🌐 Server running at http://localhost:\${PORT}\`);
    console.log('📱 You can install this as a PWA on your Mac!');
    
    // Try to open browser
    const { exec } = require('child_process');
    exec(\`open http://localhost:\${PORT}\`);
});
`;

fs.writeFileSync(path.join(webDistPath, 'server.js'), serverScript);
fs.chmodSync(path.join(webDistPath, 'server.js'), '755');

console.log('✅ Web-based macOS distribution created!');
console.log('📁 Location:', webDistPath);
console.log('');
console.log('🚀 To run on macOS:');
console.log('1. Copy the web-dist-mac folder to your Mac');
console.log('2. Run: node server.js');
console.log('3. Open http://localhost:3000 in Safari');
console.log('4. Click "Install Now" to add to your Mac');
