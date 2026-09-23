import React from 'react';
import { Car } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

/** Logo du site : l'image choisie dans « Paramètres », sinon la pastille voiture. */
export const BrandLogo: React.FC<{
  size?: number;
  iconSize?: number;
  background: string;
  className?: string;
}> = ({ size = 40, iconSize = 18, background, className = '' }) => {
  const { settings } = useSiteSettings();
  if (settings.logoUrl) {
    return (
      <img
        src={settings.logoUrl}
        alt={settings.siteName + settings.siteNameAccent}
        className={`object-contain shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, background }}
    >
      <Car size={iconSize} className="text-white" />
    </div>
  );
};

/** Nom du site, la seconde partie mise en couleur. */
export const BrandName: React.FC<{ accentClassName?: string; accentColor?: string }> = ({
  accentClassName = 'text-aurora', accentColor,
}) => {
  const { settings } = useSiteSettings();
  return (
    <>
      {settings.siteName}
      {settings.siteNameAccent && (
        <span className={accentColor ? '' : accentClassName} style={accentColor ? { color: accentColor } : undefined}>
          {settings.siteNameAccent}
        </span>
      )}
    </>
  );
};
