/**
 * Trim Tool Component
 *
 * Provides UI controls for trimming video with a timeline scrubber,
 * draggable start/end markers, and timestamp input fields.
 */

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TrimRange } from "../../types/video-tools";

export interface TrimToolProps {
	/** Video duration in seconds */
	duration: number;
	/** Current trim range */
	currentRange: TrimRange;
	/** Callback when trim range changes */
	onRangeChange: (range: TrimRange) => void;
	/** Callback when user applies the trim */
	onApply: () => void;
	/** Callback when user cancels the trim */
	onCancel?: () => void;
}

type DragTarget = "start" | "end" | null;

/**
 * Format seconds to MM:SS or HH:MM:SS format
 */
function formatTime(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parse time string (MM:SS or HH:MM:SS) to seconds
 */
function parseTime(timeStr: string): number | null {
	const parts = timeStr.split(":").map((p) => Number.parseInt(p, 10));

	if (parts.some((p) => Number.isNaN(p))) {
		return null;
	}

	if (parts.length === 2) {
		// MM:SS
		const [minutes, seconds] = parts;
		return minutes * 60 + seconds;
	}

	if (parts.length === 3) {
		// HH:MM:SS
		const [hours, minutes, seconds] = parts;
		return hours * 3600 + minutes * 60 + seconds;
	}

	return null;
}

export function TrimTool({
	duration,
	currentRange,
	onRangeChange,
	onApply,
	onCancel,
}: TrimToolProps) {
	const timelineRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState<DragTarget>(null);
	const [startTimeInput, setStartTimeInput] = useState<string>("");
	const [endTimeInput, setEndTimeInput] = useState<string>("");

	/**
	 * Update input fields when range changes
	 */
	useEffect(() => {
		setStartTimeInput(formatTime(currentRange.startTime));
		setEndTimeInput(formatTime(currentRange.endTime));
	}, [currentRange]);

	/**
	 * Calculate marker position as percentage
	 */
	const getMarkerPosition = useCallback(
		(time: number): number => {
			return (time / duration) * 100;
		},
		[duration],
	);

	/**
	 * Calculate time from mouse position
	 */
	const getTimeFromPosition = useCallback(
		(clientX: number): number => {
			if (!timelineRef.current) return 0;

			const rect = timelineRef.current.getBoundingClientRect();
			const x = clientX - rect.left;
			const percentage = Math.max(0, Math.min(1, x / rect.width));
			return percentage * duration;
		},
		[duration],
	);

	/**
	 * Handle mouse down on start marker
	 */
	const handleStartMarkerMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging("start");
	}, []);

	/**
	 * Handle mouse down on end marker
	 */
	const handleEndMarkerMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging("end");
	}, []);

	/**
	 * Handle mouse move during drag
	 */
	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging) return;

			const time = getTimeFromPosition(e.clientX);

			if (isDragging === "start") {
				// Ensure start time doesn't exceed end time
				const newStartTime = Math.min(time, currentRange.endTime - 0.1);
				onRangeChange({
					...currentRange,
					startTime: Math.max(0, newStartTime),
				});
			} else if (isDragging === "end") {
				// Ensure end time doesn't go below start time
				const newEndTime = Math.max(time, currentRange.startTime + 0.1);
				onRangeChange({
					...currentRange,
					endTime: Math.min(duration, newEndTime),
				});
			}
		},
		[isDragging, currentRange, duration, getTimeFromPosition, onRangeChange],
	);

	/**
	 * Handle mouse up to end drag
	 */
	const handleMouseUp = useCallback(() => {
		setIsDragging(null);
	}, []);

	/**
	 * Set up and clean up mouse event listeners
	 */
	useEffect(() => {
		if (isDragging) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);

			return () => {
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	/**
	 * Handle start time input change
	 */
	const handleStartTimeChange = useCallback(
		(value: string) => {
			setStartTimeInput(value);

			const time = parseTime(value);
			if (time !== null && time >= 0 && time < currentRange.endTime) {
				onRangeChange({
					...currentRange,
					startTime: time,
				});
			}
		},
		[currentRange, onRangeChange],
	);

	/**
	 * Handle end time input change
	 */
	const handleEndTimeChange = useCallback(
		(value: string) => {
			setEndTimeInput(value);

			const time = parseTime(value);
			if (time !== null && time > currentRange.startTime && time <= duration) {
				onRangeChange({
					...currentRange,
					endTime: time,
				});
			}
		},
		[currentRange, duration, onRangeChange],
	);

	/**
	 * Reset to full duration
	 */
	const handleReset = useCallback(() => {
		onRangeChange({
			startTime: 0,
			endTime: duration,
		});
	}, [duration, onRangeChange]);

	/**
	 * Calculate selected duration
	 */
	const selectedDuration = currentRange.endTime - currentRange.startTime;
	const startPosition = getMarkerPosition(currentRange.startTime);
	const endPosition = getMarkerPosition(currentRange.endTime);

	return (
		<Card className="w-full">
			<CardHeader className="flex flex-col items-start gap-1 pb-2 p-3 md:p-4">
				<h3 className="text-base md:text-lg font-semibold">Trim Video</h3>
				<p className="text-xs md:text-sm text-default-500">
					Select the portion of video to keep
				</p>
			</CardHeader>
			<CardBody className="gap-3 md:gap-4 p-3 md:p-4">
				{/* Timeline Scrubber */}
				<div>
					<label className="text-xs md:text-sm font-medium mb-2 block">
						Timeline
					</label>
					<div
						ref={timelineRef}
						className="relative h-12 bg-default-100 rounded-lg cursor-pointer select-none"
					>
						{/* Full timeline bar */}
						<div className="absolute inset-0 rounded-lg overflow-hidden">
							{/* Selected range highlight */}
							<div
								className="absolute top-0 bottom-0 bg-primary-200 dark:bg-primary-300/30"
								style={{
									left: `${startPosition}%`,
									right: `${100 - endPosition}%`,
								}}
							/>
						</div>

						{/* Start marker */}
						<div
							className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-10"
							style={{
								left: `${startPosition}%`,
							}}
							onMouseDown={handleStartMarkerMouseDown}
						>
							<div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-8 bg-primary rounded-sm shadow-md flex items-center justify-center">
								<div className="w-0.5 h-4 bg-white rounded-full" />
							</div>
						</div>

						{/* End marker */}
						<div
							className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-10"
							style={{
								left: `${endPosition}%`,
							}}
							onMouseDown={handleEndMarkerMouseDown}
						>
							<div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-8 bg-primary rounded-sm shadow-md flex items-center justify-center">
								<div className="w-0.5 h-4 bg-white rounded-full" />
							</div>
						</div>
					</div>

					{/* Timeline labels */}
					<div className="flex justify-between text-xs text-default-400 mt-1">
						<span>0:00</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>

				{/* Timestamp Inputs */}
				<div>
					<label className="text-xs md:text-sm font-medium mb-2 block">
						Precise Time Control
					</label>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
						<Input
							type="text"
							label="Start Time"
							placeholder="00:00"
							value={startTimeInput}
							onValueChange={handleStartTimeChange}
							size="sm"
							description="MM:SS or HH:MM:SS"
							classNames={{
								input: "min-h-[44px] md:min-h-0",
							}}
						/>
						<Input
							type="text"
							label="End Time"
							placeholder="00:00"
							value={endTimeInput}
							onValueChange={handleEndTimeChange}
							size="sm"
							description="MM:SS or HH:MM:SS"
							classNames={{
								input: "min-h-[44px] md:min-h-0",
							}}
						/>
					</div>
				</div>

				{/* Duration Info */}
				<div className="p-2 md:p-3 bg-default-100 rounded-lg">
					<div className="text-xs md:text-sm space-y-1">
						<div className="flex justify-between">
							<span className="text-default-600">Original Duration:</span>
							<span className="font-medium">{formatTime(duration)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-default-600">Selected Duration:</span>
							<span className="font-semibold text-primary">
								{formatTime(selectedDuration)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-default-600">Time Range:</span>
							<span className="font-medium">
								{formatTime(currentRange.startTime)} -{" "}
								{formatTime(currentRange.endTime)}
							</span>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row gap-2 pt-2">
					<Button
						color="default"
						variant="flat"
						onPress={handleReset}
						className="flex-1 min-h-[44px]"
					>
						Reset
					</Button>
					{onCancel && (
						<Button
							color="danger"
							variant="light"
							onPress={onCancel}
							className="flex-1 min-h-[44px]"
						>
							Cancel
						</Button>
					)}
					<Button
						color="primary"
						onPress={onApply}
						className="flex-1 min-h-[44px]"
					>
						Apply Trim
					</Button>
				</div>
			</CardBody>
		</Card>
	);
}
