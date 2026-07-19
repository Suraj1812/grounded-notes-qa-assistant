import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { UploadIcon } from './icons/UploadIcon';

type NoteUploadFormProps = {
  disabled: boolean;
  uploading: boolean;
  onUpload: (files: File[]) => Promise<boolean>;
};

export function NoteUploadForm({ disabled, uploading, onUpload }: NoteUploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    setFiles(Array.from(event.target.files ?? []));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (files.length === 0) return;
    if (!await onUpload(files)) return;
    setFiles([]);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <form className="admin-section upload-section" onSubmit={(event) => void handleSubmit(event)}>
      <div className="admin-section-heading">
        <h2>Upload notes</h2>
        <p>Markdown only · 20 files maximum · 512 KB each</p>
      </div>
      <div className="upload-controls">
        <label className={`file-picker ${disabled ? 'disabled' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept=".md,text/markdown,text/x-markdown"
            multiple
            disabled={disabled}
            onChange={handleChange}
          />
          <UploadIcon />
          <span>{files.length > 0 ? `${files.length} selected` : 'Choose files'}</span>
        </label>
        <button className="primary-button" type="submit" disabled={disabled || files.length === 0}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {files.length > 0 && (
        <ul className="selected-files" aria-label="Selected files">
          {files.map((file) => <li key={`${file.name}-${file.size}-${file.lastModified}`}>{file.name}</li>)}
        </ul>
      )}
    </form>
  );
}
