/**
 * Unit tests for VideoPreview component
 * Tests rendering, playback controls, and crop region visualization
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VideoMetadata } from "../../types/video-tools";
import { VideoPreview } from "./video-preview";

describe("VideoPreview", () => {
	const mockMetadata: VideoMetadata = {
		duration: 120,
		width: 1920,
		height: 1080,
		fileSize: 10485760, // 10MB
		format: "mp4",
		codec: "h264",
		bitrate: 5000000,
		fps: 30,
		hasAudio: true,
	};

	const mockVideoUrl = "blob:http://localhost:3000/test-video";

	describe("rendering", () => {
		it("should render video element with correct src", () => {
			const { container } = render(<VideoPreview videoUrl={mockVideoUrl} />);

			const video = container.querySelector("video");
			expect(video).toBeTruthy();
			expect(video?.src).toBe(mockVideoUrl);
		});

		it("should render playback controls", () => {
			render(<VideoPreview videoUrl={mockVideoUrl} />);

			// Check for play/pause button
			const playButton = screen.getByLabelText(/play/i);
			expect(playButton).toBeInTheDocument();

			// Check for mute button
			const muteButton = screen.getByLabelText(/mute/i);
			expect(muteButton).toBeInTheDocument();
		});

		it("should display video metadata when provided", () => {
			render(<VideoPreview videoUrl={mockVideoUrl} metadata={mockMetadata} />);

			expect(screen.getByText(/1920 × 1080/)).toBeInTheDocument();
			expect(screen.getByText(/10\.00 MB/)).toBeInTheDocument();
			expect(screen.getByText(/MP4/)).toBeInTheDocument();
		});

		it("should not display metadata when not provided", () => {
			render(<VideoPreview videoUrl={mockVideoUrl} />);

			expect(screen.queryByText(/Resolution:/)).not.toBeInTheDocument();
		});
	});

	describe("comparison mode", () => {
		it("should render single video by default", () => {
			const { container } = render(<VideoPreview videoUrl={mockVideoUrl} />);

			const videos = container.querySelectorAll("video");
			expect(videos.length).toBe(1);
		});

		it("should render two videos in comparison mode", () => {
			const { container } = render(
				<VideoPreview
					videoUrl={mockVideoUrl}
					showComparison={true}
					comparisonVideoUrl="blob:http://localhost:3000/comparison-video"
				/>,
			);

			const videos = container.querySelectorAll("video");
			expect(videos.length).toBe(2);
		});

		it("should show preview label in comparison mode", () => {
			render(
				<VideoPreview
					videoUrl={mockVideoUrl}
					showComparison={true}
					comparisonVideoUrl="blob:http://localhost:3000/comparison-video"
				/>,
			);

			expect(screen.getByText("Preview")).toBeInTheDocument();
		});
	});

	describe("crop region", () => {
		it("should render canvas when crop region is provided", () => {
			const mockCropRegion = { x: 100, y: 100, width: 800, height: 600 };
			const mockOnCropChange = vi.fn();

			const { container } = render(
				<VideoPreview
					videoUrl={mockVideoUrl}
					cropRegion={mockCropRegion}
					onCropChange={mockOnCropChange}
				/>,
			);

			const canvas = container.querySelector("canvas");
			expect(canvas).toBeTruthy();
		});

		it("should not render canvas when crop region is not provided", () => {
			const { container } = render(<VideoPreview videoUrl={mockVideoUrl} />);

			const canvas = container.querySelector("canvas");
			expect(canvas).toBeFalsy();
		});

		it("should not render canvas when onCropChange is not provided", () => {
			const mockCropRegion = { x: 100, y: 100, width: 800, height: 600 };

			const { container } = render(
				<VideoPreview videoUrl={mockVideoUrl} cropRegion={mockCropRegion} />,
			);

			const canvas = container.querySelector("canvas");
			expect(canvas).toBeFalsy();
		});
	});
});
