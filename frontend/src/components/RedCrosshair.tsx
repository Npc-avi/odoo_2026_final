import React from 'react';

interface RedCrosshairProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const RedCrosshair: React.FC<RedCrosshairProps> = () => {
  return null;
};

export const RedTargetGlyph: React.FC<{ className?: string; spinning?: boolean }> = () => {
  return null;
};
