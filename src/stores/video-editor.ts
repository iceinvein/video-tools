/**
 * Video Editor State Management
 *
 * This module provides centralized state management for the video editor using Nanostores.
 * It includes atom stores for simple values, map stores for complex objects, computed stores,
 * and action functions for state mutations.
 */

import { atom, computed, map } from "nanostores";
import type { VideoMetadata, VideoOperation } from "../types/video-tools";

// ============================================================================
// Atom Stores (Simple Values)
// ============================================================================

/**
 * Whether video processing is currently active
 */
export const isProcessing = atom<boolean>(false);

/**
 * Current processing progress (0-100)
 */
export const processingProgress = atom<number>(0);

/**
 * Name of the current operation being processed
 */
export const currentOperation = atom<string>("");

/**
 * Current error message, if any
 */
export const error = atom<string | null>(null);

/**
 * Processed output video blob
 */
export const outputVideo = atom<Blob | null>(null);

/**
 * Processed output video metadata
 */
export const outputMetadata = atom<VideoMetadata | null>(null);

// ============================================================================
// Map Stores (Complex Objects)
// ============================================================================

/**
 * Source video file and its metadata
 */
export const sourceVideo = map<{
	file: File | null;
	metadata: VideoMetadata | null;
}>({
	file: null,
	metadata: null,
});

/**
 * Video operations queue stored as a record keyed by operation ID
 */
export const operations = map<Record<string, VideoOperation>>({});

// ============================================================================
// Computed Stores
// ============================================================================

/**
 * List of operations sorted by order
 */
export const operationsList = computed(operations, (ops) =>
	Object.values(ops).sort((a, b) => a.order - b.order),
);

/**
 * Whether there are any operations in the queue
 */
export const hasOperations = computed(
	operations,
	(ops) => Object.keys(ops).length > 0,
);

// ============================================================================
// Action Functions (State Mutations)
// ============================================================================

/**
 * Set the source video file and its metadata
 */
export function setVideo(file: File, metadata: VideoMetadata): void {
	sourceVideo.set({ file, metadata });
}

/**
 * Add a video operation to the queue
 */
export function addOperation(operation: VideoOperation): void {
	operations.setKey(operation.id, operation);
}

/**
 * Remove a video operation from the queue by ID
 */
export function removeOperation(operationId: string): void {
	const current = operations.get();
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { [operationId]: _, ...rest } = current;
	operations.set(rest);
}

/**
 * Start video processing
 * Resets progress and error state
 */
export function startProcessing(): void {
	isProcessing.set(true);
	processingProgress.set(0);
	error.set(null);
}

/**
 * Update processing progress
 * @param progress - Progress value between 0 and 100
 */
export function updateProgress(progress: number): void {
	processingProgress.set(Math.min(100, Math.max(0, progress)));
}

/**
 * Complete video processing successfully
 * @param blob - The processed video blob
 * @param metadata - Optional metadata for the processed video
 */
export function completeProcessing(blob: Blob, metadata?: VideoMetadata): void {
	isProcessing.set(false);
	processingProgress.set(100);
	outputVideo.set(blob);
	if (metadata) {
		outputMetadata.set(metadata);
	}
}

/**
 * Set an error message and stop processing
 * @param errorMessage - The error message to display
 */
export function setError(errorMessage: string): void {
	isProcessing.set(false);
	error.set(errorMessage);
}

/**
 * Reset the entire editor state to initial values
 * Clears all video data, operations, and processing state
 */
export function resetEditor(): void {
	sourceVideo.set({ file: null, metadata: null });
	operations.set({});
	isProcessing.set(false);
	processingProgress.set(0);
	currentOperation.set("");
	outputVideo.set(null);
	outputMetadata.set(null);
	error.set(null);
}
