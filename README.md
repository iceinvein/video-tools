# Video Editor

A privacy-focused, browser-based video editing application that runs entirely on the client side. Edit your videos with crop, compress, and trim tools without uploading to any server.

## Features

- **🎬 Video Cropping** - Select and extract specific regions from your video with an intuitive drag-and-resize interface
- **🗜️ Video Compression** - Reduce file size with adjustable quality settings (H.264/H.265 codecs) while maintaining visual fidelity
- **✂️ Video Trimming** - Cut your video to specific time ranges with frame-accurate precision
- **�️ Real- time Preview** - See your edits before processing with side-by-side comparison
- **� Priva-cy First** - All processing happens in your browser using WebAssembly - your videos never leave your device
- **� Respaonsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **⚡ No Server Required** - Powered by FFmpeg.wasm for client-side video processing

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **UI Components**: Hero UI (NextUI)
- **Styling**: Tailwind CSS 4
- **Video Processing**: FFmpeg.wasm
- **State Management**: Nanostores
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library

## Browser Compatibility

Requires a modern browser with WebAssembly and SharedArrayBuffer support:

- Chrome 94+
- Firefox 90+
- Safari 16.4+
- Edge 94+

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Modern web browser with WebAssembly support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd video-editor

# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Start development server
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build
# or
bun run build

# Preview production build
npm run preview
# or
bun run preview
```

### Testing

```bash
# Run tests
npm test
# or
bun test

# Run tests with UI
npm run test -- --ui
```

### Linting

```bash
# Run linter with auto-fix
npm run lint
# or
bun run lint
```

## Usage

1. **Upload a Video**: Click the upload button or drag and drop a video file (max 500MB)
2. **Apply Operations**: Use the tools panel to crop, compress, or trim your video
3. **Preview Changes**: Review your edits in real-time before processing
4. **Process Video**: Click the process button to apply all operations
5. **Download**: Save your edited video to your device

### Supported Video Formats

**Input**: MP4, WebM, MOV, AVI  
**Output**: MP4 (H.264/H.265)

### File Size Limits

Maximum file size: 500MB

## Project Structure

```
src/
├── components/
│   ├── video-tools/          # Video editing components
│   │   ├── video-upload.tsx
│   │   ├── video-preview.tsx
│   │   ├── crop-tool.tsx
│   │   ├── compression-tool.tsx
│   │   ├── trim-tool.tsx
│   │   ├── operations-queue.tsx
│   │   └── processing-progress.tsx
│   ├── error-boundary.tsx
│   ├── theme-switch.tsx
│   └── icons.tsx
├── pages/
│   └── video-editor.tsx      # Main editor page
├── services/
│   └── video-processor.ts    # FFmpeg.wasm integration
├── stores/
│   └── video-editor.ts       # State management
├── types/
│   ├── index.ts
│   └── video-tools.ts        # Type definitions
├── config/
│   └── video-formats.ts      # Format configurations
├── utils/
│   └── browser-compatibility.ts
└── styles/
    └── globals.css
```

## Performance Considerations

- FFmpeg.wasm is loaded lazily when a video is uploaded
- Large videos (>100MB) may take several minutes to process depending on operations
- Processing happens in the browser, so performance depends on your device's CPU
- Memory usage scales with video file size - close other tabs if processing large files

## Security & Privacy

- All video processing happens locally in your browser
- No video data is uploaded to any server
- No tracking or analytics
- Files are processed in memory and cleared after download

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - WebAssembly port of FFmpeg
- [Hero UI](https://www.heroui.com/) - Beautiful React components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## Troubleshooting

### FFmpeg fails to load

Ensure your browser supports SharedArrayBuffer. Some browsers require specific headers for security:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The Vite configuration includes the `vite-plugin-cross-origin-isolation` plugin to handle this automatically.

### Video processing is slow

- Try reducing the video resolution before processing
- Use lower compression quality settings
- Close other browser tabs to free up memory
- Consider processing shorter video segments

### Out of memory errors

- Reduce the video file size (use videos under 200MB for best results)
- Close other applications and browser tabs
- Try processing on a device with more RAM
- Split large videos into smaller segments

## Support

For issues and questions, please open an issue on the GitHub repository.
