import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import type { DraggableData, DraggableEvent } from 'react-draggable';
import type { PDFField } from '../types';
import './DraggableField.css';

interface DraggableFieldProps {
    field: PDFField;
    containerWidth: number;
    containerHeight: number;
    onUpdate: (id: string, updates: Partial<PDFField>) => void;
    onSelect: (id: string) => void;
    isSelected?: boolean;
}

const DraggableField: React.FC<DraggableFieldProps> = ({
    field,
    containerWidth,
    containerHeight,
    onUpdate,
    onSelect,
    isSelected
}) => {
    const nodeRef = useRef(null);

    // Convert % to px for position
    const xPx = (field.x / 100) * containerWidth;
    const yPx = (field.y / 100) * containerHeight;
    const wPx = (field.width / 100) * containerWidth;
    const hPx = (field.height / 100) * containerHeight;

    const handleDragStop = (_e: DraggableEvent, data: DraggableData) => {
        // Convert back to %
        const newXPercent = (data.x / containerWidth) * 100;
        const newYPercent = (data.y / containerHeight) * 100;
        onUpdate(field.id, { x: newXPercent, y: newYPercent });
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(field.id);
    };

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: xPx, y: yPx }}
            onStop={handleDragStop}
            bounds="parent"
            cancel="input" // Allow interacting with inputs without dragging (unless clicking handle)
        >
            <div
                ref={nodeRef}
                className={`draggable-field ${isSelected ? 'selected' : ''}`}
                style={{ width: wPx, height: hPx }}
                onClick={handleClick}
            >
                <div className="field-handle" />
                {field.type === 'text' && (
                    <input
                        type="text"
                        defaultValue={field.value as string}
                        className="field-input"
                        onChange={(e) => onUpdate(field.id, { value: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start when clicking input
                    />
                )}
                {field.type === 'checkbox' && (
                    <input
                        type="checkbox"
                        checked={!!field.value}
                        className="field-checkbox"
                        readOnly
                    />
                )}
            </div>
        </Draggable>
    );
};

export default DraggableField;
