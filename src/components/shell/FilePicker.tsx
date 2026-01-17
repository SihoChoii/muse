import React, { useRef } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FilePickerProps {
    className?: string;
    onFileSelect?: (file: File) => void;
    accept?: string;
    label?: string;
    placeholder?: string; // For drag/drop text if we add it, or just aria
    file?: File | { name: string } | null; // For display
}

export const FilePicker: React.FC<FilePickerProps> = ({
    className,
    onFileSelect,
    accept = "audio/*",
    label = "Load Audio",
    file
}) => {
    const { setCurrentTrack } = useAudioStore();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (onFileSelect) {
                onFileSelect(selectedFile);
            } else {
                // Default behavior if no handler provided (legacy support or default shell behavior)
                setCurrentTrack(selectedFile);
            }
        }
    };

    return (
        <div className={cn("", className)}>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
                id={`file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
            />
            <label
                htmlFor={`file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
                className={cn(
                    "cursor-pointer inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium transition-colors",
                    file ? "bg-green-600 hover:bg-green-700" : ""
                )}
                role="button"
                tabIndex={0}
            >
                <Upload className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{file ? file.name : label}</span>
            </label>
        </div>
    );
};
