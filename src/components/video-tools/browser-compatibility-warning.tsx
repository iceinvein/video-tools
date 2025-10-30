/**
 * Browser Compatibility Warning Component
 *
 * Displays a warning banner when the user's browser doesn't support
 * required features for video processing.
 */

import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { useEffect, useState } from "react";
import {
	type BrowserInfo,
	getBrowserCompatibility,
	getCompatibilityMessage,
	getRecommendedBrowsers,
} from "../../utils/browser-compatibility";

export interface BrowserCompatibilityWarningProps {
	/** Whether to show the warning even if browser is supported (for testing) */
	forceShow?: boolean;
	/** Callback when user dismisses the warning */
	onDismiss?: () => void;
}

export function BrowserCompatibilityWarning({
	forceShow = false,
	onDismiss,
}: BrowserCompatibilityWarningProps) {
	const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
	const [isDismissed, setIsDismissed] = useState(false);
	const [showDetails, setShowDetails] = useState(false);

	useEffect(() => {
		const info = getBrowserCompatibility();
		setBrowserInfo(info);
	}, []);

	const handleDismiss = () => {
		setIsDismissed(true);
		onDismiss?.();
	};

	const toggleDetails = () => {
		setShowDetails((prev) => !prev);
	};

	// Don't show if dismissed or browser is supported (unless forced)
	if (isDismissed || !browserInfo || (browserInfo.isSupported && !forceShow)) {
		return null;
	}

	const recommendedBrowsers = getRecommendedBrowsers();
	const message = getCompatibilityMessage(browserInfo);

	return (
		<Card className="w-full border-2 border-warning">
			<CardBody className="p-3 md:p-4">
				<div className="flex items-start gap-2 md:gap-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2}
						stroke="currentColor"
						className="w-5 h-5 md:w-6 md:h-6 text-warning shrink-0"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
						/>
					</svg>
					<div className="flex-1 min-w-0">
						<h3 className="text-sm md:text-base font-semibold text-warning-800 dark:text-warning-500 mb-1">
							Browser Compatibility Warning
						</h3>
						<p className="text-xs md:text-sm text-warning-700 dark:text-warning-400 mb-2 wrap-break-word">
							{message}
						</p>

						{browserInfo.missingFeatures.length > 0 && (
							<div className="mb-3">
								<button
									type="button"
									onClick={toggleDetails}
									className="text-xs md:text-sm text-warning-700 dark:text-warning-400 underline hover:text-warning-800 dark:hover:text-warning-300 focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2 rounded min-h-[44px] md:min-h-0 inline-flex items-center"
								>
									{showDetails ? "Hide details" : "Show details"}
								</button>

								{showDetails && (
									<div className="mt-2 p-2 md:p-3 bg-warning-50 dark:bg-warning-50/10 rounded-lg">
										<p className="text-xs font-semibold text-warning-800 dark:text-warning-500 mb-2">
											Missing Features:
										</p>
										<ul className="space-y-1">
											{browserInfo.missingFeatures.map((feature) => (
												<li
													key={feature}
													className="text-xs text-warning-700 dark:text-warning-400"
												>
													• {feature}
												</li>
											))}
										</ul>

										<div className="mt-3 pt-3 border-t border-warning-200 dark:border-warning-200/20">
											<p className="text-xs font-semibold text-warning-800 dark:text-warning-500 mb-2">
												Recommended Browsers:
											</p>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												{recommendedBrowsers.map((browser) => (
													<a
														key={browser.name}
														href={browser.downloadUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="flex items-center justify-between p-2 bg-white dark:bg-default-100 rounded border border-warning-200 dark:border-warning-200/20 hover:border-warning-400 dark:hover:border-warning-400/40 transition-colors min-h-[44px]"
													>
														<div>
															<p className="text-xs font-medium text-default-900">
																{browser.name}
															</p>
															<p className="text-xs text-default-500">
																{browser.minVersion}
															</p>
														</div>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
															strokeWidth={2}
															stroke="currentColor"
															className="w-4 h-4 text-default-400"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
															/>
														</svg>
													</a>
												))}
											</div>
										</div>
									</div>
								)}
							</div>
						)}

						<div className="flex flex-col sm:flex-row gap-2">
							<Button
								size="sm"
								color="warning"
								variant="flat"
								onPress={handleDismiss}
								className="min-h-[44px] md:min-h-0"
							>
								I Understand, Continue Anyway
							</Button>
						</div>
					</div>
					<Button
						isIconOnly
						size="sm"
						variant="light"
						onPress={handleDismiss}
						aria-label="Dismiss warning"
						className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={2}
							stroke="currentColor"
							className="w-4 h-4"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</Button>
				</div>
			</CardBody>
		</Card>
	);
}
