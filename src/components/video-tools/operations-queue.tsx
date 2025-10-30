/**
 * Operations Queue Component
 *
 * Displays and manages the list of pending video operations.
 * Supports reordering via drag-and-drop, removing individual operations,
 * and clearing all operations.
 */

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { useStore } from "@nanostores/react";
import { useCallback, useState } from "react";
import {
	operations,
	operationsList,
	removeOperation,
} from "../../stores/video-editor";
import type {
	CompressionSettings,
	CropRegion,
	TrimRange,
	VideoOperation,
} from "../../types/video-tools";

export interface OperationsQueueProps {
	/** Callback when operations are reordered */
	onReorder?: (operations: VideoOperation[]) => void;
	/** Callback when all operations are cleared */
	onClear?: () => void;
}

/**
 * Format operation parameters for display
 */
function formatOperationParams(operation: VideoOperation): string {
	switch (operation.type) {
		case "crop": {
			const crop = operation.params as CropRegion;
			return `${Math.round(crop.width)}×${Math.round(crop.height)} at (${Math.round(crop.x)}, ${Math.round(crop.y)})`;
		}
		case "compress": {
			const compress = operation.params as CompressionSettings;
			return `Quality: ${compress.quality}/10, Codec: ${compress.codec.toUpperCase()}`;
		}
		case "trim": {
			const trim = operation.params as TrimRange;
			return `${trim.startTime.toFixed(1)}s - ${trim.endTime.toFixed(1)}s (${(trim.endTime - trim.startTime).toFixed(1)}s)`;
		}
		default:
			return "";
	}
}

/**
 * Get display label for operation type
 */
function getOperationLabel(type: VideoOperation["type"]): string {
	switch (type) {
		case "crop":
			return "Crop";
		case "compress":
			return "Compress";
		case "trim":
			return "Trim";
		default:
			return type;
	}
}

/**
 * Get color for operation type chip
 */
function getOperationColor(
	type: VideoOperation["type"],
): "primary" | "secondary" | "success" | "warning" {
	switch (type) {
		case "crop":
			return "primary";
		case "compress":
			return "warning";
		case "trim":
			return "secondary";
		default:
			return "primary";
	}
}

export function OperationsQueue({ onReorder, onClear }: OperationsQueueProps) {
	const ops = useStore(operationsList);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	/**
	 * Handle removing an individual operation
	 */
	const handleRemove = useCallback((operationId: string) => {
		removeOperation(operationId);
	}, []);

	/**
	 * Handle clearing all operations
	 */
	const handleClearAll = useCallback(() => {
		operations.set({});
		onClear?.();
	}, [onClear]);

	/**
	 * Handle drag start
	 */
	const handleDragStart = useCallback(
		(e: React.DragEvent<HTMLDivElement>, index: number) => {
			setDraggedIndex(index);
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/html", e.currentTarget.innerHTML);
		},
		[],
	);

	/**
	 * Handle drag over
	 */
	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>, index: number) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";

			if (draggedIndex !== null && draggedIndex !== index) {
				setDragOverIndex(index);
			}
		},
		[draggedIndex],
	);

	/**
	 * Handle drag leave
	 */
	const handleDragLeave = useCallback(() => {
		setDragOverIndex(null);
	}, []);

	/**
	 * Handle drop
	 */
	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
			e.preventDefault();
			setDragOverIndex(null);

			if (draggedIndex === null || draggedIndex === dropIndex) {
				setDraggedIndex(null);
				return;
			}

			// Reorder operations
			const reorderedOps = [...ops];
			const [draggedOp] = reorderedOps.splice(draggedIndex, 1);
			reorderedOps.splice(dropIndex, 0, draggedOp);

			// Update order property
			const updatedOps = reorderedOps.map((op, index) => ({
				...op,
				order: index,
			}));

			// Update store
			const newOpsRecord: Record<string, VideoOperation> = {};
			for (const op of updatedOps) {
				newOpsRecord[op.id] = op;
			}
			operations.set(newOpsRecord);

			// Notify parent
			onReorder?.(updatedOps);

			setDraggedIndex(null);
		},
		[draggedIndex, ops, onReorder],
	);

	/**
	 * Handle drag end
	 */
	const handleDragEnd = useCallback(() => {
		setDraggedIndex(null);
		setDragOverIndex(null);
	}, []);

	if (ops.length === 0) {
		return (
			<Card className="w-full">
				<CardHeader className="p-3 md:p-4">
					<h3 className="text-base md:text-lg font-semibold">
						Operations Queue
					</h3>
				</CardHeader>
				<CardBody className="p-3 md:p-4">
					<div className="text-center py-6 md:py-8 text-default-400">
						<p className="text-sm md:text-base">No operations added yet</p>
						<p className="text-xs md:text-sm mt-1">
							Add operations using the tools above
						</p>
					</div>
				</CardBody>
			</Card>
		);
	}

	return (
		<Card className="w-full">
			<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 md:p-4">
				<div className="flex-1 min-w-0">
					<h3 className="text-base md:text-lg font-semibold">
						Operations Queue
					</h3>
					<p className="text-xs md:text-sm text-default-500 truncate">
						{ops.length} operation{ops.length !== 1 ? "s" : ""} • Drag to
						reorder
					</p>
				</div>
				<Button
					color="danger"
					variant="light"
					size="sm"
					onPress={handleClearAll}
					className="min-h-[44px] md:min-h-0 w-full sm:w-auto"
				>
					Clear All
				</Button>
			</CardHeader>
			<CardBody className="gap-2 p-3 md:p-4">
				{ops.map((operation, index) => {
					const isDragging = draggedIndex === index;
					const isDragOver = dragOverIndex === index;

					return (
						<div
							key={operation.id}
							draggable
							onDragStart={(e) => handleDragStart(e, index)}
							onDragOver={(e) => handleDragOver(e, index)}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, index)}
							onDragEnd={handleDragEnd}
							className={`
								p-2 md:p-3 rounded-lg border-2 transition-all cursor-move
								${isDragging ? "opacity-50 border-primary" : "border-default-200"}
								${isDragOver ? "border-primary border-dashed" : ""}
								hover:border-default-300 hover:bg-default-50
							`}
						>
							<div className="flex items-start justify-between gap-2 md:gap-3">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1 md:mb-2">
										<span className="text-xs md:text-sm font-medium text-default-600">
											#{index + 1}
										</span>
										<Chip
											size="sm"
											color={getOperationColor(operation.type)}
											variant="flat"
										>
											{getOperationLabel(operation.type)}
										</Chip>
									</div>
									<p className="text-xs md:text-sm text-default-700 wrap-break-word">
										{formatOperationParams(operation)}
									</p>
								</div>
								<Button
									isIconOnly
									size="sm"
									color="danger"
									variant="light"
									onPress={() => handleRemove(operation.id)}
									aria-label={`Remove ${getOperationLabel(operation.type)} operation`}
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
						</div>
					);
				})}
			</CardBody>
		</Card>
	);
}
