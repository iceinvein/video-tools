/**
 * Video Processor Service
 *
 * Handles all video processing operations using FFmpeg.wasm.
 * Provides methods for cropping, compressing, trimming, and format conversion.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type {
	CompressionSettings,
	CropRegion,
	IVideoProcessor,
	ProgressCallback,
	TrimRange,
	VideoOperation,
} from "../types/video-tools";

/**
 * VideoProcessor class implementing IVideoProcessor interface
 * Manages FFmpeg.wasm lifecycle and video operations
 */
export class VideoProcessor implements IVideoProcessor {
	private ffmpeg: FFmpeg;
	private isLoaded: boolean = false;
	private progressCallback: ProgressCallback | null = null;
	private isCancelled: boolean = false;

	constructor() {
		this.ffmpeg = new FFmpeg();
	}

	/**
	 * Initialize FFmpeg.wasm with proper loading of core and wasm files
	 * Lazy loads FFmpeg only when needed
	 * @throws Error if FFmpeg fails to load
	 */
	async initialize(): Promise<void> {
		if (this.isLoaded) {
			return;
		}

		try {
			console.log("[VideoProcessor] Starting FFmpeg initialization...");

			// Set up progress logging
			this.ffmpeg.on("log", ({ message }) => {
				console.log("[FFmpeg]", message);
			});

			// Set up progress tracking
			this.ffmpeg.on("progress", ({ progress }) => {
				if (this.progressCallback) {
					// FFmpeg progress is 0-1, convert to 0-100
					this.progressCallback(Math.round(progress * 100));
				}
			});

			// Load FFmpeg core and wasm files lazily from CDN
			const baseURL =
				"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

			await this.ffmpeg.load({
				coreURL: await toBlobURL(
					`${baseURL}/ffmpeg-core.js`,
					"text/javascript",
				),
				wasmURL: await toBlobURL(
					`${baseURL}/ffmpeg-core.wasm`,
					"application/wasm",
				),
			});

			this.isLoaded = true;
			console.log("[VideoProcessor] FFmpeg initialized successfully");
		} catch (error) {
			console.error("[VideoProcessor] FFmpeg initialization error:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			// Check if SharedArrayBuffer is available
			if (typeof SharedArrayBuffer === "undefined") {
				throw new Error(
					"SharedArrayBuffer is not available. Please ensure the page is served with proper cross-origin headers or try refreshing the page.",
				);
			}

			throw new Error(`Failed to initialize FFmpeg: ${errorMessage}`);
		}
	}

	/**
	 * Check if FFmpeg is already loaded
	 * @returns true if FFmpeg is initialized
	 */
	isInitialized(): boolean {
		return this.isLoaded;
	}

	/**
	 * Set progress callback for tracking processing progress
	 * @param callback Function to call with progress updates (0-100)
	 */
	onProgress(callback: ProgressCallback): void {
		this.progressCallback = callback;
	}

	/**
	 * Cancel current processing operation
	 * Terminates FFmpeg and cleans up resources
	 */
	async cancel(): Promise<void> {
		this.isCancelled = true;

		try {
			// FFmpeg.wasm doesn't have a direct cancel method
			// We need to terminate and reinitialize
			if (this.isLoaded) {
				await this.ffmpeg.terminate();
				this.isLoaded = false;
				console.log("[VideoProcessor] Processing cancelled");
			}
		} catch (error) {
			console.error("[VideoProcessor] Error during cancellation:", error);
		}
	}

	/**
	 * Check if operation was cancelled
	 * @throws Error if operation was cancelled
	 */
	private checkCancellation(): void {
		if (this.isCancelled) {
			throw new Error("Operation cancelled by user");
		}
	}

	/**
	 * Ensure FFmpeg is initialized before processing
	 * @throws Error if FFmpeg is not initialized
	 */
	private ensureInitialized(): void {
		if (!this.isLoaded) {
			throw new Error("FFmpeg not initialized. Call initialize() first.");
		}
	}

	/**
	 * Write file to FFmpeg virtual filesystem
	 * @param filename Name for the file in FFmpeg filesystem
	 * @param file File to write
	 */
	private async writeFile(filename: string, file: File): Promise<void> {
		const data = await fetchFile(file);
		await this.ffmpeg.writeFile(filename, data);
	}

	/**
	 * Read file from FFmpeg virtual filesystem
	 * @param filename Name of the file to read
	 * @returns Blob containing the file data
	 */
	private async readFile(filename: string): Promise<Blob> {
		const data = await this.ffmpeg.readFile(filename);
		const uint8Array =
			data instanceof Uint8Array
				? new Uint8Array(data)
				: new TextEncoder().encode(data);
		return new Blob([uint8Array], { type: "video/mp4" });
	}

	/**
	 * Clean up files from FFmpeg virtual filesystem
	 * @param filenames Array of filenames to delete
	 */
	private async cleanupFiles(...filenames: string[]): Promise<void> {
		for (const filename of filenames) {
			try {
				await this.ffmpeg.deleteFile(filename);
			} catch {
				// Silently ignore errors if file doesn't exist
			}
		}
	}

	/**
	 * Crop video to specified region
	 * @param input Source video file
	 * @param crop Crop region parameters
	 * @returns Processed video as Blob
	 */
	async cropVideo(input: File, crop: CropRegion): Promise<Blob> {
		this.ensureInitialized();
		this.isCancelled = false;

		const inputName = "input.mp4";
		const outputName = "output.mp4";

		try {
			this.checkCancellation();

			// Write input file
			await this.writeFile(inputName, input);

			this.checkCancellation();

			// Execute crop command
			// crop filter format: crop=width:height:x:y
			await this.ffmpeg.exec([
				"-i",
				inputName,
				"-vf",
				`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
				"-c:a",
				"copy", // Copy audio without re-encoding
				outputName,
			]);

			this.checkCancellation();

			// Read output file
			const output = await this.readFile(outputName);

			// Cleanup
			await this.cleanupFiles(inputName, outputName);

			return output;
		} catch (error) {
			// Cleanup on error
			await this.cleanupFiles(inputName, outputName);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			throw new Error(`Failed to crop video: ${errorMessage}`);
		}
	}

	/**
	 * Compress video with specified settings
	 * @param input Source video file
	 * @param settings Compression settings
	 * @returns Processed video as Blob
	 */
	async compressVideo(
		input: File,
		settings: CompressionSettings,
	): Promise<Blob> {
		this.ensureInitialized();
		this.isCancelled = false;

		const inputName = "input.mp4";
		const outputName = "output.mp4";

		try {
			this.checkCancellation();

			// Write input file
			await this.writeFile(inputName, input);

			this.checkCancellation();

			// Convert quality (1-10) to CRF (51-18)
			// Lower CRF = higher quality
			const crf = Math.round(51 - (settings.quality - 1) * (33 / 9));

			const args = ["-i", inputName];

			// Add codec-specific settings
			if (settings.codec === "h264") {
				args.push(
					"-c:v",
					"libx264",
					"-crf",
					crf.toString(),
					"-preset",
					"medium",
				);
			} else if (settings.codec === "h265") {
				args.push(
					"-c:v",
					"libx265",
					"-crf",
					crf.toString(),
					"-preset",
					"medium",
				);
			}

			// Add bitrate if specified
			if (settings.targetBitrate) {
				args.push("-b:v", `${settings.targetBitrate}`);
			}

			// Add resolution scaling if specified
			if (settings.scaleWidth && settings.scaleHeight) {
				args.push(
					"-vf",
					`scale=${settings.scaleWidth}:${settings.scaleHeight}`,
				);
			}

			// Copy audio
			args.push("-c:a", "copy", outputName);

			await this.ffmpeg.exec(args);

			this.checkCancellation();

			// Read output file
			const output = await this.readFile(outputName);

			// Cleanup
			await this.cleanupFiles(inputName, outputName);

			return output;
		} catch (error) {
			// Cleanup on error
			await this.cleanupFiles(inputName, outputName);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			throw new Error(`Failed to compress video: ${errorMessage}`);
		}
	}

	/**
	 * Trim video to specified time range
	 * @param input Source video file
	 * @param range Time range to extract
	 * @returns Processed video as Blob
	 */
	async trimVideo(input: File, range: TrimRange): Promise<Blob> {
		this.ensureInitialized();
		this.isCancelled = false;

		const inputName = "input.mp4";
		const outputName = "output.mp4";

		try {
			this.checkCancellation();

			// Write input file
			await this.writeFile(inputName, input);

			this.checkCancellation();

			// Execute trim command
			// -ss: start time, -to: end time, -c copy: copy streams without re-encoding
			await this.ffmpeg.exec([
				"-i",
				inputName,
				"-ss",
				range.startTime.toString(),
				"-to",
				range.endTime.toString(),
				"-c",
				"copy",
				outputName,
			]);

			this.checkCancellation();

			// Read output file
			const output = await this.readFile(outputName);

			// Cleanup
			await this.cleanupFiles(inputName, outputName);

			return output;
		} catch (error) {
			// Cleanup on error
			await this.cleanupFiles(inputName, outputName);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			throw new Error(`Failed to trim video: ${errorMessage}`);
		}
	}

	/**
	 * Process queue of operations sequentially
	 * @param input Source video file
	 * @param operations Array of operations to apply in order
	 * @returns Final processed video as Blob
	 */
	async processQueue(input: File, operations: VideoOperation[]): Promise<Blob> {
		this.ensureInitialized();
		this.isCancelled = false;

		if (operations.length === 0) {
			throw new Error("No operations to process");
		}

		// Sort operations by order
		const sortedOps = [...operations].sort((a, b) => a.order - b.order);

		let currentBlob: Blob = input;
		let currentFile: File = input;
		const intermediateBlobs: Blob[] = [];

		try {
			for (let i = 0; i < sortedOps.length; i++) {
				this.checkCancellation();

				const operation = sortedOps[i];

				// Update progress callback with operation info
				if (this.progressCallback) {
					const overallProgress = (i / sortedOps.length) * 100;
					this.progressCallback(overallProgress);
				}

				// Process based on operation type
				switch (operation.type) {
					case "crop":
						currentBlob = await this.cropVideo(
							currentFile,
							operation.params as CropRegion,
						);
						break;
					case "compress":
						currentBlob = await this.compressVideo(
							currentFile,
							operation.params as CompressionSettings,
						);
						break;
					case "trim":
						currentBlob = await this.trimVideo(
							currentFile,
							operation.params as TrimRange,
						);
						break;
					default:
						throw new Error(`Unknown operation type: ${operation.type}`);
				}

				// Store intermediate blob for cleanup (except the final one)
				if (i < sortedOps.length - 1) {
					intermediateBlobs.push(currentBlob);
					currentFile = new File([currentBlob], `intermediate_${i}.mp4`, {
						type: currentBlob.type,
					});
				}
			}

			// Final progress update
			if (this.progressCallback) {
				this.progressCallback(100);
			}

			// Note: Intermediate blobs will be garbage collected automatically
			// We just clear the references to help the GC
			intermediateBlobs.length = 0;

			return currentBlob;
		} catch (error) {
			// Clear intermediate blobs on error
			intermediateBlobs.length = 0;

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			throw new Error(`Failed to process operation queue: ${errorMessage}`);
		}
	}
}

/**
 * Create and export a singleton instance
 */
export const videoProcessor = new VideoProcessor();
