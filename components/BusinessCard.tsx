import React from 'react';
import { Business } from '../types';
import { MapPinIcon, ExternalLinkIcon, StarIcon } from './Icons';

interface BusinessCardProps {
  business: Business;
  isFavorite: boolean;
  distance?: number;
  onToggleFavorite: (business: Business) => void;
  onShowDetails: (business: Business) => void;
}

const BusinessCard: React.FC<BusinessCardProps> = ({ business, isFavorite, distance, onToggleFavorite, onShowDetails }) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleFavorite(business);
  };
  
  return (
    <button 
      onClick={() => onShowDetails(business)}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-slate-700 transform transition-all duration-300 hover:scale-105 hover:shadow-sky-500/20 relative text-left w-full cursor-pointer"
      aria-label={`View details for ${business.title}`}
    >
      <div
        onClick={handleFavoriteClick}
        className="absolute top-4 right-4 text-slate-400 hover:text-yellow-400 transition-colors duration-200 z-10 p-2 rounded-full bg-slate-800/50"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={isFavorite}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFavoriteClick(e as unknown as React.MouseEvent); }}
      >
        <StarIcon solid={isFavorite} className="h-6 w-6" />
      </div>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-12 w-12 bg-slate-700 rounded-lg flex items-center justify-center">
            <MapPinIcon className="h-6 w-6 text-sky-400" />
          </div>
          <div className="flex-grow pr-8">
            <h3 className="text-xl font-bold text-sky-300 mb-1">{business.title}</h3>
            <div className="flex items-center justify-between">
                <a
                  href={business.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-sky-400 transition-colors duration-200 group"
                >
                  View on Google Maps
                  <ExternalLinkIcon className="ml-1.5 h-4 w-4 transform transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
                {distance !== undefined && (
                    <span className="text-sm font-semibold text-slate-400 bg-slate-700/50 px-2 py-1 rounded-md">
                        {distance.toFixed(1)} km
                    </span>
                )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default BusinessCard;