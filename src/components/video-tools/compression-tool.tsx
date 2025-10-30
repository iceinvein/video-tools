/**
 * Compression Tool Component
 *
 * Provides UI controls for video compression settings including quality slider,
 * codec selection, and estimated output size calculation.
 */

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Slider } from "@heroui/slider";
import { useCallback, useEffect, useState } from "react";
import type { CompressionSettings } from "../../types/video-tools";

export interface CompressionToolProps {
	/** Original video file size in bytes */
	originalSize: number;
	/** Original video bitrate in bits per second */
	originalBitrate?: number;
	/** Original video duration in seconds */
	duration?: number;
	/** Callback when compression settings change */
	onCompressionChange: (settings: CompressionSettings) => void;
	/** Callback when user applies compression */
	onApply: () => void;
	/** Callback when user cancels */
	onCancel?: () => void;
}

type CodecOption = "h264" | "h265";

interface CodecInfo {
	label: string;
	description: string;
	efficiency: number; // Relative compression efficiency (higher = better compression)
}

const CODEC_INFO: Record<CodecOption, CodecInfo> = {
	h264: {
		label: "H.264 (AVC)",
		description: "Most compatible, good quality",
		efficiency: 1.0,
	},
	h265: {
		label: "H.265 (HEVC)",
		description: "Better compression, less compatible",
		efficiency: 1.5,
	},
};

/**
 * Calculate estimated output file size based on compression settings
 */
export function estimateOutputSize(
	originalSize: number,
	quality: number,
	codec: CodecOption,
	originalBitrate?: number,
	duration?: number,
): number {
	// Quality mapping: 1 (lowest) to 10 (highest)
	// Lower quality = more compression = smaller file
	// Quality 10 = ~90% of original size
	// Quality 5 = ~40% of original size
	// Quality 1 = ~15% of original size

	// Non-linear quality curve for more realistic estimation
	const qualityFactor = (quality / 10) ** 1.5 * 0.9 + 0.1;

	// Apply codec efficiency
	const codecEfficiency = CODEC_INFO[codec].efficiency;
	const codecFactor = 1 / codecEfficiency;

	// Calculate estimated size
	let estimatedSize = originalSize * qualityFactor * codecFactor;

	// If we have bitrate and duration, use a more accurate calculation
	if (originalBitrate && duration) {
		// Map quality to CRF-like values (lower CRF = higher quality)
		// Quality 10 -> CRF 18, Quality 5 -> CRF 28, Quality 1 -> CRF 40
		const crf = 50 - quality * 3.2;

		// Estimate bitrate reduction based on CRF
		// This is a simplified model
		const bitrateReductionFactor = Math.exp(-(crf - 18) / 15);
		const estimatedBitrate =
			originalBitrate * bitrateReductionFactor * codecFactor;

		// Calculate size from bitrate: (bitrate * duration) / 8 for bytes
		const bitrateBasedSize = (estimatedBitrate * duration) / 8;

		// Blend both estimates (favor bitrate-based if available)
		estimatedSize = bitrateBasedSize * 0.7 + estimatedSize * 0.3;
	}

	// Ensure minimum size (compressed video has overhead)
	const minSize = originalSize * 0.05;
	return Math.max(minSize, estimatedSize);
}

/**
 * Calculate quality impact percentage
 */
