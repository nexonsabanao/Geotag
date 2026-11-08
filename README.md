# Geotag - GPS Photo Geotagging Tool

A React-based photo geotagging application that automatically detects GPS coordinates from photos, lets you add map stamps, and exports geotagged images.

## Features

- **Camera Capture**: Take photos directly from your device camera with a clean UI
- **Photo Upload**: Drag & drop or upload photos from your computer
- **Auto EXIF Parsing**: Automatically extracts GPS coordinates from photos
- **Reverse Geocoding**: Converts coordinates to human-readable addresses
- **Map Stamps**: Adds satellite map previews with custom stamps (title, address, coordinates, timestamp, etc.)
- **Photo Editor**: Crop and resize photos before geotagging
- **Batch Processing**: Process multiple photos at once
- **Export**: Download individual or batch exports as ZIP

## Prerequisites

- Node.js 18+ or Bun
- npm or bun package manager

## Installation

```bash
# Install dependencies
npm install
# or
bun install
```

## Development

```bash
npm run dev
# or
bun run dev
```

This starts the dev server at http://localhost:3000.

## Building for Production

```bash
npm run build
# or
bun run build
```

Build output is in the `dist/` folder.

## Deploying to GitHub Pages

The project is configured for GitHub Pages deployment. Make sure your repository is named appropriately (e.g., `Geotag`), and your GitHub Pages site is set to deploy from the `main` branch's `dist` folder.

### Steps:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to GitHub Pages:**
   ```bash
   npm run deploy
   ```

3. Your site will be available at: `https://your-username.github.io/Geotag/`

### Manual Deployment:

Alternatively, you can manually deploy:
1. Build the project: `npm run build`
2. Push the `dist/` folder to a `gh-pages` branch or use GitHub Pages settings to deploy from `dist`

## Configuration

### GitHub Pages Base Path

The base path for GitHub Pages is configured in `vite.config.ts`:
```typescript
const basePath = process.env.VITE_BASE || '/Geotag/';
```

If your repository name differs, you can override it:
```bash
VITE_BASE=/your-repo-name/ npm run build
```

### Camera Permissions

The camera feature requires:
- HTTPS (GitHub Pages provides this)
- User permission to access the camera
- Camera-equipped device (desktop or mobile)

## How It Works

1. **Add a Photo**: Use the camera or upload photos from your device
2. **Auto-Detect Location**: GPS coordinates from the photo's EXIF data are automatically reverse-geocoded to a location
3. **Edit Location Data**: Use the Location panel to adjust coordinates, title, and address
4. **Customize Stamp**: Use the Stamp panel to customize the map stamp appearance
5. **Export**: Download the geotagged photo or export all photos as a ZIP

## Tech Stack

- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- canvas-confetti (for export animations)
- JSZip (for batch exports)
- EXIF parser for GPS data extraction

## License

MIT
