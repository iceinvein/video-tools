/**
 * Video Editor Page
 *
 * Main page component that orchestrates the video editing workflow.
 * Integrates all video tool components and manages the editing state.
 */

import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { useStore } from "@nanostores/react";
import { useCallback, useEffect, useState } from "react";
import { ThemeSwitch } from "../components/theme-switch";
import { CompressionTool } from "../components/video-tools/compression-tool";
import { CropTool } from "../components/video-tools/crop-tool";
import { OperationsQueue } from "../components/video-tools/operations-queue";
import { ProcessingProgress } from "../components/video-tools/processing-progress";
import { TrimTool } from "../components/video-tools/trim-tool";
import { VideoPreview } from "../components/video-tools/video-preview";
import { VideoUpload } from "../components/video-tools/video-upload";
import { videoProcessor } from "../services/video-processor";
import {
	addOperation,
	completeProcessing,
	currentOperation as currentOperationStore,
	error as errorStore,
	hasOperations,
	isProcessing,
	operationsList,
	outputMetadata,
	outputVideo,
	processingProgress,
	resetEditor,
	setError,
	setVideo,
	sourceVideo,
	startProcessing,
	updateProgress,
} from "../stores/video-editor";
import type {
	CompressionSettings,
	CropRegion,
	TrimRange,
	VideoMetadata,
} from "../types/video-tools";

type ActiveTool = "crop" | "compress" | "trim" | null;

// Browser-specific type extensions
interface HTMLVideoElementWithAudio extends HTMLVideoElement {
	mozHasAudio?: boolean;
	webkitAudioDecodedByteCount?: number;
	audioTracks?: { length: number };
}

interface PerformanceMemory {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
	memory?: PerformanceMemory;
}

