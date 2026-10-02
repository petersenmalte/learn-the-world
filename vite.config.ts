import { defineConfig } from 'vite';
export default defineConfig({ base: process.env.BASE_PATH || '/learn-the-world/', worker: { format: 'es' } });
