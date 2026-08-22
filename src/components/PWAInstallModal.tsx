import React from 'react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = () => {
  // PWA install modal removed from UI while preserving background PWA capabilities
  return null;
};

