/**
 * Video Preview Component
 *
 * Displays video with playback controls, canvas overlay for visual effects,
 * and support for crop region visualization and side-by-side comparison.
 */

import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Slider } from "@heroui/slider";
import {
	type MouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { CropRegion, VideoMetadata } from "../../types/video-tools";

export interface VideoPreviewProps {
	/** URL of the video to preview */
	videoUrl: string;
	/** Video metadata for display */
	metadata?: VideoMetadata;
	/** Optional crop region to visualize */
	cropRegion?: CropRegion;
	/** Callback when crop region changes */
	onCropChange?: (region: CropRegion) => void;
	/** Whether to show side-by-side comparison mode */
	showComparison?: boolean;
	/** URL of the comparison video (for side-by-side mode) */
	comparisonVideoUrl?: string;
}

type DragHandle =
	| "move"
	| "nw"
	| "ne"
	| "sw"
	| "se"
	| "n"
	| "s"
	| "e"
	| "w"
	| null;

export function VideoPreview({
	videoUrl,
	metadata,
	cropRegion,
	onCropChange,
	showComparison = false,
	comparisonVideoUrl,
}: VideoPreviewProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const comparisonVideoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);

	// Crop region drag state
	const [isDragging, setIsDragging] = useState(false);
	const [dragHandle, setDragHandle] = useState<DragHandle>(null);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [cropStart, setCropStart] = useState<CropRegion | null>(null);

	/**
	 * Format time in MM:SS format
	 */
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	/**
	 * Handle play/pause toggle
	 */
	const togglePlayPause = useCallback(() => {
		if (!videoRef.current) return;

		if (isPlaying) {
			videoRef.current.pause();
			if (showComparison && comparisonVideoRef.current) {
				comparisonVideoRef.current.pause();
			}
		} else {
			videoRef.current.play();
			if (showComparison && comparisonVideoRef.current) {
				comparisonVideoRef.current.play();
			}
		}
		setIsPlaying(!isPlaying);
	}, [isPlaying, showComparison]);

	// Ref for throttling time updates
	const lastTimeUpdateRef = useRef<number>(0);

	/**
	 * Handle time update (throttled to 60fps)
	 */
	const handleTimeUpdate = useCallback(() => {
		if (!videoRef.current) return;

		const now = Date.now();
		// Throttle to ~60fps (16ms)
		if (now - lastTimeUpdateRef.current < 16) return;

		lastTimeUpdateRef.current = now;
		setCurrentTime(videoRef.current.currentTime);
	}, []);

	/**
	 * Handle loaded metadata
	 */
	const handleLoadedMetadata = useCallback(() => {
		if (!videoRef.current) return;
		setDuration(videoRef.current.duration);
	}, []);

	/**
	 * Handle seek
	 */
	const handleSeek = useCallback(
		(value: number | number[]) => {
			const time = Array.isArray(value) ? value[0] : value;
			if (!videoRef.current) return;

			videoRef.current.currentTime = time;
			if (showComparison && comparisonVideoRef.current) {
				comparisonVideoRef.current.currentTime = time;
			}
			setCurrentTime(time);
		},
		[showComparison],
	);

	/**
	 * Handle volume change
	 */
	const handleVolumeChange = useCallback((value: number | number[]) => {
		const vol = Array.isArray(value) ? value[0] : value;
		if (!videoRef.current) return;

		videoRef.current.volume = vol;
		if (comparisonVideoRef.current) {
			comparisonVideoRef.current.volume = vol;
		}
		setVolume(vol);
		setIsMuted(vol === 0);
	}, []);

	/**
	 * Toggle mute
	 */
	const toggleMute = useCallback(() => {
		if (!videoRef.current) return;

		const newMuted = !isMuted;
		videoRef.current.muted = newMuted;
		if (comparisonVideoRef.current) {
			comparisonVideoRef.current.muted = newMuted;
		}
		setIsMuted(newMuted);
	}, [isMuted]);

	// Ref for optimizing canvas rendering
	const animationFrameRef = useRef<number | null>(null);

	/**
	 * Draw crop region on canvas (optimized with requestAnimationFrame)
	 */
	const drawCropRegion = useCallback(() => {
		if (!canvasRef.current || !cropRegion || !videoRef.current) return;

		// Cancel any pending animation frame
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}

		// Schedule the draw on the next animation frame
		animationFrameRef.current = requestAnimationFrame(() => {
			if (!canvasRef.current || !cropRegion || !videoRef.current) return;

			const canvas = canvasRef.current;
			const ctx = canvas.getContext("2d", { alpha: true });
			if (!ctx) return;

			// Clear canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Get video display dimensions
			const video = videoRef.current;
			const scaleX = canvas.width / video.videoWidth;
			const scaleY = canvas.height / video.videoHeight;

			// Scale crop region to canvas coordinates
			const scaledCrop = {
				x: cropRegion.x * scaleX,
				y: cropRegion.y * scaleY,
				width: cropRegion.width * scaleX,
				height: cropRegion.height * scaleY,
			};

			// Draw semi-transparent overlay outside crop region
			ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
			ctx.fillRect(0, 0, canvas.width, scaledCrop.y);
			ctx.fillRect(0, scaledCrop.y, scaledCrop.x, scaledCrop.height);
			ctx.fillRect(
				scaledCrop.x + scaledCrop.width,
				scaledCrop.y,
				canvas.width - (scaledCrop.x + scaledCrop.width),
				scaledCrop.height,
			);
			ctx.fillRect(
				0,
				scaledCrop.y + scaledCrop.height,
				canvas.width,
				canvas.height - (scaledCrop.y + scaledCrop.height),
			);

			// Draw crop region border
			ctx.strokeStyle = "#3b82f6";
			ctx.lineWidth = 2;
			ctx.strokeRect(
				scaledCrop.x,
				scaledCrop.y,
				scaledCrop.width,
				scaledCrop.height,
			);

			// Draw resize handles
			const handleSize = 10;
			ctx.fillStyle = "#3b82f6";

			// Corner handles
			ctx.fillRect(
				scaledCrop.x - handleSize / 2,
				scaledCrop.y - handleSize / 2,
				handleSize,
				handleSize,
			);
			ctx.fillRect(
				scaledCrop.x + scaledCrop.width - handleSize / 2,
				scaledCrop.y - handleSize / 2,
				handleSize,
				handleSize,
			);
			ctx.fillRect(
				scaledCrop.x - handleSize / 2,
				scaledCrop.y + scaledCrop.height - handleSize / 2,
				handleSize,
				handleSize,
			);
			ctx.fillRect(
				scaledCrop.x + scaledCrop.width - handleSize / 2,
				scaledCrop.y + scaledCrop.height - handleSize / 2,
				handleSize,
				handleSize,
			);

			// Edge handles
			ctx.fillRect(
				scaledCrop.x + scaledCrop.width / 2 - handleSize / 2,
				scaledCrop.y - handleSize / 2,
				handleSize,
				handleSize,
			);
			ctx.fillRect(
				scaledCrop.x + scaledCrop.width / 2 - handleSize / 2,
				scaledCrop.y + scaledCrop.height - handleSize / 2,
				handleSize,
				handleSize,
			);
			ctx.fillRect(
				scaledCrop.x - handleSize / 2,
				scaledCrop.y + scaledCrop.height / 2 - handleSize / 2,
				handleSize,
				handleSize,
			);
			ctx.fillRect(
				scaledCrop.x + scaledCrop.width - handleSize / 2,
				scaledCrop.y + scaledCrop.height / 2 - handleSize / 2,
				handleSize,
				handleSize,
			);

			// Draw dimensions label
			ctx.fillStyle = "#3b82f6";
			ctx.fillRect(scaledCrop.x, scaledCrop.y - 25, 120, 20);
			ctx.fillStyle = "#ffffff";
			ctx.font = "12px sans-serif";
			ctx.fillText(
				`${cropRegion.width} × ${cropRegion.height}`,
				scaledCrop.x + 5,
				scaledCrop.y - 10,
			);
		});
	}, [cropRegion]);

	/**
	 * Get drag handle at position
	 */
	const getDragHandle = useCallback(
		(x: number, y: number): DragHandle => {
			if (!cropRegion || !videoRef.current || !canvasRef.current) return null;

			const canvas = canvasRef.current;
			const video = videoRef.current;
			const scaleX = canvas.width / video.videoWidth;
			const scaleY = canvas.height / video.videoHeight;

			const scaledCrop = {
				x: cropRegion.x * scaleX,
				y: cropRegion.y * scaleY,
				width: cropRegion.width * scaleX,
				height: cropRegion.height * scaleY,
			};

			const handleSize = 10;
			const tolerance = 5;

			// Check corner handles
			if (
				Math.abs(x - scaledCrop.x) < handleSize + tolerance &&
				Math.abs(y - scaledCrop.y) < handleSize + tolerance
			) {
				return "nw";
			}
			if (
				Math.abs(x - (scaledCrop.x + scaledCrop.width)) <
					handleSize + tolerance &&
				Math.abs(y - scaledCrop.y) < handleSize + tolerance
			) {
				return "ne";
			}
			if (
				Math.abs(x - scaledCrop.x) < handleSize + tolerance &&
				Math.abs(y - (scaledCrop.y + scaledCrop.height)) <
					handleSize + tolerance
			) {
				return "sw";
			}
			if (
				Math.abs(x - (scaledCrop.x + scaledCrop.width)) <
					handleSize + tolerance &&
				Math.abs(y - (scaledCrop.y + scaledCrop.height)) <
					handleSize + tolerance
			) {
				return "se";
			}

			// Check edge handles
			if (
				Math.abs(x - (scaledCrop.x + scaledCrop.width / 2)) <
					handleSize + tolerance &&
				Math.abs(y - scaledCrop.y) < handleSize + tolerance
			) {
				return "n";
			}
			if (
				Math.abs(x - (scaledCrop.x + scaledCrop.width / 2)) <
					handleSize + tolerance &&
				Math.abs(y - (scaledCrop.y + scaledCrop.height)) <
					handleSize + tolerance
			) {
				return "s";
			}
			if (
				Math.abs(x - scaledCrop.x) < handleSize + tolerance &&
				Math.abs(y - (scaledCrop.y + scaledCrop.height / 2)) <
					handleSize + tolerance
			) {
				return "w";
			}
			if (
				Math.abs(x - (scaledCrop.x + scaledCrop.width)) <
					handleSize + tolerance &&
				Math.abs(y - (scaledCrop.y + scaledCrop.height / 2)) <
					handleSize + tolerance
			) {
				return "e";
			}

			// Check if inside crop region (for move)
			if (
				x >= scaledCrop.x &&
				x <= scaledCrop.x + scaledCrop.width &&
				y >= scaledCrop.y &&
				y <= scaledCrop.y + scaledCrop.height
			) {
				return "move";
			}

			return null;
		},
		[cropRegion],
	);

	/**
	 * Handle mouse down on canvas
	 */
	const handleCanvasMouseDown = useCallback(
		(e: MouseEvent<HTMLCanvasElement>) => {
			if (!cropRegion || !onCropChange || !canvasRef.current) return;

			const canvas = canvasRef.current;
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			const handle = getDragHandle(x, y);
			if (handle) {
				setIsDragging(true);
				setDragHandle(handle);
				setDragStart({ x, y });
				setCropStart(cropRegion);
			}
		},
		[cropRegion, onCropChange, getDragHandle],
	);

	// Ref to store the latest crop region for debouncing
	const pendingCropRef = useRef<CropRegion | null>(null);
	const cropUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

	/**
	 * Debounced crop change handler
	 * Updates the crop region immediately for visual feedback,
	 * but debounces the callback to parent component
	 */
	const debouncedCropChange = useCallback(
		(newCrop: CropRegion) => {
			// Store the pending crop
			pendingCropRef.current = newCrop;

			// Clear existing timer
			if (cropUpdateTimerRef.current) {
				clearTimeout(cropUpdateTimerRef.current);
			}

			// Set new timer to call parent callback after 50ms
			cropUpdateTimerRef.current = setTimeout(() => {
				if (pendingCropRef.current && onCropChange) {
					onCropChange(pendingCropRef.current);
				}
			}, 50);
		},
		[onCropChange],
	);

	/**
	 * Handle mouse move on canvas
	 */
	const handleCanvasMouseMove = useCallback(
		(e: MouseEvent<HTMLCanvasElement>) => {
			if (
				!isDragging ||
				!cropStart ||
				!onCropChange ||
				!videoRef.current ||
				!canvasRef.current
			)
				return;

			const canvas = canvasRef.current;
			const video = videoRef.current;
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			const dx = x - dragStart.x;
			const dy = y - dragStart.y;

			const scaleX = video.videoWidth / canvas.width;
			const scaleY = video.videoHeight / canvas.height;

			const newCrop = { ...cropStart };

			switch (dragHandle) {
				case "move":
					newCrop.x = Math.max(
						0,
						Math.min(
							video.videoWidth - cropStart.width,
							cropStart.x + dx * scaleX,
						),
					);
					newCrop.y = Math.max(
						0,
						Math.min(
							video.videoHeight - cropStart.height,
							cropStart.y + dy * scaleY,
						),
					);
					break;
				case "nw":
					newCrop.x = Math.max(0, cropStart.x + dx * scaleX);
					newCrop.y = Math.max(0, cropStart.y + dy * scaleY);
					newCrop.width = cropStart.width - dx * scaleX;
					newCrop.height = cropStart.height - dy * scaleY;
					break;
				case "ne":
					newCrop.y = Math.max(0, cropStart.y + dy * scaleY);
					newCrop.width = cropStart.width + dx * scaleX;
					newCrop.height = cropStart.height - dy * scaleY;
					break;
				case "sw":
					newCrop.x = Math.max(0, cropStart.x + dx * scaleX);
					newCrop.width = cropStart.width - dx * scaleX;
					newCrop.height = cropStart.height + dy * scaleY;
					break;
				case "se":
					newCrop.width = cropStart.width + dx * scaleX;
					newCrop.height = cropStart.height + dy * scaleY;
					break;
				case "n":
					newCrop.y = Math.max(0, cropStart.y + dy * scaleY);
					newCrop.height = cropStart.height - dy * scaleY;
					break;
				case "s":
					newCrop.height = cropStart.height + dy * scaleY;
					break;
				case "w":
					newCrop.x = Math.max(0, cropStart.x + dx * scaleX);
					newCrop.width = cropStart.width - dx * scaleX;
					break;
				case "e":
					newCrop.width = cropStart.width + dx * scaleX;
					break;
			}

			// Ensure minimum size
			if (newCrop.width < 50) newCrop.width = 50;
			if (newCrop.height < 50) newCrop.height = 50;

			// Ensure within bounds
			if (newCrop.x + newCrop.width > video.videoWidth) {
				newCrop.width = video.videoWidth - newCrop.x;
			}
			if (newCrop.y + newCrop.height > video.videoHeight) {
				newCrop.height = video.videoHeight - newCrop.y;
			}

			// Use debounced update
			debouncedCropChange(newCrop);
		},
		[
			isDragging,
			cropStart,
			dragStart,
			dragHandle,
			onCropChange,
			debouncedCropChange,
		],
	);

	/**
	 * Handle mouse up
	 */
	const handleCanvasMouseUp = useCallback(() => {
		setIsDragging(false);
		setDragHandle(null);
		setCropStart(null);
	}, []);

	/**
	 * Update canvas size to match video
	 */
	useEffect(() => {
		if (!videoRef.current || !canvasRef.current) return;

		const updateCanvasSize = () => {
			if (!videoRef.current || !canvasRef.current) return;
			const video = videoRef.current;
			const canvas = canvasRef.current;

			canvas.width = video.clientWidth;
			canvas.height = video.clientHeight;
			drawCropRegion();
		};

		updateCanvasSize();
		window.addEventListener("resize", updateCanvasSize);

		return () => {
			window.removeEventListener("resize", updateCanvasSize);

			// Clean up canvas context
			if (canvasRef.current) {
				const ctx = canvasRef.current.getContext("2d");
				if (ctx) {
					ctx.clearRect(
						0,
						0,
						canvasRef.current.width,
						canvasRef.current.height,
					);
				}
			}
		};
	}, [drawCropRegion]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Redraw crop region when it changes
	useEffect(() => {
		drawCropRegion();
	}, [cropRegion, drawCropRegion]);

	/**
	 * Cleanup on unmount
	 */
	useEffect(() => {
		return () => {
			// Cancel any pending animation frames
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}

			// Clear any pending crop update timers
			if (cropUpdateTimerRef.current) {
				clearTimeout(cropUpdateTimerRef.current);
			}

			// Pause videos to release resources
			if (videoRef.current) {
				videoRef.current.pause();
				videoRef.current.src = "";
				videoRef.current.load();
			}
			if (comparisonVideoRef.current) {
				comparisonVideoRef.current.pause();
				comparisonVideoRef.current.src = "";
				comparisonVideoRef.current.load();
			}
		};
	}, []);

	return (
		<Card className="w-full">
			<CardBody className="p-3 md:p-4">
				<div className="space-y-3 md:space-y-4">
					{/* Video Preview Area */}
					<div
						ref={containerRef}
						className={`relative ${showComparison ? "grid grid-cols-2 gap-4" : ""}`}
					>
						{/* Main Video */}
						<div className="relative">
							<video
								ref={videoRef}
								src={videoUrl}
								preload="metadata"
								className="w-full rounded-lg bg-black"
								onTimeUpdate={handleTimeUpdate}
								onLoadedMetadata={handleLoadedMetadata}
								onEnded={() => setIsPlaying(false)}
							/>
							{cropRegion && onCropChange && (
								<canvas
									ref={canvasRef}
									className="absolute top-0 left-0 w-full h-full cursor-move"
									onMouseDown={handleCanvasMouseDown}
									onMouseMove={handleCanvasMouseMove}
									onMouseUp={handleCanvasMouseUp}
									onMouseLeave={handleCanvasMouseUp}
								/>
							)}
						</div>

						{/* Comparison Video */}
						{showComparison && comparisonVideoUrl && (
							<div className="relative">
								<video
									ref={comparisonVideoRef}
									src={comparisonVideoUrl}
									className="w-full rounded-lg bg-black"
								/>
								<div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
									Preview
								</div>
							</div>
						)}
					</div>

					{/* Playback Controls */}
					<div className="space-y-2 md:space-y-3">
						{/* Timeline */}
						<Slider
							aria-label="Video timeline"
							size="sm"
							step={0.1}
							maxValue={duration || 100}
							minValue={0}
							value={currentTime}
							onChange={handleSeek}
							className="w-full"
						/>

						{/* Control Buttons */}
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-1 md:gap-2">
								<Button
									isIconOnly
									size="sm"
									variant="flat"
									onPress={togglePlayPause}
									aria-label={isPlaying ? "Pause" : "Play"}
									className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
								>
									{isPlaying ? (
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
												clipRule="evenodd"
											/>
										</svg>
									) : (
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
												clipRule="evenodd"
											/>
										</svg>
									)}
								</Button>

								<span className="text-xs md:text-sm text-default-600 whitespace-nowrap">
									{formatTime(currentTime)} / {formatTime(duration)}
								</span>
							</div>

							<div className="flex items-center gap-1 md:gap-2">
								<Button
									isIconOnly
									size="sm"
									variant="flat"
									onPress={toggleMute}
									aria-label={isMuted ? "Unmute" : "Mute"}
									className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
								>
									{isMuted ? (
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
												clipRule="evenodd"
											/>
										</svg>
									) : (
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
												clipRule="evenodd"
											/>
										</svg>
									)}
								</Button>

								<Slider
									aria-label="Volume"
									size="sm"
									step={0.01}
									maxValue={1}
									minValue={0}
									value={volume}
									onChange={handleVolumeChange}
									className="w-16 md:w-20 hidden sm:block"
								/>
							</div>
						</div>
					</div>

					{/* Video Metadata */}
					{metadata && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm">
							<div className="truncate">
								<span className="text-default-500">Duration:</span>{" "}
								<span className="font-medium">
									{formatTime(metadata.duration)}
								</span>
							</div>
							<div className="truncate">
								<span className="text-default-500">Resolution:</span>{" "}
								<span className="font-medium">
									{metadata.width} × {metadata.height}
								</span>
							</div>
							<div className="truncate">
								<span className="text-default-500">Size:</span>{" "}
								<span className="font-medium">
									{(metadata.fileSize / (1024 * 1024)).toFixed(2)} MB
								</span>
							</div>
							<div className="truncate">
								<span className="text-default-500">Format:</span>{" "}
								<span className="font-medium">
									{metadata.format.toUpperCase()}
								</span>
							</div>
						</div>
					)}
				</div>
			</CardBody>
		</Card>
	);
}