export default function VideoEditor() {
	// Store subscriptions
	const source = useStore(sourceVideo);
	const hasOps = useStore(hasOperations);
	const processing = useStore(isProcessing);
	const progress = useStore(processingProgress);
	const currentOp = useStore(currentOperationStore);
	const error = useStore(errorStore);
	const output = useStore(outputVideo);
	const outputMeta = useStore(outputMetadata);
	const ops = useStore(operationsList);

	// Local state
	const [activeTool, setActiveTool] = useState<ActiveTool>(null);
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const [outputUrl, setOutputUrl] = useState<string | null>(null);
	const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
	const [trimRange, setTrimRange] = useState<TrimRange | null>(null);
	const [isInitializing, setIsInitializing] = useState(false);

	// Create blob URL for output video when it's available
	useEffect(() => {
		if (output) {
			const url = URL.createObjectURL(output);
			setOutputUrl(url);
			return () => {
				URL.revokeObjectURL(url);
			};
		}
		setOutputUrl(null);
	}, [output]);

	/**
	 * Handle video upload
	 */
	const handleVideoSelect = useCallback(
		(file: File, metadata: VideoMetadata) => {
			// Revoke previous URL if exists
			if (videoUrl) {
				URL.revokeObjectURL(videoUrl);
			}

			// Create new URL for video preview
			const url = URL.createObjectURL(file);
			setVideoUrl(url);

			// Store video in state
			setVideo(file, metadata);

			// Initialize trim range to full duration
			setTrimRange({
				startTime: 0,
				endTime: metadata.duration,
			});

			// Initialize crop region to full video
			setCropRegion({
				x: 0,
				y: 0,
				width: metadata.width,
				height: metadata.height,
			});
		},
		[videoUrl],
	);

	/**
	 * Handle tool selection
	 */
	const handleToolSelect = useCallback((tool: string) => {
		setActiveTool(tool as ActiveTool);
	}, []);

	/**
	 * Handle crop apply
	 */
	const handleCropApply = useCallback(() => {
		if (!cropRegion) return;

		addOperation({
			id: `crop-${Date.now()}`,
			type: "crop",
			params: cropRegion,
			order: ops.length,
		});

		setActiveTool(null);
	}, [cropRegion, ops.length]);

	/**
	 * Handle crop cancel
	 */
	const handleCropCancel = useCallback(() => {
		// Reset crop region to full video
		if (source.metadata) {
			setCropRegion({
				x: 0,
				y: 0,
				width: source.metadata.width,
				height: source.metadata.height,
			});
		}
		setActiveTool(null);
	}, [source.metadata]);

	// Track compression settings
	const [compressionSettings, setCompressionSettings] =
		useState<CompressionSettings>({
			quality: 7,
			codec: "h264",
		});

	/**
	 * Handle compression settings change
	 */
	const handleCompressionChange = useCallback(
		(settings: CompressionSettings) => {
			setCompressionSettings(settings);
		},
		[],
	);

	/**
	 * Handle compression apply
	 */
	const handleCompressionApply = useCallback(() => {
		addOperation({
			id: `compress-${Date.now()}`,
			type: "compress",
			params: compressionSettings,
			order: ops.length,
		});

		setActiveTool(null);
	}, [compressionSettings, ops.length]);

	/**
	 * Handle trim apply
	 */
	const handleTrimApply = useCallback(() => {
		if (!trimRange) return;

		addOperation({
			id: `trim-${Date.now()}`,
			type: "trim",
			params: trimRange,
			order: ops.length,
		});

		setActiveTool(null);
	}, [trimRange, ops.length]);

	/**
	 * Handle trim cancel
	 */
	const handleTrimCancel = useCallback(() => {
		// Reset trim range to full duration
		if (source.metadata) {
			setTrimRange({
				startTime: 0,
				endTime: source.metadata.duration,
			});
		}
		setActiveTool(null);
	}, [source.metadata]);

	/**
	 * Extract metadata from a video blob
	 */
	const extractMetadata = useCallback(
		async (blob: Blob): Promise<VideoMetadata> => {
			return new Promise((resolve, reject) => {
				const video = document.createElement("video");
				const url = URL.createObjectURL(blob);

				video.onloadedmetadata = () => {
					// Determine format from blob type
					let format = "mp4";
					if (blob.type) {
						// Extract format from MIME type (e.g., "video/mp4" -> "mp4")
						const match = blob.type.match(/video\/(\w+)/);
						if (match) {
							format = match[1];
						}
					}

					// Check if video has audio (using type assertions for browser-specific properties)
					const videoWithAudio = video as HTMLVideoElementWithAudio;
					const hasAudio =
						videoWithAudio.mozHasAudio ||
						Boolean(videoWithAudio.webkitAudioDecodedByteCount) ||
						Boolean(
							videoWithAudio.audioTracks &&
								videoWithAudio.audioTracks.length > 0,
						);

					const metadata: VideoMetadata = {
						duration: video.duration,
						width: video.videoWidth,
						height: video.videoHeight,
						fileSize: blob.size,
						format,
						codec: "unknown",
						bitrate: Math.round((blob.size * 8) / video.duration), // Estimate bitrate
						fps: 0, // Cannot reliably detect FPS from video element
						hasAudio,
					};

					URL.revokeObjectURL(url);
					resolve(metadata);
				};

				video.onerror = () => {
					URL.revokeObjectURL(url);
					reject(new Error("Failed to load video metadata"));
				};

				video.src = url;
			});
		},
		[],
	);

	/**
	 * Handle process video
	 */
	const handleProcessVideo = useCallback(async () => {
		if (!source.file || ops.length === 0) {
			setError("No video or operations to process");
			return;
		}

		setIsInitializing(true);
		startProcessing();

		// Start memory monitoring (Chrome only)
		let memoryInterval: number | undefined;
		const perfWithMemory = performance as PerformanceWithMemory;
		const perfMemory = perfWithMemory.memory;
		if (perfMemory) {
			console.log("[Memory] Initial:", {
				used: `${(perfMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
				total: `${(perfMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
				limit: `${(perfMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
			});

			memoryInterval = window.setInterval(() => {
				const mem = (performance as PerformanceWithMemory).memory;
				if (mem) {
					const usedMB = (mem.usedJSHeapSize / 1024 / 1024).toFixed(2);
					const totalMB = (mem.totalJSHeapSize / 1024 / 1024).toFixed(2);
					const limitMB = (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
					const usagePercent = (
						(mem.usedJSHeapSize / mem.jsHeapSizeLimit) *
						100
					).toFixed(1);

					console.log(
						`[Memory] Used: ${usedMB} MB / ${totalMB} MB (${usagePercent}% of ${limitMB} MB limit)`,
					);
				}
			}, 1000);
		}

		try {
			// Initialize FFmpeg if not already done
			try {
				await videoProcessor.initialize();
			} catch (initError) {
				setIsInitializing(false);
				if (memoryInterval) clearInterval(memoryInterval);
				const message =
					initError instanceof Error
						? initError.message
						: "Failed to initialize video processor";
				setError(
					`FFmpeg initialization failed: ${message}. Please refresh the page and try again.`,
				);
				return;
			}

			setIsInitializing(false);

			// Set up progress callback
			videoProcessor.onProgress((progress) => {
				updateProgress(progress);
			});

			// Update current operation as we process
			for (let i = 0; i < ops.length; i++) {
				const op = ops[i];
				let opName = "";
				switch (op.type) {
					case "crop":
						opName = "Cropping video";
						break;
					case "compress":
						opName = "Compressing video";
						break;
					case "trim":
						opName = "Trimming video";
						break;
				}
				currentOperationStore.set(`${opName} (${i + 1}/${ops.length})`);
			}

			// Process all operations
			const result = await videoProcessor.processQueue(source.file, ops);

			// Stop memory monitoring
			if (memoryInterval) clearInterval(memoryInterval);

			const finalMemory = (performance as PerformanceWithMemory).memory;
			if (finalMemory) {
				console.log("[Memory] Final:", {
					used: `${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
					total: `${(finalMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
					limit: `${(finalMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
				});
			}

			// Extract metadata from processed video
			const metadata = await extractMetadata(result);

			// Complete processing with metadata
			completeProcessing(result, metadata);
			currentOperationStore.set("Processing complete");
		} catch (err) {
			setIsInitializing(false);
			if (memoryInterval) clearInterval(memoryInterval);

			const errorMemory = (performance as PerformanceWithMemory).memory;
			if (errorMemory) {
				console.log("[Memory] Error state:", {
					used: `${(errorMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
					total: `${(errorMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
					limit: `${(errorMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
				});
			}

			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";

			// Provide more helpful error messages
			let userMessage = errorMessage;
			if (errorMessage.includes("cancelled")) {
				userMessage = "Processing was cancelled";
			} else if (errorMessage.includes("memory")) {
				userMessage =
					"Insufficient memory to process video. Try with a smaller file or fewer operations.";
			} else if (errorMessage.includes("codec")) {
				userMessage =
					"Video codec not supported. Try converting to a different format first.";
			} else {
				userMessage = `Processing failed: ${errorMessage}`;
			}

			setError(userMessage);
		}
	}, [source.file, ops, extractMetadata]);

	/**
	 * Handle cancel processing
	 */
	const handleCancelProcessing = useCallback(async () => {
		try {
			await videoProcessor.cancel();
			setError("Processing cancelled by user");
		} catch (err) {
			console.error("Error cancelling processing:", err);
		}
	}, []);

	/**
	 * Handle download video
	 */
	const handleDownloadVideo = useCallback(() => {
		if (!output || !source.file) return;

		// Create filename with timestamp
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.slice(0, -5);
		const originalName = source.file.name.replace(/\.[^/.]+$/, "");
		const filename = `edited_${originalName}_${timestamp}.mp4`;

		// Create download link and clean up immediately after
		const url = URL.createObjectURL(output);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		// Clean up blob URL after a short delay to ensure download starts
		setTimeout(() => {
			URL.revokeObjectURL(url);
		}, 100);
	}, [output, source.file]);

	/**
	 * Handle reset editor
	 */
	const handleResetEditor = useCallback(() => {
		// Revoke video URL
		if (videoUrl) {
			URL.revokeObjectURL(videoUrl);
		}
		setVideoUrl(null);

		// Reset all local state
		setActiveTool(null);
		setCropRegion(null);
		setTrimRange(null);
		setCompressionSettings({ quality: 7, codec: "h264" });

		// Reset store
		resetEditor();
	}, [videoUrl]);

	/**
	 * Cleanup on unmount - revoke all object URLs and clear state
	 */

	// biome-ignore lint/correctness/useExhaustiveDependencies: Only run on mount/unmount
	useEffect(() => {
		return () => {
			// Revoke video URL if exists
			if (videoUrl) {
				URL.revokeObjectURL(videoUrl);
			}

			// Clear any output video blob references
			// The store will handle its own cleanup
			resetEditor();
		};
	}, []);

	/**
	 * Handle dismiss error
	 */
	const handleDismissError = useCallback(() => {
		errorStore.set(null);
	}, []);

	return (
		<div className="flex flex-col h-screen">
			{/* Header */}
			<div className="shrink-0 border-b border-divider">
				<div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-nav">
					<div className="flex items-center gap-3">
						<img src="/logo.png" alt="Logo" className="w-8 h-8" />
						<h1 className="text-lg md:text-xl font-bold">Video Editor</h1>
						{source.file && (
							<span className="text-xs text-default-500 hidden sm:inline truncate max-w-xs">
								{source.file.name}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						{hasOps && !processing && !output && (
							<span className="text-xs text-default-500">
								{ops.length} operation{ops.length !== 1 ? "s" : ""}
							</span>
						)}
						<ThemeSwitch />
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 overflow-y-auto">
				<div className="container mx-auto px-4 py-4 max-w-content">
					{/* Error Display */}
					{error && (
						<Card className="mb-4 border-2 border-danger">
							<CardBody className="p-3">
								<div className="flex items-start gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
										className="w-5 h-5 text-danger shrink-0"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
										/>
									</svg>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-danger-600 wrap-break-word">
											{error}
										</p>
									</div>
									<Button
										isIconOnly
										size="sm"
										variant="light"
										onPress={handleDismissError}
										aria-label="Dismiss error"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth={2}
											stroke="currentColor"
											className="w-4 h-4"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</Button>
								</div>
							</CardBody>
						</Card>
					)}

					{/* Welcome Header */}
					{!source.file && (
						<header className="flex flex-col text-center mb-8 mt-8 items-center">
							<img
								src="/logo.png"
								alt="Video Utilities - Free Online Video Editor"
								className="w-32 h-32"
								width="128"
								height="128"
							/>
							<h1 className="text-3xl md:text-4xl font-bold mb-3">
								Free Online Video Editor
							</h1>
							<p className="text-default-600 text-base md:text-lg max-w-2xl mx-auto">
								Edit your videos directly in your browser with powerful tools.
								Crop, compress and trim videos without uploading to any server.
								100% free and privacy-focused.
							</p>
							<p className="text-default-500 text-sm mt-2">
								All processing happens locally on your device for maximum
								privacy and speed. No registration required.
							</p>
						</header>
					)}

					{/* Video Upload */}
					{!source.file && (
						<>
							<div className="flex items-center justify-center py-12">
								<div className="w-full max-w-2xl">
									<VideoUpload onVideoSelect={handleVideoSelect} />
								</div>
							</div>

							{/* Feature Cards */}
							<section
								className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8"
								aria-label="Video editing features"
							>
								<Card className="border border-divider">
									<CardBody className="p-6 flex flex-col items-center text-center">
										<div
											className="w-10 h-10 mb-3 flex items-center justify-center"
											aria-hidden="true"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2}
												stroke="currentColor"
												className="w-6 h-6 text-primary"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"
												/>
											</svg>
										</div>
										<h3 className="font-semibold text-sm mb-1">
											Crop & Resize Videos
										</h3>
										<p className="text-xs text-default-500">
											Extract specific regions from your videos
										</p>
									</CardBody>
								</Card>

								<Card className="border border-divider">
									<CardBody className="p-6 flex flex-col items-center text-center">
										<div
											className="w-10 h-10 mb-3 flex items-center justify-center"
											aria-hidden="true"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2}
												stroke="currentColor"
												className="w-6 h-6 text-warning"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
												/>
											</svg>
										</div>
										<h3 className="font-semibold text-sm mb-1">
											Compress Videos
										</h3>
										<p className="text-xs text-default-500">
											Reduce file size with H.264/H.265
										</p>
									</CardBody>
								</Card>

								<Card className="border border-divider">
									<CardBody className="p-6 flex flex-col items-center text-center">
										<div
											className="w-10 h-10 mb-3 flex items-center justify-center"
											aria-hidden="true"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2}
												stroke="currentColor"
												className="w-6 h-6 text-secondary"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75"
												/>
											</svg>
										</div>
										<h3 className="font-semibold text-sm mb-1">Trim Videos</h3>
										<p className="text-xs text-default-500">
											Cut videos to specific time ranges
										</p>
									</CardBody>
								</Card>
							</section>

							{/* Additional Info Cards */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
								<Card className="border border-divider bg-success-50/50 dark:bg-success-50/5">
									<CardBody className="p-4 flex flex-row items-center gap-3">
										<div className="shrink-0">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2}
												stroke="currentColor"
												className="w-8 h-8 text-success"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
												/>
											</svg>
										</div>
										<div className="flex-1 min-w-0">
											<h3 className="font-semibold text-sm mb-1 text-success-800 dark:text-success-500">
												100% Private
											</h3>
											<p className="text-xs text-success-700 dark:text-success-400">
												Your videos never leave your device. All processing
												happens locally in your browser.
											</p>
										</div>
									</CardBody>
								</Card>

								<Card className="border border-divider bg-primary-50/50 dark:bg-primary-50/5">
									<CardBody className="p-4 flex flex-row items-center gap-3">
										<div className="shrink-0">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2}
												stroke="currentColor"
												className="w-8 h-8 text-primary"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
												/>
											</svg>
										</div>
										<div className="flex-1 min-w-0">
											<h3 className="font-semibold text-sm mb-1 text-primary-800 dark:text-primary-500">
												No Server Required
											</h3>
											<p className="text-xs text-primary-700 dark:text-primary-400">
												Powered by FFmpeg.wasm for fast, client-side video
												processing.
											</p>
										</div>
									</CardBody>
								</Card>
							</div>
						</>
					)}

					{/* Video Preview */}
					{source.file && videoUrl && !output && (
						<VideoPreview
							videoUrl={videoUrl}
							metadata={source.metadata || undefined}
							cropRegion={
								activeTool === "crop" ? cropRegion || undefined : undefined
							}
							onCropChange={activeTool === "crop" ? setCropRegion : undefined}
						/>
					)}

					{/* Output Video Preview */}
					{output && !processing && outputUrl && (
						<div className="mt-4">
							<VideoPreview
								videoUrl={outputUrl}
								metadata={outputMeta || undefined}
							/>
						</div>
					)}

					{/* Active Tool Component */}
					{source.file && source.metadata && !processing && !output && (
						<div className="mt-4">
							{activeTool === "crop" && cropRegion && (
								<CropTool
									videoWidth={source.metadata.width}
									videoHeight={source.metadata.height}
									currentCrop={cropRegion}
									onCropUpdate={setCropRegion}
									onApply={handleCropApply}
									onCancel={handleCropCancel}
								/>
							)}

							{activeTool === "compress" && (
								<CompressionTool
									originalSize={source.metadata.fileSize}
									originalBitrate={source.metadata.bitrate}
									duration={source.metadata.duration}
									onCompressionChange={handleCompressionChange}
									onApply={handleCompressionApply}
									onCancel={() => setActiveTool(null)}
								/>
							)}

							{activeTool === "trim" && trimRange && (
								<TrimTool
									duration={source.metadata.duration}
									currentRange={trimRange}
									onRangeChange={setTrimRange}
									onApply={handleTrimApply}
									onCancel={handleTrimCancel}
								/>
							)}
						</div>
					)}

					{/* FFmpeg Initialization Progress */}
					{isInitializing && !processing && (
						<Card className="mt-4">
							<CardBody className="p-4">
								<div className="flex flex-col items-center gap-3">
									<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
									<div className="text-center">
										<h3 className="text-sm font-semibold mb-1">
											Initializing Video Processor
										</h3>
										<p className="text-xs text-default-600">
											Loading FFmpeg.wasm...
										</p>
									</div>
								</div>
							</CardBody>
						</Card>
					)}

					{/* Processing Progress */}
					{processing && (
						<div className="mt-4">
							<ProcessingProgress
								progress={progress}
								currentOperation={currentOp}
								onCancel={handleCancelProcessing}
							/>
						</div>
					)}

					{/* Output Video Actions */}
					{output && !processing && (
						<Card className="mt-4">
							<CardBody className="gap-3 p-3">
								<div className="flex items-center gap-2 text-success">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
										className="w-5 h-5 shrink-0"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span className="text-sm font-semibold">
										Video processed successfully!
									</span>
								</div>
								<div className="flex flex-col sm:flex-row gap-2">
									<Button
										color="primary"
										size="lg"
										onPress={handleDownloadVideo}
										className="flex-1"
									>
										Download Video
									</Button>
									<Button
										color="default"
										variant="bordered"
										size="lg"
										onPress={handleResetEditor}
										className="flex-1"
									>
										Start New Edit
									</Button>
								</div>
							</CardBody>
						</Card>
					)}

					{/* Operations Queue - Inline */}
					{source.file && hasOps && !processing && !output && (
						<div className="mt-4">
							<OperationsQueue />
						</div>
					)}
				</div>
			</div>

			{/* Fixed Bottom Toolbar */}
			{source.file && !processing && !output && (
				<div className="shrink-0 border-t border-divider bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
					<div className="container mx-auto px-4 py-3 max-w-nav">
						<div className="flex items-center justify-between gap-3">
							<div className="flex gap-2 flex-1 overflow-x-auto">
								<Button
									color={activeTool === "crop" ? "primary" : "default"}
									variant={activeTool === "crop" ? "solid" : "bordered"}
									onPress={() => handleToolSelect("crop")}
									size="sm"
								>
									Crop
								</Button>
								<Button
									color={activeTool === "compress" ? "primary" : "default"}
									variant={activeTool === "compress" ? "solid" : "bordered"}
									onPress={() => handleToolSelect("compress")}
									size="sm"
								>
									Compress
								</Button>
								<Button
									color={activeTool === "trim" ? "primary" : "default"}
									variant={activeTool === "trim" ? "solid" : "bordered"}
									onPress={() => handleToolSelect("trim")}
									size="sm"
								>
									Trim
								</Button>
							</div>
							<Button
								color="primary"
								onPress={handleProcessVideo}
								isLoading={isInitializing}
								isDisabled={!hasOps}
								size="lg"
								className="shrink-0"
							>
								{isInitializing ? "Initializing..." : "Process"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
