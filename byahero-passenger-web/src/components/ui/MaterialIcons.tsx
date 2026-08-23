import React from 'react';

interface MaterialIconsProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export const MaterialIcons: React.FC<MaterialIconsProps> = ({
  name,
  size = 24,
  color = 'currentColor',
  className = '',
}) => {
  // Map common mobile MaterialIcons names to Google Material Icons standard font glyphs
  let iconName = name;
  if (name === 'arrow-back') iconName = 'arrow_back';
  if (name === 'check-circle') iconName = 'check_circle';
  if (name === 'error-outline') iconName = 'error_outline';
  if (name === 'info-outline') iconName = 'info';

  return (
    <span
      className={`material-icons select-none leading-none inline-flex items-center justify-center ${className}`}
      style={{
        fontSize: `${size}px`,
        color: color,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {iconName}
    </span>
  );
};
export default MaterialIcons;
