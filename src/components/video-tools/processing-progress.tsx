/**
 * Processing Progress Component
 *
 * Displays video processing status with progress bar, current operation,
 * time estimation, and processing logs. Provides cancel functionality.
 */

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { useStore } from "@nanostores/react";
import { useCallback, useEffect, useState } from "react";
import {
	currentOperation,
	isProcessing,
	processingProgress,
} from "../../stores/video-editor";

export interface ProcessingProgressProps {
	/** Current processing progress (0-100) */
	progress?: number;
	/** Name of the current operation being processed */
	currentOperation?: string;
	/** Estimated time remaining in seconds */
	estimatedTimeRemaining?: number;
	/** Callback when cancel button is clicked */
	onCancel: () => void;
	/** Processing log messages */
	logs?: string[];
}

/**
 * Format seconds into human-readable time string
 */
function formatTime(seconds: number): string {
	if (seconds < 60) {
		return `${Math.round(seconds)}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);
	return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Calculate estimated time remaining based on progress and elapsed time
 */
function calculateEstimatedTime(
	progress: number,
	startTime: number,
): number | null {
	if (progress <= 0 || progress >= 100) {
		return null;
	}

	const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
	const estimatedTotal = (elapsedTime / progress) * 100;
	const remaining = estimatedTotal - elapsedTime;

	return Math.max(0, remaining);
}

export function ProcessingProgress({
	progress: propProgress,
	currentOperation: propCurrentOperation,
	estimatedTimeRemaining: propEstimatedTime,
	onCancel,
	logs = [],
}: ProcessingProgressProps) {
	// Use store values if props not provided
	const storeProgress = useStore(processingProgress);
	const storeCurrentOperation = useStore(currentOperation);
	const storeIsProcessing = useStore(isProcessing);

	const progress = propProgress ?? storeProgress;
	const operation = propCurrentOperation ?? storeCurrentOperation;

	// Track processing start time for estimation
	const [startTime, setStartTime] = useState<number>(Date.now());
	const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
	const [logsExpanded, setLogsExpanded] = useState(false);

	// Reset start time when processing starts
	useEffect(() => {
		if (storeIsProcessing && progress === 0) {
			setStartTime(Date.now());
		}
	}, [storeIsProcessing, progress]);

	// Calculate estimated time remaining
	useEffect(() => {
		if (propEstimatedTime !== undefined) {
			setEstimatedTime(propEstimatedTime);
			return;
		}

		if (progress > 0 && progress < 100) {
			const estimated = calculateEstimatedTime(progress, startTime);
			setEstimatedTime(estimated);
		} else {
			setEstimatedTime(null);
		}
	}, [progress, startTime, propEstimatedTime]);

	/**
	 * Toggle logs section visibility
	 */
	const toggleLogs = useCallback(() => {
		setLogsExpanded((prev) => !prev);
	}, []);

	/**
	 * Get progress bar color based on progress value
	 */
	const getProgressColor = useCallback(() => {
		if (progress < 30) return "danger";
		if (progress < 70) return "warning";
		return "success";
	}, [progress]);

	/**
	 * Get status message based on progress
	 */
	const getStatusMessage = useCallback(() => {
		if (progress === 0) return "Initializing...";
		if (progress === 100) return "Processing complete!";
		if (progress > 0 && progress < 100) return "Processing...";
		return "Ready";
	}, [progress]);

	return (
		<Card className="w-full">
			<CardHeader className="flex flex-col items-start gap-1 p-3 md:p-4">
				<div className="flex items-center justify-between w-full gap-2">
					<h3 className="text-base md:text-lg font-semibold">
						Processing Video
					</h3>
					<Button
						color="danger"
						variant="light"
						size="sm"
						onPress={onCancel}
						isDisabled={progress === 100}
						className="min-h-[44px] md:min-h-0"
					>
						Cancel
					</Button>
				</div>
				<p className="text-xs md:text-sm text-default-500">
					{getStatusMessage()}
				</p>
			</CardHeader>
			<CardBody className="gap-3 md:gap-4 p-3 md:p-4">
				{/* Progress Bar */}
				<div className="space-y-2">
					<Progress
						value={progress}
						color={getProgressColor()}
						size="md"
						showValueLabel
						className="w-full"
						aria-label="Processing progress"
					/>
					<div className="flex items-center justify-between text-xs md:text-sm gap-2">
						<span className="text-default-600">
							{progress.toFixed(1)}% complete
						</span>
						{estimatedTime !== null && estimatedTime > 0 && (
							<span className="text-default-500 whitespace-nowrap">
								~{formatTime(estimatedTime)} remaining
							</span>
						)}
					</div>
				</div>

				{/* Current Operation */}
				{operation && (
					<div className="p-2 md:p-3 rounded-lg bg-default-100">
						<p className="text-xs md:text-sm font-medium text-default-700 mb-1">
							Current Operation
						</p>
						<p className="text-xs md:text-sm text-default-600 wrap-break-word">
							{operation}
						</p>
					</div>
				)}

				{/* Processing Logs */}
				{logs.length > 0 && (
					<div className="border-t border-default-200 pt-4">
						<button
							type="button"
							onClick={toggleLogs}
							className="flex items-center justify-between w-full text-sm font-medium text-default-700 hover:text-default-900 transition-colors"
						>
							<span>Processing Logs ({logs.length})</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={2}
								stroke="currentColor"
								className={`w-4 h-4 transition-transform ${
									logsExpanded ? "rotate-180" : ""
								}`}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M19.5 8.25l-7.5 7.5-7.5-7.5"
								/>
							</svg>
						</button>

						{logsExpanded && (
							<div className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-default-50 p-3 space-y-1">
								{logs.map((log, index) => (
									<div
										key={`log-${
											// biome-ignore lint/suspicious/noArrayIndexKey: logs are append-only
											index
										}`}
										className="text-xs font-mono text-default-600"
									>
										{log}
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Long Processing Warning */}
				{progress > 0 &&
					progress < 100 &&
					estimatedTime &&
					estimatedTime > 30 && (
						<div className="p-2 md:p-3 rounded-lg bg-warning-50 border border-warning-200">
							<div className="flex items-start gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
									className="w-4 h-4 md:w-5 md:h-5 text-warning-600 shrink-0 mt-0.5"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
									/>
								</svg>
								<div className="flex-1 min-w-0">
									<p className="text-xs md:text-sm font-medium text-warning-800">
										Processing is taking longer than expected
									</p>
									<p className="text-xs text-warning-700 mt-1">
										Large files or complex operations may take several minutes.
										Please be patient.
									</p>
								</div>
							</div>
						</div>
					)}
			</CardBody>
		</Card>
	);
}
