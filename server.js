import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, 'db-test.html');
    
    // Set the content type to HTML
    res.setHeader('Content-Type', 'text/html');
    
    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end(`Error loading the file: ${err.message}`);
            return;
        }
        
        res.writeHead(200);
        res.end(content);
    });
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 