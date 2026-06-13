# SpineSafe — AI-Powered Biomechanics Visualization

SpineSafe is an open-source, NGO-style educational platform demonstrating the physical effects of forward head posture on the cervical spine. The core feature is an interactive 3D biomechanics simulator that translates head posture angles into real-world torque and spinal load calculations.

## Overview

The application is built using a modern React stack, designed for high performance and an elegant, premium aesthetic. It heavily leverages **Three.js** and **React Three Fiber** to render a rigged, animatable human model (`untitled.glb`), allowing users to visually manipulate the model's skeletal posture via a UI slider and instantly see the physical forces applied.

### Key Features
- **Interactive 3D Skeletal Simulation**: A rigged Mixamo model dynamically controlled via mathematical easing and quaternion blending to visually simulate forward head posture.
- **Real-Time Physics Engine**: Calculates neck torque ($\tau$) and equivalent spinal load based on posture angle.
- **Biomechanical Overlays**: Renders dynamic force vectors (Gravity, Leverage, Torque) and glowing risk-assessment spheres at the cervical joints (C1-C7).
- **Report Generator**: Collects angular data for multiple test subjects and generates downloadable CSV reports for clinical or academic study.
- **Data Visualization**: Uses Chart.js to map postural stress across standard test sessions.

---

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`, `three-stdlib`
- **Data Visualization**: Chart.js, `react-chartjs-2`
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid)

---

## Project Structure & Key Files

The following files constitute the architecture of the SpineSafe platform:

### Core Configuration
* `package.json` / `package-lock.json` - Dependency management and build scripts.
* `vite.config.ts` - Configuration for the Vite development server and production bundler.
* `tsconfig.json` - TypeScript compiler settings.
* `index.html` - The foundational HTML document and Vite entry point.

### Application Logic & UI
* `src/main.tsx` - The React initialization script that mounts the application to the DOM.
* `src/App.tsx` - The primary state manager and layout container. It handles the slider input, calculates physics values (Torque, Spinal Load, Risk Assessment), renders the Chart.js graph, manages the Report Generator form, and coordinates the 3D scenes.
* `src/index.css` - The global design system, including color variables, typography (Space Grotesk & Inter), layout grids, and interactive transitions.

### 3D Visualization System (`src/components/3d/`)
* `src/components/PhysicsScene.tsx` - The main canvas wrapper for the interactive physics simulation. Configures lighting, shadows, and the camera setup to focus cleanly on the human model.
* `src/components/HeroScene.tsx` - (Currently Deprecated) An alternative canvas configuration intended for the landing hero section.
* `src/components/3d/HumanModel.tsx` - The most complex 3D component. It imports the GLB, corrects raw Mixamo skeleton offsets dynamically, enforces a natural resting pose, adds idle animations (breathing, swaying), and applies slider-driven skeletal deformations via quaternion spherical linear interpolation (`slerp`).
* `src/components/3d/ForceVectors.tsx` - Procedurally generates 3D arrows to visually explain the biomechanical forces (gravity pull, lever arm, and rotational torque) affecting the spine.
* `src/components/3d/CervicalOverlay.tsx` - Maps spherical meshes to the C1-C7 cervical vertebrae, dynamically changing color and intensity based on the calculated risk tier.

### Static Assets
* `public/untitled.glb` - The Mixamo-rigged 3D human model file used for all physical simulations.

---

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone the repository and navigate into the project directory:
   ```bash
   cd spinesafe
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

### Running Locally
To spin up the Vite development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`. Hot Module Replacement (HMR) is enabled, meaning changes to the code will reflect instantly in the browser.

### Production Build
To compile the TypeScript and build an optimized bundle for deployment:
```bash
npm run build
```
The resulting static files will be generated in the `dist/` directory. You can preview the production build using:
```bash
npm run preview
```
