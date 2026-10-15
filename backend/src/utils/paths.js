import path from 'path';
import { fileURLToPath } from 'url';

// Resolve paths relative to the backend package root rather than process.cwd(),
// so uploads resolve identically whether the server is started with
// `npm run dev` (cwd = backend/) or `node backend/src/main.js` (cwd = repo root).
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const UPLOAD_DIR = path.join(backendRoot, 'uploads');

export default backendRoot;
