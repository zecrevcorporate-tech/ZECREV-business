import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Business, LocationCoords } from './types';
import { findNearbyBusinesses } from './services/geminiService';
import BusinessCard from './components/BusinessCard';
import Loader from './components/Loader';
import { SearchIcon } from './components/Icons';
import BusinessDetailModal from './components/BusinessDetailModal';

const getDistance = (loc1: LocationCoords, loc2: { latitude: number; longitude: number }): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (loc2.latitude - loc1.latitude) * (Math.PI / 180);
    const dLon = (loc2.longitude - loc1.longitude) * (Math.PI / 180);
    const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * (Math.PI / 180)) *
    Math.cos(loc2.latitude * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};


const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [manualLocation, setManualLocation] = useState<string>('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [favorites, setFavorites] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(50);

  // Load favorites from localStorage on initial render
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('favoriteBusinesses');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (e) {
      console.error("Failed to parse favorites from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (err) => {
          setLocationError(`Error getting location: ${err.message}. Please enable location services or enter a location below.`);
          setError(null);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  }, []);
  
  const isFavorite = useCallback(
    (business: Business) => favorites.some((fav) => fav.placeId === business.placeId),
    [favorites]
  );
  
  const toggleFavorite = useCallback((business: Business) => {
    let updatedFavorites: Business[];
    if (isFavorite(business)) {
      updatedFavorites = favorites.filter((fav) => fav.placeId !== business.placeId);
    } else {
      updatedFavorites = [...favorites, business];
    }
    setFavorites(updatedFavorites);
    localStorage.setItem('favoriteBusinesses', JSON.stringify(updatedFavorites));
  }, [favorites, isFavorite]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a business category to search.');
      return;
    }
    if (!location && !manualLocation.trim()) {
        setError('Could not get your location. Please enable location services in your browser or enter a location manually.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setBusinesses([]);

    try {
      const results = await findNearbyBusinesses(searchTerm, location, manualLocation);
      if (results.length === 0) {
        setError(`No results found for "${searchTerm}". Try a different category or location.`);
      }
      setBusinesses(results);
    } catch (err) {
      if (err instanceof Error) {
          setError(err.message);
      } else {
          setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, location, manualLocation]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleShowDetails = (business: Business) => {
    setSelectedBusiness(business);
  };
  
  const handleCloseModal = () => {
    setSelectedBusiness(null);
  }
  
  const businessesWithDistance = useMemo(() => {
    if (!location) {
        return businesses.map(biz => ({ biz, distance: undefined }));
    }
    return businesses
        .map(biz => {
            if (biz.latitude && biz.longitude) {
                const distance = getDistance(location, { latitude: biz.latitude, longitude: biz.longitude });
                return { biz, distance };
            }
            // Cannot calculate distance, but keep in list unless filtered by other means
            return { biz, distance: undefined };
        })
        .filter(({ distance }) => distance === undefined || distance <= searchRadius)
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [businesses, searchRadius, location]);

  const renderFavorites = () => {
    if (favorites.length === 0) return null;
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-sky-300 border-b-2 border-slate-700 pb-2 mb-6">
          ⭐ Your Favorites
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((fav) => (
            <BusinessCard
              key={fav.placeId}
              business={fav}
              isFavorite={true}
              onToggleFavorite={toggleFavorite}
              onShowDetails={handleShowDetails}
              distance={location && fav.latitude && fav.longitude ? getDistance(location, fav as LocationCoords) : undefined}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }
    if (error) {
      return <p className="text-center text-red-400 mt-8">{error}</p>;
    }
    if (businesses.length > 0) {
      if (businessesWithDistance.length > 0) {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {businessesWithDistance.map(({ biz, distance }) => (
              <BusinessCard 
                key={biz.placeId} 
                business={biz}
                isFavorite={isFavorite(biz)}
                onToggleFavorite={toggleFavorite}
                onShowDetails={handleShowDetails}
                distance={distance}
              />
            ))}
          </div>
        );
      }
      return <p className="text-center text-slate-400 mt-8">No results found within {searchRadius}km. Try increasing the search radius.</p>;
    }
    if (!isLoading && businesses.length === 0 && !error && favorites.length === 0) {
        return (
            <div className="text-center mt-12 text-slate-400">
                <h2 className="text-2xl font-semibold">Welcome to the Business Finder</h2>
                <p className="mt-2">Enter a category like "pizza", "plumbers", or "gyms" to find businesses near you.</p>
            </div>
        )
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div 
        className="absolute top-0 left-0 w-full h-full bg-cover bg-center opacity-10"
        style={{backgroundImage: "url('https://picsum.photos/1920/1080?grayscale&blur=2')"}}>
      </div>
      <div className="relative max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
            Nearby Business Finder
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Real-time lead generation for any business category.
          </p>
        </header>

        <div className="sticky top-4 z-10 bg-slate-900/50 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., coffee shops, electricians, bookstores..."
                className="w-full pl-5 pr-12 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || (!location && !manualLocation.trim())}
              className="flex items-center justify-center px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300 shadow-lg shadow-sky-600/30"
            >
              <SearchIcon className="h-5 w-5 mr-2" />
              <span>{isLoading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
           {locationError && (
            <div className="mt-4">
                <p className="text-center text-yellow-400 mb-2 text-sm">{locationError}</p>
                 <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Or enter a city, state, or zip code"
                    className="w-full pl-5 pr-5 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                    disabled={isLoading}
                    aria-label="Manual location input"
                 />
            </div>
           )}
           {location && (
            <div className="mt-4">
              <label htmlFor="radius-slider" className="block text-sm font-medium text-slate-300 mb-2">
                Search Radius: <span className="font-bold text-sky-400">{searchRadius} km</span>
              </label>
              <input
                id="radius-slider"
                type="range"
                min="1"
                max="50"
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-thumb"
                disabled={isLoading}
              />
            </div>
           )}
        </div>

        <main className="mt-6">
          {renderFavorites()}
          {renderContent()}
        </main>
        
        {selectedBusiness && (
            <BusinessDetailModal
                business={selectedBusiness}
                category={searchTerm}
                onClose={handleCloseModal}
            />
        )}
      </div>
      <style>{`
        .range-thumb::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            background: #0ea5e9;
            cursor: pointer;
            border-radius: 50%;
            border: 2px solid #fff;
        }

        .range-thumb::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: #0ea5e9;
            cursor: pointer;
            border-radius: 50%;
            border: 2px solid #fff;
        }
      `}</style>
    </div>
  );
};

export default App;