import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'electron/main/index.js'),
        external: ['electron']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'electron/preload/index.mjs')
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html')
      }
    },
    plugins: [react()]
  }
})
