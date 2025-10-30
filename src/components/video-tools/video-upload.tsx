/**
 * Video Upload Component
 *
 * Handles video file selection with drag-and-drop support, file validation,
 * and metadata extraction using HTML5 video element.
 */

import { Card, CardBody } from "@heroui/card";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import type { VideoMetadata } from "../../types/video-tools";

export interface VideoUploadProps {
	/** Callback when a valid video is selected */
	onVideoSelect: (file: File, metadata: VideoMetadata) => void;
	/** Maximum file size in bytes (default: 500MB) */
	maxFileSize?: number;
	/** Accepted video formats (default: common video formats) */
	acceptedFormats?: string[];
}

const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const DEFAULT_ACCEPTED_FORMATS = [
	"video/mp4",
	"video/webm",
	"video/quicktime",
	"video/x-msvideo",
];

export function VideoUpload({
	onVideoSelect,
	maxFileSize = DEFAULT_MAX_FILE_SIZE,
	acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
}: VideoUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	/**
	 * Validate file size and format
	 */
	const validateFile = (file: File): string | null => {
		// Check file size
		if (file.size > maxFileSize) {
			return "File size must be below 500 MB";
		}

		// Check file format
		if (!acceptedFormats.includes(file.type)) {
			return `Unsupported format. Please upload ${acceptedFormats.map((f) => f.split("/")[1].toUpperCase()).join(", ")} files`;
		}

		return null;
	};

	/**
	 * Extract video metadata using HTML5 video element
	 */
	const extractMetadata = (file: File): Promise<VideoMetadata> => {
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			const url = URL.createObjectURL(file);

			video.preload = "metadata";
			video.src = url;

			video.onloadedmetadata = () => {
				// Extract format from file type
				const format = file.type.split("/")[1] || "unknown";

				// Create audio context to check for audio track
				const hasAudio = true; // Simplified - actual detection would require more complex logic

				const metadata: VideoMetadata = {
					duration: video.duration,
					width: video.videoWidth,
					height: video.videoHeight,
					fileSize: file.size,
					format,
					codec: "unknown", // Would require more complex detection
					bitrate: Math.round((file.size * 8) / video.duration), // Estimated
					fps: 30, // Default assumption - actual detection requires more complex logic
					hasAudio,
				};

				URL.revokeObjectURL(url);
				resolve(metadata);
			};

			video.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error("Failed to load video metadata"));
			};
		});
	};

	/**
	 * Process selected file
	 */
	const processFile = async (file: File) => {
		setError(null);
		setIsProcessing(true);

		// Validate file
		const validationError = validateFile(file);
		if (validationError) {
			setError(validationError);
			setIsProcessing(false);
			return;
		}

		try {
			// Extract metadata
			const metadata = await extractMetadata(file);
			onVideoSelect(file, metadata);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to process video file",
			);
		} finally {
			setIsProcessing(false);
		}
	};

	/**
	 * Handle file input change
	 */
	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			processFile(file);
		}
	};

	/**
	 * Handle drag over event
	 */
	const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true);
	};

	/**
	 * Handle drag leave event
	 */
	const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
	};

	/**
	 * Handle drop event
	 */
	const handleDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);

		const file = event.dataTransfer.files[0];
		if (file) {
			processFile(file);
		}
	};

	/**
	 * Handle click to open file dialog
	 */
	const handleClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<Card
			className={`w-full transition-colors ${isDragging ? "border-primary border-2" : "border-default-200 border-2"}`}
		>
			<CardBody className="p-3 md:p-4">
				<div
					className="flex flex-col items-center justify-center p-4 md:p-8"
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept={acceptedFormats.join(",")}
						onChange={handleFileChange}
						className="hidden"
						aria-label="Select video file"
					/>

					{isProcessing ? (
						<div className="text-center">
							<div className="mb-2 text-base md:text-lg font-semibold">
								Processing...
							</div>
							<div className="text-xs md:text-sm text-default-500">
								Extracting video metadata
							</div>
						</div>
					) : (
						<>
							<svg
								className="w-12 h-12 md:w-16 md:h-16 mb-3 md:mb-4 text-default-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
							<div className="mb-2 text-base md:text-lg font-semibold">
								{isDragging ? "Drop video here" : "Upload Video"}
							</div>
							<div className="text-xs md:text-sm text-default-500 text-center px-2">
								Drag and drop a video file here, or{" "}
								<button
									type="button"
									onClick={handleClick}
									className="text-primary underline hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded min-h-[44px] md:min-h-0 inline-flex items-center"
								>
									click to select
								</button>
							</div>
							<div className="mt-2 text-xs text-default-400 text-center">
								Supports MP4, WebM, MOV, AVI (max 500 MB)
							</div>
						</>
					)}

					{error && (
						<div
							className="mt-3 md:mt-4 p-2 md:p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-xs md:text-sm wrap-break-word"
							role="alert"
						>
							{error}
						</div>
					)}
				</div>
			</CardBody>
		</Card>
	);
}
