'use client';

import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}) {
  const confirmVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {message && (
        <p className="text-sm text-gray-600 mb-6">{message}</p>
      )}
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" size="md" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          size="md"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