export function calculateQualityImpact(quality: number): number {
	// Quality 10 = 0% impact (minimal loss)
	// Quality 5 = 30% impact (noticeable but acceptable)
	// Quality 1 = 70% impact (significant quality loss)

	const impact = (10 - quality) * 7;
	return Math.min(100, Math.max(0, impact));
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function CompressionTool({
	originalSize,
	originalBitrate,
	duration,
	onCompressionChange,
	onApply,
	onCancel,
}: CompressionToolProps) {
	const [quality, setQuality] = useState<number>(7);
	const [codec, setCodec] = useState<CodecOption>("h264");
	const [estimatedSize, setEstimatedSize] = useState<number>(originalSize);
	const [qualityImpact, setQualityImpact] = useState<number>(0);

	/**
	 * Update estimates when settings change
	 */
	useEffect(() => {
		const newEstimatedSize = estimateOutputSize(
			originalSize,
			quality,
			codec,
			originalBitrate,
			duration,
		);
		const newQualityImpact = calculateQualityImpact(quality);

		setEstimatedSize(newEstimatedSize);
		setQualityImpact(newQualityImpact);

		// Notify parent of settings change
		onCompressionChange({
			quality,
			codec,
		});
	}, [
		quality,
		codec,
		originalSize,
		originalBitrate,
		duration,
		onCompressionChange,
	]);

	/**
	 * Handle quality slider change
	 */
	const handleQualityChange = useCallback((value: number | number[]) => {
		const newQuality = Array.isArray(value) ? value[0] : value;
		setQuality(newQuality);
	}, []);

	/**
	 * Handle codec selection change
	 */
	const handleCodecChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			setCodec(e.target.value as CodecOption);
		},
		[],
	);

	/**
	 * Calculate size reduction percentage
	 */
	const sizeReduction = ((originalSize - estimatedSize) / originalSize) * 100;

	/**
	 * Get quality level description
	 */
	const getQualityDescription = (q: number): string => {
		if (q >= 9) return "Excellent - Minimal compression";
		if (q >= 7) return "High - Good balance";
		if (q >= 5) return "Medium - Noticeable compression";
		if (q >= 3) return "Low - Significant compression";
		return "Very Low - Maximum compression";
	};

	return (
		<Card className="w-full">
			<CardHeader className="flex flex-col items-start gap-1 pb-2 p-3 md:p-4">
				<h3 className="text-base md:text-lg font-semibold">Compress Video</h3>
				<p className="text-xs md:text-sm text-default-500">
					Reduce file size by adjusting quality and codec settings
				</p>
			</CardHeader>
			<CardBody className="gap-3 md:gap-4 p-3 md:p-4">
				{/* Quality Slider */}
				<div>
					<Slider
						label="Quality Level"
						size="sm"
						step={1}
						minValue={1}
						maxValue={10}
						value={quality}
						onChange={handleQualityChange}
						className="max-w-full"
						marks={[
							{ value: 1, label: "1" },
							{ value: 5, label: "5" },
							{ value: 10, label: "10" },
						]}
						renderValue={(props) => (
							<output {...props}>
								<span className="font-semibold">{quality}</span>
							</output>
						)}
					/>
					<p className="text-xs text-default-500 mt-1">
						{getQualityDescription(quality)}
					</p>
				</div>

				{/* Codec Selection */}
				<div>
					<Select
						label="Video Codec"
						placeholder="Select codec"
						selectedKeys={[codec]}
						onChange={handleCodecChange}
						size="sm"
						description={CODEC_INFO[codec].description}
					>
						{(Object.keys(CODEC_INFO) as CodecOption[]).map((codecKey) => (
							<SelectItem key={codecKey}>
								{CODEC_INFO[codecKey].label}
							</SelectItem>
						))}
					</Select>
				</div>

				{/* Estimated Output Size */}
				<div className="p-2 md:p-3 bg-default-100 rounded-lg space-y-1 md:space-y-2">
					<div className="flex justify-between items-center">
						<span className="text-xs md:text-sm text-default-600">
							Original Size:
						</span>
						<span className="text-xs md:text-sm font-medium">
							{formatFileSize(originalSize)}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-xs md:text-sm text-default-600">
							Estimated Size:
						</span>
						<span className="text-xs md:text-sm font-semibold text-primary">
							{formatFileSize(estimatedSize)}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-xs md:text-sm text-default-600">
							Size Reduction:
						</span>
						<span
							className={`text-xs md:text-sm font-semibold ${sizeReduction > 0 ? "text-success" : "text-warning"}`}
						>
							{sizeReduction > 0 ? "-" : "+"}
							{Math.abs(sizeReduction).toFixed(1)}%
						</span>
					</div>
				</div>

				{/* Quality Impact */}
				<div className="p-2 md:p-3 bg-warning-50 dark:bg-warning-50/10 rounded-lg border border-warning-200 dark:border-warning-200/20">
					<div className="flex justify-between items-center">
						<span className="text-xs md:text-sm text-warning-700 dark:text-warning-500">
							Quality Impact:
						</span>
						<span className="text-xs md:text-sm font-semibold text-warning-700 dark:text-warning-500">
							{qualityImpact.toFixed(0)}%
						</span>
					</div>
					<p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
						{qualityImpact < 15
							? "Minimal visible quality loss"
							: qualityImpact < 35
								? "Some quality loss, generally acceptable"
								: qualityImpact < 55
									? "Noticeable quality reduction"
									: "Significant quality degradation"}
					</p>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row gap-2 pt-2">
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
						Apply Compression
					</Button>
				</div>
			</CardBody>
		</Card>
	);
}
