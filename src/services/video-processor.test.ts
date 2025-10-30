/**
 * Unit tests for VideoProcessor
 * Tests FFmpeg command generation, error handling, and cancellation logic
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	CompressionSettings,
	CropRegion,
	TrimRange,
	VideoFormat,
	VideoOperation,
} from "../types/video-tools";
import { VideoProcessor } from "./video-processor";

// Mock FFmpeg
vi.mock("@ffmpeg/ffmpeg", () => {
	class MockFFmpeg {
		on = vi.fn();
		load = vi.fn().mockResolvedValue(undefined);
		writeFile = vi.fn().mockResolvedValue(undefined);
		readFile = vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2, 3]));
		deleteFile = vi.fn().mockResolvedValue(undefined);
		exec = vi.fn().mockResolvedValue(undefined);
		terminate = vi.fn().mockResolvedValue(undefined);
	}

	return {
		FFmpeg: MockFFmpeg,
	};
});

vi.mock("@ffmpeg/util", () => ({
	toBlobURL: vi.fn().mockResolvedValue("blob:mock-url"),
	fetchFile: vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2, 3])),
}));

describe("VideoProcessor", () => {
	let processor: VideoProcessor;
	let mockFile: File;

	beforeEach(() => {
		processor = new VideoProcessor();
		mockFile = new File(["test"], "test.mp4", { type: "video/mp4" });
		vi.clearAllMocks();
	});

	describe("initialization", () => {
		it("should initialize FFmpeg successfully", async () => {
			await processor.initialize();
			expect(processor["isLoaded"]).toBe(true);
		});

		it("should not reinitialize if already loaded", async () => {
			await processor.initialize();
			// Create a new spy after first initialization
			const ffmpegInstance = processor["ffmpeg"];
			const originalLoad = ffmpegInstance.load;
			const loadSpy = vi.fn();
			ffmpegInstance.load = loadSpy;

			await processor.initialize();
			expect(loadSpy).not.toHaveBeenCalled();

			// Restore original
			ffmpegInstance.load = originalLoad;
		});

		it("should throw error if initialization fails", async () => {
			const failingProcessor = new VideoProcessor();
			vi.spyOn(failingProcessor["ffmpeg"], "load").mockRejectedValueOnce(
				new Error("Load failed"),
			);

			await expect(failingProcessor.initialize()).rejects.toThrow(
				"Failed to initialize FFmpeg",
			);
		});
	});

	describe("progress tracking", () => {
		it("should set progress callback", () => {
			const callback = vi.fn();
			processor.onProgress(callback);
			expect(processor["progressCallback"]).toBe(callback);
		});
	});

	describe("cropVideo", () => {
		it("should throw error if not initialized", async () => {
			const crop: CropRegion = { x: 10, y: 20, width: 640, height: 480 };
			await expect(processor.cropVideo(mockFile, crop)).rejects.toThrow(
				"FFmpeg not initialized",
			);
		});

		it("should generate correct crop command", async () => {
			await processor.initialize();
			const crop: CropRegion = { x: 10, y: 20, width: 640, height: 480 };
			const execSpy = vi.spyOn(processor["ffmpeg"], "exec");

			await processor.cropVideo(mockFile, crop);

			expect(execSpy).toHaveBeenCalledWith([
				"-i",
				"input.mp4",
				"-vf",
				"crop=640:480:10:20",
				"-c:a",
				"copy",
				"output.mp4",
			]);
		});

		it("should return a Blob", async () => {
			await processor.initialize();
			const crop: CropRegion = { x: 0, y: 0, width: 640, height: 480 };
			const result = await processor.cropVideo(mockFile, crop);
			expect(result).toBeInstanceOf(Blob);
		});

		it("should cleanup files on error", async () => {
			await processor.initialize();
			const crop: CropRegion = { x: 0, y: 0, width: 640, height: 480 };
			const deleteSpy = vi.spyOn(processor["ffmpeg"], "deleteFile");
			vi.spyOn(processor["ffmpeg"], "exec").mockRejectedValueOnce(
				new Error("Exec failed"),
			);

			await expect(processor.cropVideo(mockFile, crop)).rejects.toThrow(
				"Failed to crop video",
			);
			expect(deleteSpy).toHaveBeenCalled();
		});
	});

	describe("compressVideo", () => {
		it("should throw error if not initialized", async () => {
			const settings: CompressionSettings = { quality: 5, codec: "h264" };
			await expect(processor.compressVideo(mockFile, settings)).rejects.toThrow(
				"FFmpeg not initialized",
			);
		});

		it("should generate correct h264 compression command", async () => {
			await processor.initialize();
			const settings: CompressionSettings = { quality: 5, codec: "h264" };
			const execSpy = vi.spyOn(processor["ffmpeg"], "exec");

			await processor.compressVideo(mockFile, settings);

			const args = execSpy.mock.calls[0][0];
			expect(args).toContain("-c:v");
			expect(args).toContain("libx264");
			expect(args).toContain("-crf");
			expect(args).toContain("-c:a");
			expect(args).toContain("copy");
		});

		it("should generate correct vp9 compression command", async () => {
			await processor.initialize();
			const settings: CompressionSettings = { quality: 8, codec: "vp9" };
			const execSpy = vi.spyOn(processor["ffmpeg"], "exec");

			await processor.compressVideo(mockFile, settings);

			const args = execSpy.mock.calls[0][0];
			expect(args).toContain("-c:v");
			expect(args).toContain("libvpx-vp9");
		});

		it("should include bitrate when specified", async () => {
			await processor.initialize();
			const settings: CompressionSettings = {
				quality: 5,
				codec: "h264",
				targetBitrate: 2000000,
			};
			const execSpy = vi.spyOn(processor["ffmpeg"], "exec");

			await processor.compressVideo(mockFile, settings);

			const args = execSpy.mock.calls[0][0];
			expect(args).toContain("-b:v");
			expect(args).toContain("2000000");
		});

		it("should include scale when specified", async () => {
			await processor.initialize();
			const settings: CompressionSettings = {
				quality: 5,
				codec: "h264",
				scaleWidth: 1280,
				scaleHeight: 720,
			};
			const execSpy = vi.spyOn(processor["ffmpeg"], "exec");

			await processor.compressVideo(mockFile, settings);

			const args = execSpy.mock.calls[0][0];
			expect(args).toContain("-vf");
			expect(args).toContain("scale=1280:720");
		});
	});

	describe("trimVideo", () => {
		it("should throw error if not initialized", async () => {
			const range: TrimRange = { startTime: 5, endTime: 15 };
			await expect(processor.trimVideo(mockFile, range)).rejects.toThrow(
				"FFmpeg not initialized",
			);
		});

		it("should generate correct trim command", async () => {
			await processor.initialize();
			const range: TrimRange = { startTime: 5, endTime: 15 };
			const execSpy = vi.spyOn(processor["ffmpeg"], "exec");

			await processor.trimVideo(mockFile, range);

			expect(execSpy).toHaveBeenCalledWith([
				"-i",
				"input.mp4",
				"-ss",
				"5",
				"-to",
				"15",
				"-c",
				"copy",
				"output.mp4",
			]);
		});
	});

	describe("convertFormat", () => {
		it("should throw error if not initialized", async () => {
			const format: VideoFormat = {
				container: "webm",
				videoCodec: "libvpx-vp9",
				audioCodec: "libopus",
			};
			await expect(processor.convertFormat(mockFile, format)).rejects.toThrow(
				"FFmpeg not initialized",
			);
		});

		it("should generate correct format conversion command", async () => {
			await processor.initialize();
			const format: VideoFormat = {
				container: "webm",
				videoCodec: "libvpx-vp9",
				audioCodec: "libopus",
			};
			const execSpy = vi.spyOn(processor["ffmpeg"], "exec");

			await processor.convertFormat(mockFile, format);

			expect(execSpy).toHaveBeenCalledWith([
				"-i",
				"input.mp4",
				"-c:v",
				"libvpx-vp9",
				"-c:a",
				"libopus",
				"output.webm",
			]);
		});

		it("should return blob with correct MIME type", async () => {
			await processor.initialize();
			const format: VideoFormat = {
				container: "webm",
				videoCodec: "libvpx-vp9",
				audioCodec: "libopus",
			};

			const result = await processor.convertFormat(mockFile, format);

			expect(result.type).toBe("video/webm");
		});
	});

	describe("processQueue", () => {
		it("should throw error if not initialized", async () => {
			const operations: VideoOperation[] = [
				{
					id: "1",
					type: "crop",
					params: { x: 0, y: 0, width: 640, height: 480 },
					order: 0,
				},
			];
			await expect(
				processor.processQueue(mockFile, operations),
			).rejects.toThrow("FFmpeg not initialized");
		});

		it("should throw error if operations array is empty", async () => {
			await processor.initialize();
			await expect(processor.processQueue(mockFile, [])).rejects.toThrow(
				"No operations to process",
			);
		});

		it("should process operations in order", async () => {
			await processor.initialize();
			const operations: VideoOperation[] = [
				{
					id: "2",
					type: "trim",
					params: { startTime: 0, endTime: 10 },
					order: 1,
				},
				{
					id: "1",
					type: "crop",
					params: { x: 0, y: 0, width: 640, height: 480 },
					order: 0,
				},
			];

			const cropSpy = vi.spyOn(processor, "cropVideo");
			const trimSpy = vi.spyOn(processor, "trimVideo");

			await processor.processQueue(mockFile, operations);

			// Verify crop was called before trim (order 0 before order 1)
			expect(cropSpy).toHaveBeenCalled();
			expect(trimSpy).toHaveBeenCalled();
		});

		it("should handle all operation types", async () => {
			await processor.initialize();
			const operations: VideoOperation[] = [
				{
					id: "1",
					type: "crop",
					params: { x: 0, y: 0, width: 640, height: 480 },
					order: 0,
				},
				{
					id: "2",
					type: "compress",
					params: { quality: 5, codec: "h264" },
					order: 1,
				},
				{
					id: "3",
					type: "trim",
					params: { startTime: 0, endTime: 10 },
					order: 2,
				},
				{
					id: "4",
					type: "convert",
					params: {
						container: "webm",
						videoCodec: "libvpx-vp9",
						audioCodec: "libopus",
					},
					order: 3,
				},
			];

			const result = await processor.processQueue(mockFile, operations);
			expect(result).toBeInstanceOf(Blob);
		});

		it("should throw error for unknown operation type", async () => {
			await processor.initialize();
			const operations: VideoOperation[] = [
				{
					id: "1",
					// biome-ignore lint/suspicious/noExplicitAny: it's a test
					type: "unknown" as any,
					params: { x: 0, y: 0, width: 100, height: 100 } as CropRegion,
					order: 0,
				},
			];

			await expect(
				processor.processQueue(mockFile, operations),
			).rejects.toThrow("Unknown operation type");
		});
	});

	describe("cancellation", () => {
		it("should cancel processing", async () => {
			await processor.initialize();
			const terminateSpy = vi.spyOn(processor["ffmpeg"], "terminate");

			await processor.cancel();

			expect(terminateSpy).toHaveBeenCalled();
			expect(processor["isLoaded"]).toBe(false);
		});

		it("should throw error when operation is cancelled", async () => {
			await processor.initialize();
			const crop: CropRegion = { x: 0, y: 0, width: 640, height: 480 };

			// Set up cancellation to happen during writeFile
			vi.spyOn(processor["ffmpeg"], "writeFile").mockImplementationOnce(
				async () => {
					processor["isCancelled"] = true;
					return true;
				},
			);

			await expect(processor.cropVideo(mockFile, crop)).rejects.toThrow(
				"Operation cancelled by user",
			);
		});

		it("should handle cancellation errors gracefully", async () => {
			await processor.initialize();
			vi.spyOn(processor["ffmpeg"], "terminate").mockRejectedValueOnce(
				new Error("Terminate failed"),
			);

			await expect(processor.cancel()).resolves.not.toThrow();
		});
	});

	describe("error handling", () => {
		it("should provide descriptive error messages", async () => {
			await processor.initialize();
			const crop: CropRegion = { x: 0, y: 0, width: 640, height: 480 };
			vi.spyOn(processor["ffmpeg"], "exec").mockRejectedValueOnce(
				new Error("FFmpeg error"),
			);

			await expect(processor.cropVideo(mockFile, crop)).rejects.toThrow(
				"Failed to crop video: FFmpeg error",
			);
		});

		it("should handle non-Error exceptions", async () => {
			await processor.initialize();
			const crop: CropRegion = { x: 0, y: 0, width: 640, height: 480 };
			vi.spyOn(processor["ffmpeg"], "exec").mockRejectedValueOnce(
				"String error",
			);

			await expect(processor.cropVideo(mockFile, crop)).rejects.toThrow(
				"Failed to crop video: Unknown error",
			);
		});
	});
});
