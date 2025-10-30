/**
 * Video Tools Type Definitions
 *
 * This file contains all TypeScript type definitions for the video tools feature,
 * including data models for video metadata, editing operations, and processing state.
 */

/**
 * Metadata extracted from a video file
 */
export interface VideoMetadata {
	/** Video duration in seconds */
	duration: number;
	/** Video width in pixels */
	width: number;
	/** Video height in pixels */
	height: number;
	/** File size in bytes */
	fileSize: number;
	/** Video format (e.g., 'mp4', 'webm', 'mov') */
	format: string;
	/** Video codec (e.g., 'h264', 'vp9') */
	codec: string;
	/** Video bitrate in bits per second */
	bitrate: number;
	/** Frames per second */
	fps: number;
	/** Whether the video has an audio track */
	hasAudio: boolean;
}

/**
 * Rectangular region for cropping video
 */
export interface CropRegion {
	/** X coordinate from left edge in pixels */
	x: number;
	/** Y coordinate from top edge in pixels */
	y: number;
	/** Width of crop region in pixels */
	width: number;
	/** Height of crop region in pixels */
	height: number;
}

/**
 * Time range for trimming video
 */
export interface TrimRange {
	/** Start time in seconds */
	startTime: number;
	/** End time in seconds */
	endTime: number;
}

/**
 * Settings for video compression
 */
export interface CompressionSettings {
	/** Quality level from 1 (lowest) to 10 (highest) */
	quality: number;
	/** Target bitrate in bits per second (optional) */
	targetBitrate?: number;
	/** Video codec to use */
	codec: "h264" | "h265";
	/** Optional width for resolution scaling */
	scaleWidth?: number;
	/** Optional height for resolution scaling */
	scaleHeight?: number;
}

/**
 * Type of video operation
 */
export type VideoOperationType = "crop" | "compress" | "trim";

/**
 * Video operation to be applied
 */
export interface VideoOperation {
	/** Unique identifier for the operation */
	id: string;
	/** Type of operation */
	type: VideoOperationType;
	/** Operation parameters (varies by type) */
	params: CropRegion | CompressionSettings | TrimRange;
	/** Order in which operation should be applied */
	order: number;
}

/**
 * Error information for video tools
 */
export interface VideoToolsError {
	/** Error code */
	code: string;
	/** Human-readable error message */
	message: string;
	/** Error category */
	category: "upload" | "processing" | "download";
	/** Whether the error is recoverable */
	recoverable: boolean;
	/** Suggested action for the user */
	suggestedAction?: string;
}

/**
 * State for the video editor
 */
export interface VideoEditorState {
	/** Source video file */
	sourceVideo: File | null;
	/** Extracted video metadata */
	videoMetadata: VideoMetadata | null;
	/** Queue of operations to apply */
	operations: VideoOperation[];
	/** Whether video is currently being processed */
	isProcessing: boolean;
	/** Processing progress (0-100) */
	processingProgress: number;
	/** Name of current operation being processed */
	currentOperation: string;
	/** Processed output video blob */
	outputVideo: Blob | null;
	/** Current error, if any */
	error: string | null;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Video processor interface
 */
export interface IVideoProcessor {
	/** Initialize FFmpeg */
	initialize(): Promise<void>;
	/** Crop video to specified region */
	cropVideo(input: File, crop: CropRegion): Promise<Blob>;
	/** Compress video with specified settings */
	compressVideo(input: File, settings: CompressionSettings): Promise<Blob>;
	/** Trim video to specified time range */
	trimVideo(input: File, range: TrimRange): Promise<Blob>;
	/** Process queue of operations */
	processQueue(input: File, operations: VideoOperation[]): Promise<Blob>;
	/** Cancel current processing */
	cancel(): Promise<void>;
	/** Set progress callback */
	onProgress(callback: ProgressCallback): void;
}
