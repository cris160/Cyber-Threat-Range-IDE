import { useState } from 'react';
import { Dialog } from './Dialog';
import { invoke } from '@tauri-apps/api/core';
import { AlertTriangle } from 'lucide-react';

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemPath: string;
  itemName: string;
  itemType: 'file' | 'folder';
  onSuccess: () => void;
}

export function DeleteDialog({ isOpen, onClose, itemPath, itemName, itemType, onSuccess }: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      await invoke('delete_file', { path: itemPath });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err as string || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={`Delete ${itemType === 'folder' ? 'Folder' : 'File'}`}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="text-red-400" size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-[#CCCCCC] mb-2">
              Are you sure you want to delete <span className="font-semibold text-white">"{itemName}"</span>?
            </p>
            {itemType === 'folder' && (
              <p className="text-[12px] text-[#858585]">
                This will permanently delete the folder and all its contents.
              </p>
            )}
            {itemType === 'file' && (
              <p className="text-[12px] text-[#858585]">
                This action cannot be undone.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded">
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-[#3C3C3C] hover:bg-[#505050] text-[#CCCCCC] rounded text-[13px] transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
