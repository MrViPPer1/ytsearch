const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create empty JSON files if they don't exist
const files = ['api-keys.json', 'excluded-channels.json', 'search-history.json'];
files.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
    }
});

console.log('Postinstall: Created necessary data files'); 