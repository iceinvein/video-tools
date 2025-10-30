/**
 * Error Boundary Component
 *
 * Catches and displays errors that occur in child components.
 * Provides a fallback UI and option to reset the error state.
 */

import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onReset?: () => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		console.error("Error caught by boundary:", error, errorInfo);
		this.setState({
			error,
			errorInfo,
		});
	}

	handleReset = (): void => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
		this.props.onReset?.();
	};

	render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="container mx-auto px-4 py-8 max-w-2xl">
					<Card className="border-2 border-danger">
						<CardBody className="gap-4">
							<div className="flex items-start gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
									className="w-8 h-8 text-danger shrink-0"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
									/>
								</svg>
								<div className="flex-1">
									<h2 className="text-xl font-bold text-danger mb-2">
										Something went wrong
									</h2>
									<p className="text-sm text-default-600 mb-4">
										An unexpected error occurred. Please try again or refresh
										the page.
									</p>
									{this.state.error && (
										<details className="mb-4">
											<summary className="text-sm font-medium text-default-700 cursor-pointer hover:text-default-900">
												Error details
											</summary>
											<div className="mt-2 p-3 bg-default-100 rounded-lg">
												<p className="text-xs font-mono text-danger-600 wrap-break-word">
													{this.state.error.toString()}
												</p>
												{this.state.errorInfo && (
													<pre className="text-xs font-mono text-default-600 mt-2 overflow-x-auto">
														{this.state.errorInfo.componentStack}
													</pre>
												)}
											</div>
										</details>
									)}
									<div className="flex gap-2">
										<Button color="primary" onPress={this.handleReset}>
											Try Again
										</Button>
										<Button
											color="default"
											variant="bordered"
											onPress={() => window.location.reload()}
										>
											Refresh Page
										</Button>
									</div>
								</div>
							</div>
						</CardBody>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}
