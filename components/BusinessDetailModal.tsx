import React, { useState, useEffect } from 'react';
import { Business, BusinessDetails } from '../types';
import { getBusinessDetails, generateContactPitch } from '../services/geminiService';
import Loader from './Loader';
import { 
    BuildingOfficeIcon, 
    ClockIcon, 
    PhoneIcon, 
    XMarkIcon, 
    ExternalLinkIcon, 
    SparklesIcon, 
    ClipboardDocumentIcon 
} from './Icons';

interface BusinessDetailModalProps {
  business: Business;
  category: string;
  onClose: () => void;
}

const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({ business, category, onClose }) => {
  const [details, setDetails] = useState<BusinessDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [pitch, setPitch] = useState<string>('');
  const [isPitchLoading, setIsPitchLoading] = useState(false);
  const [pitchError, setPitchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getBusinessDetails(business.placeId);
        setDetails(result);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred while fetching details.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [business.placeId]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
  
  const handleGeneratePitch = async () => {
    setIsPitchLoading(true);
    setPitchError(null);
    setPitch('');
    try {
      if (!category) {
        throw new Error("Business category is not available. Please perform a search first.");
      }
      const result = await generateContactPitch(business.title, category);
      setPitch(result);
    } catch (err) {
      if (err instanceof Error) {
        setPitchError(err.message);
      } else {
        setPitchError('An unknown error occurred while generating the pitch.');
      }
    } finally {
      setIsPitchLoading(false);
    }
  };

  const handleCopyPitch = () => {
    if (!pitch) return;
    navigator.clipboard.writeText(pitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const renderDetailItem = (Icon: React.ElementType, text?: string | null, href?: string) => {
    if (!text) return null;
    
    const content = (
      <div className="flex items-center gap-4">
        <Icon className="h-6 w-6 text-sky-400 flex-shrink-0" />
        <span className="text-slate-300">{text}</span>
      </div>
    );
    
    if (href) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg hover:bg-slate-700/50 transition-colors">{content}</a>
    }
    
    return <div className="p-3">{content}</div>
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-details-title"
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-auto relative transform transition-all duration-300 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700">
          <h2 id="business-details-title" className="text-2xl font-bold text-sky-300 pr-10">{business.title}</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            aria-label="Close details"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>

        <div className="p-6">
          {isLoading && <Loader />}
          {error && <p className="text-center text-red-400">{error}</p>}
          {!isLoading && !error && details && (
            <div className="space-y-3">
              {renderDetailItem(BuildingOfficeIcon, details.address)}
              {renderDetailItem(PhoneIcon, details.phone, `tel:${details.phone}`)}
              {details.website && renderDetailItem(ExternalLinkIcon, details.website, details.website)}

              {details.hours && details.hours.length > 0 && (
                <div className="p-3">
                    <div className="flex items-start gap-4">
                        <ClockIcon className="h-6 w-6 text-sky-400 flex-shrink-0 mt-1" />
                        <div className="text-slate-300">
                           <h4 className="font-semibold text-slate-200 mb-1">Opening Hours</h4>
                           <ul className="text-sm space-y-1">
                                {details.hours.map((line, index) => (
                                    <li key={index}>{line}</li>
                                ))}
                           </ul>
                        </div>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="border-t border-slate-700 p-6 bg-slate-800/50 rounded-b-2xl">
            <h3 className="text-lg font-semibold text-sky-400 mb-4 flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                Lead Generation Assistant
            </h3>
            {pitch ? (
                <div>
                <div className="relative">
                    <textarea
                    readOnly
                    value={pitch}
                    className="w-full h-40 p-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-300 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Generated contact pitch"
                    />
                    <button
                        onClick={handleCopyPitch}
                        className="absolute top-2 right-2 px-3 py-1 bg-slate-700 text-slate-200 text-xs font-semibold rounded-md hover:bg-slate-600 transition-colors flex items-center gap-1"
                    >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <button 
                    onClick={handleGeneratePitch} 
                    disabled={isPitchLoading}
                    className="mt-3 w-full flex items-center justify-center px-4 py-2 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-300 text-sm"
                >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    <span>{isPitchLoading ? 'Regenerating...' : 'Regenerate Pitch'}</span>
                </button>
                </div>
            ) : (
                <button 
                onClick={handleGeneratePitch} 
                disabled={isPitchLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300 shadow-lg shadow-sky-600/30"
                >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    <span>{isPitchLoading ? 'Generating...' : 'Generate Contact Pitch'}</span>
                </button>
            )}
            {pitchError && <p className="text-center text-red-400 mt-3 text-sm">{pitchError}</p>}
        </div>

      </div>
       <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
          
          @keyframes slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default BusinessDetailModal;