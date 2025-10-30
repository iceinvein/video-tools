/**
 * Browser Compatibility Utilities
 *
 * Provides functions to detect browser capabilities and display
 * compatibility warnings for unsupported features.
 */

export interface BrowserInfo {
	name: string;
	version: string;
	isSupported: boolean;
	missingFeatures: string[];
}

/**
 * Detect current browser name and version
 */
export function detectBrowser(): { name: string; version: string } {
	const userAgent = navigator.userAgent;
	let name = "Unknown";
	let version = "Unknown";

	// Chrome
	if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
		name = "Chrome";
		const match = userAgent.match(/Chrome\/(\d+)/);
		if (match) version = match[1];
	}
	// Edge
	else if (userAgent.includes("Edg")) {
		name = "Edge";
		const match = userAgent.match(/Edg\/(\d+)/);
		if (match) version = match[1];
	}
	// Firefox
	else if (userAgent.includes("Firefox")) {
		name = "Firefox";
		const match = userAgent.match(/Firefox\/(\d+)/);
		if (match) version = match[1];
	}
	// Safari
	else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
		name = "Safari";
		const match = userAgent.match(/Version\/(\d+)/);
		if (match) version = match[1];
	}

	return { name, version };
}

/**
 * Check if FFmpeg.wasm is supported in the current browser
 */
export function isFFmpegSupported(): boolean {
	// FFmpeg.wasm requires SharedArrayBuffer and WebAssembly
	const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
	const hasWebAssembly = typeof WebAssembly !== "undefined";

	return hasSharedArrayBuffer && hasWebAssembly;
}

/**
 * Check if specific browser features are supported
 */
export function checkBrowserFeatures(): {
	sharedArrayBuffer: boolean;
	webAssembly: boolean;
	fileAPI: boolean;
	canvas: boolean;
	video: boolean;
} {
	return {
		sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
		webAssembly: typeof WebAssembly !== "undefined",
		fileAPI: typeof File !== "undefined" && typeof FileReader !== "undefined",
		canvas: (() => {
			try {
				const canvas = document.createElement("canvas");
				return !!canvas.getContext?.("2d");
			} catch {
				return false;
			}
		})(),
		video: (() => {
			try {
				const video = document.createElement("video");
				return !!video.canPlayType;
			} catch {
				return false;
			}
		})(),
	};
}

/**
 * Get browser compatibility information
 */
export function getBrowserCompatibility(): BrowserInfo {
	const browser = detectBrowser();
	const features = checkBrowserFeatures();
	const missingFeatures: string[] = [];

	// Check for missing features
	if (!features.sharedArrayBuffer) {
		missingFeatures.push("SharedArrayBuffer");
	}
	if (!features.webAssembly) {
		missingFeatures.push("WebAssembly");
	}
	if (!features.fileAPI) {
		missingFeatures.push("File API");
	}
	if (!features.canvas) {
		missingFeatures.push("Canvas API");
	}
	if (!features.video) {
		missingFeatures.push("HTML5 Video");
	}

	// Check minimum browser versions
	const minVersions: Record<string, number> = {
		Chrome: 94,
		Edge: 94,
		Firefox: 90,
		Safari: 16,
	};

	const minVersion = minVersions[browser.name];
	const currentVersion = Number.parseInt(browser.version, 10);

	if (minVersion && currentVersion < minVersion) {
		missingFeatures.push(
			`${browser.name} version ${minVersion}+ required (current: ${browser.version})`,
		);
	}

	const isSupported = missingFeatures.length === 0;

	return {
		name: browser.name,
		version: browser.version,
		isSupported,
		missingFeatures,
	};
}

/**
 * Get user-friendly compatibility message
 */
export function getCompatibilityMessage(browserInfo: BrowserInfo): string {
	if (browserInfo.isSupported) {
		return `Your browser (${browserInfo.name} ${browserInfo.version}) is fully supported.`;
	}

	// Check if it's a SharedArrayBuffer issue (likely cross-origin isolation)
	if (
		browserInfo.missingFeatures.includes("SharedArrayBuffer") &&
		browserInfo.missingFeatures.length === 1
	) {
		const minVersions: Record<string, number> = {
			Chrome: 94,
			Edge: 94,
			Firefox: 90,
			Safari: 16,
		};
		const currentVersion = Number.parseInt(browserInfo.version, 10);
		const minVersion = minVersions[browserInfo.name];

		// If browser version is sufficient, it's likely a server configuration issue
		if (minVersion && currentVersion >= minVersion) {
			return `Your browser (${browserInfo.name} ${browserInfo.version}) supports video editing. SharedArrayBuffer will be enabled when you start processing. You can safely dismiss this warning.`;
		}
	}

	const features = browserInfo.missingFeatures.join(", ");
	return `Your browser (${browserInfo.name} ${browserInfo.version}) may not support all features. Missing: ${features}`;
}

/**
 * Get recommended browsers list
 */
export function getRecommendedBrowsers(): Array<{
	name: string;
	minVersion: string;
	downloadUrl: string;
}> {
	return [
		{
			name: "Google Chrome",
			minVersion: "94+",
			downloadUrl: "https://www.google.com/chrome/",
		},
		{
			name: "Microsoft Edge",
			minVersion: "94+",
			downloadUrl: "https://www.microsoft.com/edge",
		},
		{
			name: "Mozilla Firefox",
			minVersion: "90+",
			downloadUrl: "https://www.mozilla.org/firefox/",
		},
		{
			name: "Safari",
			minVersion: "16.4+",
			downloadUrl: "https://www.apple.com/safari/",
		},
	];
}

/**
 * Check if browser needs special headers for SharedArrayBuffer
 */
export function needsCrossOriginIsolation(): boolean {
	// SharedArrayBuffer requires cross-origin isolation in modern browsers
	// This is typically handled by server headers:
	// Cross-Origin-Opener-Policy: same-origin
	// Cross-Origin-Embedder-Policy: require-corp
	return (
		typeof SharedArrayBuffer === "undefined" &&
		typeof WebAssembly !== "undefined"
	);
}
