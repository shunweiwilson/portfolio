import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { githubImageUpload } from './vite-plugin-github-upload';
import { projectsData } from './vite-plugin-projects-data';

export default defineConfig(({ mode }) => {
  // Makes GITHUB_TOKEN from .env.local visible to the (dev-only) upload plugin.
  // loadEnv with an empty prefix also picks up non-VITE_ variables; it is never
  // exposed to the client because the plugin reads it in the Node process.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), tailwindcss(), githubImageUpload(), projectsData()],
    server: {
      host: true,
      // Cloudtop previews are served through rotating *.proxy.googlers.com hostnames,
      // which Vite's host check rejects by default.
      allowedHosts: ['.proxy.googlers.com', '.c.googlers.com', 'localhost'],
    },
  };
});
