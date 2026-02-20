# 🎧 Muse

*A highly customizable, modular 3D music visualizer for your desktop.*

Muse is a desktop application built to bring your audio to life with high-fidelity, real-time 3D visualizers. It allows deep customization and dynamic audio reactivity, letting you craft the perfect aesthetic for your music.

## ✨ Features

- **Interactive 3D Visualizers:** Beautiful, real-time visualizers (such as the CD Spinner) built with Three.js and React Three Fiber.
- **Audio-Reactive Dynamics:** Deep audio analysis allows the physical properties of the visualizers (scale, rotation speed, light intensity) to react dynamically to specific frequency bands in your audio.
- **Extensive Customization:** Tweak colors, camera angles, dither effects, glow, and backgrounds to get the perfect retro or modern look.
- **Preset Management:** Save your favorite visual configurations, color palettes, and reactivity settings, and load them instantly.
- **High-Quality Video Export:** Render your sessions locally to crisp `.mp4` video files with perfectly synchronized audio and adjustable playback speed for slow-motion captures.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SihoChoii/muse.git
   cd muse
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   This will start the Vite development server and launch the Electron application.

### Building for Production

To build the executable application for your platform:

```bash
npm run build
```
The compiled binaries will be available in the `release` directory.

## 🎮 User Guide

### 1. Loading Audio
Starting a session is easy. Upon opening the app, you'll be greeted by the Library view.
- Click the **Load Audio** button to select an audio file from your computer.

### 2. Tweaking Visuals
Dive into the visualizer and open the side panels to customize your experience:
- **Audio Reactivity Panel:** Fine-tune how the visualizer responds to audio. Select specific frequency bands, adjust bandwidth, and set sensitivity for different visual elements (e.g., pumping scale, boosting rotation).
- **Settings Panel:** Control the physical properties of the scene. Change camera angles, adjust the global visualizer speed, and toggle various elements.
- **Effects Rack:** Apply post-processing effects. Add a classic dither effect for a retro aesthetic, adjust glow intensity, and manage color grading.

### 3. Presets
Once you have created a look and feel you love, use the **Preset Manager** at the bottom of the screen to save your configuration. You can load these presets later to instantly recall your exact setup, including camera angles and effect parameters.

### 4. Exporting Video
Want to share your creation?
- Ensure your audio is loaded and your visualizer is configured.
- Click the **Record** button to start capturing.
- Once finished, click **Stop Recording** and choose where to save your synchronized `.mp4` file.

## 🛠️ Tech Stack

Muse is built using modern web and desktop technologies:
- **[Electron](https://www.electronjs.org/):** Cross-platform desktop application framework.
- **[React](https://reactjs.org/):** UI library for building the application interface.
- **[Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber):** Core 3D rendering engine and its React wrapper.
- **[Vite](https://vitejs.dev/):** Fast frontend build tool.
- **[Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/):** For rapid and beautiful UI styling.
- **[Zustand](https://github.com/pmndrs/zustand):** Lightweight state management.

---

*Made with ❤️ for music and visuals.*
