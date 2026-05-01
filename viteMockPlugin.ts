import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';

export function viteMockPlugin(): Plugin {
    return {
        name: 'vite-mock-api-plugin',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                // Only intercept requests to /api/mock/
                if (!req.url?.startsWith('/api/mock/')) {
                    return next();
                }

                const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
                // e.g., ['api', 'mock', 'clients'] or ['api', 'mock', 'clients', '0001']

                if (urlParts.length < 3) {
                    res.statusCode = 400;
                    return res.end('Invalid mock URL');
                }

                const collection = urlParts[2];
                const id = urlParts[3];
                const mockDbDir = path.resolve(__dirname, process.env.MOCK_DB_DIR || 'mock-db');
                const dbPath = path.join(mockDbDir, `${collection}.json`);

                // Initialize file if not exists
                if (!fs.existsSync(dbPath)) {
                    if (!fs.existsSync(mockDbDir)) {
                        fs.mkdirSync(mockDbDir);
                    }
                    fs.writeFileSync(dbPath, '[]');
                }

                // Helper to read and write DB
                const readDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                const writeDb = (data: any) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

                res.setHeader('Content-Type', 'application/json');

                try {
                    // --- GET ---
                    if (req.method === 'GET') {
                        const data = readDb();
                        return res.end(JSON.stringify(data));
                    }

                    // --- POST or PUT (Save/Update) ---
                    if (req.method === 'POST' || req.method === 'PUT') {
                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });

                        req.on('end', () => {
                            const item = JSON.parse(body);
                            const data = readDb();

                            if (!item.id) {
                                item.id = Date.now().toString() + Math.random().toString(36).substring(7);
                            }

                            const index = data.findIndex((i: any) => i.id === item.id);
                            if (index >= 0) {
                                // Update
                                data[index] = { ...data[index], ...item };
                            } else {
                                // Insert
                                data.push(item);
                            }

                            writeDb(data);
                            return res.end(JSON.stringify(item));
                        });
                        return; // Wait for req.on('end') to finish
                    }

                    // --- DELETE ---
                    if (req.method === 'DELETE') {
                        if (!id) {
                            res.statusCode = 400;
                            return res.end(JSON.stringify({ error: 'ID is required for deletion' }));
                        }
                        const data = readDb();
                        const newData = data.filter((i: any) => i.id !== id);
                        writeDb(newData);
                        return res.end(JSON.stringify({ success: true }));
                    }

                    // Method not allowed
                    res.statusCode = 405;
                    return res.end('Method Not Allowed');

                } catch (error: any) {
                    console.error(`Mock DB Error [${req.method} ${req.url}]:`, error);
                    res.statusCode = 500;
                    return res.end(JSON.stringify({ error: error.message }));
                }
            });
        }
    };
}
