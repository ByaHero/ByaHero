const FtpDeploy = require("ftp-deploy");
const ftpDeploy = new FtpDeploy();
const fs = require("fs");
const path = require("path");

// Simple local .env file parser
const envPath = path.join(__dirname, ".env");
const env = {};
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    lines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith("#")) return;
        const eqIdx = line.indexOf("=");
        if (eqIdx !== -1) {
            const key = line.substring(0, eqIdx).trim();
            let val = line.substring(eqIdx + 1).trim();
            val = val.replace(/^["']|["']$/g, ""); // remove wrapping quotes
            env[key] = val;
        }
    });
}

const config = {
    user: env.FTP_USER,
    password: env.FTP_PASS,
    host: env.FTP_HOST,
    port: parseInt(env.FTP_PORT || "21", 10),
    localRoot: __dirname,
    remoteRoot: env.FTP_REMOTE_PATH || "public_html",
    include: ["*", "**/*"],
    exclude: [
        "node_modules/**",
        ".git/**",
        ".github/**",
        ".env",
        "deploy.js",
        "package.json",
        "package-lock.json",
        "capacitor.config.json",
        "android/**",
        "www/**",
        "scratch/**",
        ".claude/**",
        "README.md",
        "LICENSE",
        ".dockerignore",
        "Dockerfile"
    ],
    deleteRemote: false, // Prevents deleting existing files on the host (e.g. logs)
    forcePassive: true
};

console.log("🚀 Starting ByaHero FTP Deployment to Googiehost...");
console.log(`📡 Connecting to ${config.host}:${config.port}...`);
console.log(`📁 Target Remote Directory: ${config.remoteRoot}`);

ftpDeploy
    .deploy(config)
    .then(res => {
        console.log("\n✨ ByaHero successfully deployed to Googiehost!");
        console.log(`Uploaded files: ${res.length}`);
    })
    .catch(err => {
        console.error("\n❌ Deployment failed:", err.message || err);
    });

ftpDeploy.on("uploading", function(data) {
    console.log(`Uploading [${data.transferredFileCount}/${data.totalFilesCount}]: ${data.filename}`);
});
