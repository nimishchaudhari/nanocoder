import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {InputState, PlaceholderType} from '../types/hooks';
import {handlePaste} from '../utils/paste-utils';
import {PasteDetector} from '../utils/paste-detection';
import {handleAtomicDeletion} from '../utils/atomic-deletion';

// Helper functions
function createEmptyInputState(): InputState {
	return {
		displayValue: '',
		placeholderContent: {},
	};
}

function _createInputStateFromString(text: string): InputState {
	// Convert old string-based history to new InputState format
	return {
		displayValue: text,
		placeholderContent: {},
	};
}

export function useInputState() {
	// Core state following the spec
	const [currentState, setCurrentState] = useState<InputState>(
		createEmptyInputState(),
	);

	const [undoStack, setUndoStack] = useState<InputState[]>([]);
	const [redoStack, setRedoStack] = useState<InputState[]>([]);

	// Legacy compatibility - these are derived from currentState
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [_hasLargeContent, setHasLargeContent] = useState(false);
	const [originalInput, setOriginalInput] = useState('');

	// Paste detection
	const pasteDetectorRef = useRef(new PasteDetector());
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Cached line count for performance
	const [cachedLineCount, setCachedLineCount] = useState(1);

	// Helper to push current state to undo stack
	const pushToUndoStack = useCallback(
		(newState: InputState) => {
			setUndoStack(prev => [...prev, currentState]);
			setRedoStack([]); // Clear redo stack on new action
			setCurrentState(newState);
		},
		[currentState],
	);

	// Update input with paste detection and atomic deletion
	const updateInput = useCallback(
		(newInput: string) => {
			// First, check for atomic deletion (placeholder removal)
			const atomicDeletionResult = handleAtomicDeletion(currentState, newInput);
			if (atomicDeletionResult) {
				// Atomic deletion occurred - apply it
				pushToUndoStack(atomicDeletionResult);
				return;
			}

			// Then detect if this might be a paste
			const detection = pasteDetectorRef.current.detectPaste(newInput);

			if (detection.isPaste && detection.addedText.length > 0) {
				// Try to handle as paste
				const pasteResult = handlePaste(
					detection.addedText,
					currentState.displayValue,
					currentState.placeholderContent,
					detection.method as 'rate' | 'size' | 'multiline',
				);

				if (pasteResult) {
					// Large paste detected - create placeholder
					pushToUndoStack(pasteResult);
					// Update paste detector state to match the new display value (with placeholder)
					// This prevents detection confusion on subsequent pastes
					pasteDetectorRef.current.updateState(pasteResult.displayValue);
				} else {
					// Small paste - treat as normal input
					pushToUndoStack({
						displayValue: newInput,
						placeholderContent: currentState.placeholderContent,
					});
				}
			} else {
				// Normal typing
				pushToUndoStack({
					displayValue: newInput,
					placeholderContent: currentState.placeholderContent,
				});
			}

			// Update derived state
			const immediateLineCount = Math.max(
				1,
				newInput.split(/\r\n|\r|\n/).length,
			);
			setCachedLineCount(immediateLineCount);

			// Clear any previous debounce timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(() => {
				setHasLargeContent(newInput.length > 150);
			}, 50);
		},
		[currentState, pushToUndoStack],
	);

	// Undo function (Ctrl+_)
	const undo = useCallback(() => {
		if (undoStack.length > 0) {
			const previousState = undoStack[undoStack.length - 1];
			const newUndoStack = undoStack.slice(0, -1);

			setRedoStack(prev => [...prev, currentState]);
			setUndoStack(newUndoStack);
			setCurrentState(previousState);

			// Update paste detector state
			pasteDetectorRef.current.updateState(previousState.displayValue);
		}
	}, [undoStack, currentState]);

	// Redo function (Ctrl+Y)
	const redo = useCallback(() => {
		if (redoStack.length > 0) {
			const nextState = redoStack[redoStack.length - 1];
			const newRedoStack = redoStack.slice(0, -1);

			setUndoStack(prev => [...prev, currentState]);
			setRedoStack(newRedoStack);
			setCurrentState(nextState);

			// Update paste detector state
			pasteDetectorRef.current.updateState(nextState.displayValue);
		}
	}, [redoStack, currentState]);

	// Delete placeholder atomically
	const deletePlaceholder = useCallback(
		(placeholderId: string) => {
			const placeholderPattern = `[Paste #${placeholderId}: \\d+ chars]`;
			const regex = new RegExp(
				placeholderPattern.replace(/[[\]]/g, '\\$&'),
				'g',
			);

			const newDisplayValue = currentState.displayValue.replace(regex, '');
			const newPlaceholderContent = {...currentState.placeholderContent};
			delete newPlaceholderContent[placeholderId];

			pushToUndoStack({
				displayValue: newDisplayValue,
				placeholderContent: newPlaceholderContent,
			});
		},
		[currentState, pushToUndoStack],
	);

	// Reset all state
	const resetInput = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}

		setCurrentState(createEmptyInputState());
		setUndoStack([]);
		setRedoStack([]);
		setHasLargeContent(false);
		setOriginalInput('');
		setHistoryIndex(-1);
		setCachedLineCount(1);
		pasteDetectorRef.current.reset();
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
		};
	}, []);

	// Set full InputState (for history navigation)
	const setInputState = useCallback((newState: InputState) => {
		setCurrentState(newState);
		pasteDetectorRef.current.updateState(newState.displayValue);
	}, []);

	// Legacy setters for compatibility
	const setInput = useCallback((newInput: string) => {
		setCurrentState(prev => ({
			...prev,
			displayValue: newInput,
		}));
		pasteDetectorRef.current.updateState(newInput);
	}, []);

	// Compute legacy pastedContent for backward compatibility
	const legacyPastedContent = useMemo(() => {
		const pastedContent: Record<string, string> = {};
		Object.entries(currentState.placeholderContent).forEach(([id, content]) => {
			if (content.type === PlaceholderType.PASTE) {
				pastedContent[id] = content.content;
			}
		});
		return pastedContent;
	}, [currentState.placeholderContent]);

	return useMemo(
		() => ({
			// New spec-compliant interface
			currentState,
			undoStack,
			redoStack,
			undo,
			redo,
			deletePlaceholder,
			setInputState,

			// Legacy interface for compatibility
			input: currentState.displayValue,
			originalInput,
			historyIndex,
			setInput,
			setOriginalInput,
			setHistoryIndex,
			updateInput,
			resetInput,
			cachedLineCount,
			// Computed legacy property for backward compatibility
			pastedContent: legacyPastedContent,
		}),
		[
			currentState,
			undoStack,
			redoStack,
			undo,
			redo,
			deletePlaceholder,
			setInputState,
			originalInput,
			historyIndex,
			setInput,
			updateInput,
			resetInput,
			cachedLineCount,
			legacyPastedContent,
		],
	);
}
