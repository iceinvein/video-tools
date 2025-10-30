/**
 * Crop Tool Component
 *
 * Provides UI controls for defining crop region with aspect ratio presets,
 * manual dimension input, and apply/cancel actions.
 */

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { useCallback, useEffect, useState } from "react";
import type { CropRegion } from "../../types/video-tools";

export interface CropToolProps {
	/** Original video width in pixels */
	videoWidth: number;
	/** Original video height in pixels */
	videoHeight: number;
	/** Current crop region (null if none) */
	currentCrop: CropRegion | null;
	/** Callback when crop region is updated */
	onCropUpdate: (crop: CropRegion) => void;
	/** Callback when user applies the crop */
	onApply: () => void;
	/** Callback when user cancels the crop */
	onCancel: () => void;
}

type AspectRatio = "16:9" | "4:3" | "1:1" | "custom";

interface AspectRatioPreset {
	label: string;
	ratio: number;
}

const ASPECT_RATIO_PRESETS: Record<
	Exclude<AspectRatio, "custom">,
	AspectRatioPreset
> = {
	"16:9": { label: "16:9", ratio: 16 / 9 },
	"4:3": { label: "4:3", ratio: 4 / 3 },
	"1:1": { label: "1:1", ratio: 1 },
};

export function CropTool({
	videoWidth,
	videoHeight,
	currentCrop,
	onCropUpdate,
	onApply,
	onCancel,
}: CropToolProps) {
	const [selectedAspectRatio, setSelectedAspectRatio] =
		useState<AspectRatio>("custom");
	const [manualWidth, setManualWidth] = useState<string>("");
	const [manualHeight, setManualHeight] = useState<string>("");

	/**
	 * Initialize crop region to full video if none exists
	 */
	useEffect(() => {
		if (!currentCrop) {
			onCropUpdate({
				x: 0,
				y: 0,
				width: videoWidth,
				height: videoHeight,
			});
		}
	}, [currentCrop, videoWidth, videoHeight, onCropUpdate]);

	/**
	 * Update manual input fields when crop region changes
	 */
	useEffect(() => {
		if (currentCrop) {
			setManualWidth(Math.round(currentCrop.width).toString());
			setManualHeight(Math.round(currentCrop.height).toString());
		}
	}, [currentCrop]);

	/**
	 * Handle aspect ratio preset selection
	 */
	const handleAspectRatioSelect = useCallback(
		(ratio: AspectRatio) => {
			setSelectedAspectRatio(ratio);

			if (ratio === "custom" || !currentCrop) return;

			const preset = ASPECT_RATIO_PRESETS[ratio];
			const targetRatio = preset.ratio;

			// Calculate new dimensions maintaining the aspect ratio
			// Try to keep the width and adjust height
			let newWidth = currentCrop.width;
			let newHeight = newWidth / targetRatio;

			// If height exceeds video bounds, adjust based on height
			if (newHeight > videoHeight) {
				newHeight = videoHeight;
				newWidth = newHeight * targetRatio;
			}

			// If width exceeds video bounds, adjust based on width
			if (newWidth > videoWidth) {
				newWidth = videoWidth;
				newHeight = newWidth / targetRatio;
			}

			// Center the crop region
			const newX = Math.max(0, (videoWidth - newWidth) / 2);
			const newY = Math.max(0, (videoHeight - newHeight) / 2);

			onCropUpdate({
				x: newX,
				y: newY,
				width: newWidth,
				height: newHeight,
			});
		},
		[currentCrop, videoWidth, videoHeight, onCropUpdate],
	);

	/**
	 * Handle manual width input change
	 */
	const handleWidthChange = useCallback(
		(value: string) => {
			setManualWidth(value);

			const width = Number.parseInt(value, 10);
			if (Number.isNaN(width) || width <= 0 || !currentCrop) return;

			// Constrain to video bounds
			const constrainedWidth = Math.min(width, videoWidth);

			// Adjust x position if crop exceeds bounds
			const newX = Math.min(currentCrop.x, videoWidth - constrainedWidth);

			onCropUpdate({
				...currentCrop,
				x: newX,
				width: constrainedWidth,
			});

			setSelectedAspectRatio("custom");
		},
		[currentCrop, videoWidth, onCropUpdate],
	);

	/**
	 * Handle manual height input change
	 */
	const handleHeightChange = useCallback(
		(value: string) => {
			setManualHeight(value);

			const height = Number.parseInt(value, 10);
			if (Number.isNaN(height) || height <= 0 || !currentCrop) return;

			// Constrain to video bounds
			const constrainedHeight = Math.min(height, videoHeight);

			// Adjust y position if crop exceeds bounds
			const newY = Math.min(currentCrop.y, videoHeight - constrainedHeight);

			onCropUpdate({
				...currentCrop,
				y: newY,
				height: constrainedHeight,
			});

			setSelectedAspectRatio("custom");
		},
		[currentCrop, videoHeight, onCropUpdate],
	);

	/**
	 * Reset crop to original video dimensions
	 */
	const handleReset = useCallback(() => {
		onCropUpdate({
			x: 0,
			y: 0,
			width: videoWidth,
			height: videoHeight,
		});
		setSelectedAspectRatio("custom");
	}, [videoWidth, videoHeight, onCropUpdate]);

	return (
		<Card className="w-full">
			<CardHeader className="flex flex-col items-start gap-1 pb-2 p-3 md:p-4">
				<h3 className="text-base md:text-lg font-semibold">Crop Video</h3>
				<p className="text-xs md:text-sm text-default-500">
					Select an aspect ratio or manually adjust dimensions
				</p>
			</CardHeader>
			<CardBody className="gap-3 md:gap-4 p-3 md:p-4">
				{/* Aspect Ratio Presets */}
				<div>
					<label className="text-xs md:text-sm font-medium mb-2 block">
						Aspect Ratio Presets
					</label>
					<div className="flex flex-wrap gap-2">
						{(
							Object.keys(ASPECT_RATIO_PRESETS) as Array<
								Exclude<AspectRatio, "custom">
							>
						).map((ratio) => (
							<Button
								key={ratio}
								size="sm"
								variant={selectedAspectRatio === ratio ? "solid" : "bordered"}
								color={selectedAspectRatio === ratio ? "primary" : "default"}
								onPress={() => handleAspectRatioSelect(ratio)}
								className="min-h-[44px] md:min-h-0"
							>
								{ASPECT_RATIO_PRESETS[ratio].label}
							</Button>
						))}
						<Button
							size="sm"
							variant={selectedAspectRatio === "custom" ? "solid" : "bordered"}
							color={selectedAspectRatio === "custom" ? "primary" : "default"}
							onPress={() => setSelectedAspectRatio("custom")}
							className="min-h-[44px] md:min-h-0"
						>
							Custom
						</Button>
					</div>
				</div>

				{/* Manual Dimension Inputs */}
				<div>
					<label className="text-xs md:text-sm font-medium mb-2 block">
						Crop Dimensions
					</label>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
						<Input
							type="number"
							label="Width (px)"
							placeholder="Width"
							value={manualWidth}
							onValueChange={handleWidthChange}
							min={1}
							max={videoWidth}
							size="sm"
							classNames={{
								input: "min-h-[44px] md:min-h-0",
							}}
						/>
						<Input
							type="number"
							label="Height (px)"
							placeholder="Height"
							value={manualHeight}
							onValueChange={handleHeightChange}
							min={1}
							max={videoHeight}
							size="sm"
							classNames={{
								input: "min-h-[44px] md:min-h-0",
							}}
						/>
					</div>
					<p className="text-xs text-default-400 mt-1">
						Max: {videoWidth} × {videoHeight}
					</p>
				</div>

				{/* Current Crop Info */}
				{currentCrop && (
					<div className="p-2 md:p-3 bg-default-100 rounded-lg">
						<div className="text-xs md:text-sm space-y-1">
							<div className="flex justify-between">
								<span className="text-default-600">Position:</span>
								<span className="font-medium">
									X: {Math.round(currentCrop.x)}, Y: {Math.round(currentCrop.y)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-default-600">Size:</span>
								<span className="font-medium">
									{Math.round(currentCrop.width)} ×{" "}
									{Math.round(currentCrop.height)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-default-600">Aspect Ratio:</span>
								<span className="font-medium">
									{(currentCrop.width / currentCrop.height).toFixed(2)}
								</span>
							</div>
						</div>
					</div>
				)}

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
					<Button
						color="danger"
						variant="light"
						onPress={onCancel}
						className="flex-1 min-h-[44px]"
					>
						Cancel
					</Button>
					<Button
						color="primary"
						onPress={onApply}
						className="flex-1 min-h-[44px]"
					>
						Apply Crop
					</Button>
				</div>
			</CardBody>
		</Card>
	);
}
