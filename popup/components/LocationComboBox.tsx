import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../src/supabase';

interface Location {
  id: string;
  city: string;
  state: string;
  state_code: string;
  formatted_name: string;
}

interface LocationComboBoxProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string, locationId?: string) => void;
  onZipCodeChange?: (zipCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const LocationComboBox: React.FC<LocationComboBoxProps> = ({
  id,
  name,
  value,
  onChange,
  onZipCodeChange,
  placeholder = "Enter location...",
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debug component mount
  useEffect(() => {
    console.log('🔍 DEBUG: LocationComboBox mounted with props:', { id, name, value, placeholder, disabled });
  }, []);

  // Load existing locations from database
  const loadLocations = async (searchTerm: string = '') => {
    try {
      let query = supabase
        .from('mb_locations')
        .select('*')
        .order('formatted_name');

      if (searchTerm) {
        query = query.ilike('formatted_name', `%${searchTerm}%`);
      } else {
        query = query.limit(20); // Limit to 20 when no search term
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading locations:', error);
        return;
      }

      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  // Reverse geocoding using Nominatim (free OpenStreetMap service)
  const reverseGeocode = async (lat: number, lon: number): Promise<{ location: string | null; zipCode: string | null }> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&extratags=1&namedetails=1`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();

      if (!data.address) throw new Error('No address found');

      const { city, town, village, state, state_district, postcode } = data.address;
      const cityName = city || town || village;
      const stateName = state || state_district;
      const zipCode = postcode;

      if (!cityName || !stateName) throw new Error('Incomplete address');

      // Get state abbreviation (simplified mapping for common states)
      const stateAbbreviation = getStateAbbreviation(stateName);
      const locationString = `${cityName}, ${stateAbbreviation}`;

      return { location: locationString, zipCode: zipCode || null };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return { location: null, zipCode: null };
    }
  };

  // Look up ZIP code by city name using geocoding API
  const getZipCodeFromCity = async (cityName: string): Promise<string | null> => {
    try {
      console.log(`🔍 Looking up ZIP code for city: "${cityName}"`);

      // Use Nominatim to search for the city
      const encodedCity = encodeURIComponent(`${cityName}, USA`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedCity}&addressdetails=1&limit=3&countrycodes=us`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MarketplaceHelper/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        // Try to find the best result with a ZIP code
        for (const result of data) {
          const zipCode = result.address?.postcode;
          if (zipCode) {
            console.log(`✅ Found ZIP code via geocoding: ${zipCode} for city: "${cityName}"`);
            return zipCode;
          }
        }
      }

      console.log(`⚠️ No ZIP code found for city: "${cityName}"`);
      return null;
    } catch (error) {
      console.error(`❌ Error looking up ZIP code for city "${cityName}":`, error);
      return null;
    }
  };

  // Simple state abbreviation mapping (can be expanded)
  const getStateAbbreviation = (stateName: string): string => {
    const stateMap: { [key: string]: string } = {
      'California': 'CA',
      'New York': 'NY',
      'Texas': 'TX',
      'Florida': 'FL',
      'Illinois': 'IL',
      'Pennsylvania': 'PA',
      'Ohio': 'OH',
      'Georgia': 'GA',
      'North Carolina': 'NC',
      'Michigan': 'MI',
      'New Jersey': 'NJ',
      'Virginia': 'VA',
      'Washington': 'WA',
      'Arizona': 'AZ',
      'Massachusetts': 'MA',
      'Tennessee': 'TN',
      'Indiana': 'IN',
      'Missouri': 'MO',
      'Maryland': 'MD',
      'Wisconsin': 'WI',
      'Colorado': 'CO',
      'Minnesota': 'MN',
      'South Carolina': 'SC',
      'Alabama': 'AL',
      'Louisiana': 'LA',
      'Kentucky': 'KY',
      'Oregon': 'OR',
      'Oklahoma': 'OK',
      'Connecticut': 'CT',
      'Utah': 'UT',
      'Iowa': 'IA',
      'Nevada': 'NV',
      'Arkansas': 'AR',
      'Mississippi': 'MS',
      'Kansas': 'KS',
      'New Mexico': 'NM',
      'Nebraska': 'NE',
      'West Virginia': 'WV',
      'Idaho': 'ID',
      'Hawaii': 'HI',
      'New Hampshire': 'NH',
      'Maine': 'ME',
      'Montana': 'MT',
      'Rhode Island': 'RI',
      'Delaware': 'DE',
      'South Dakota': 'SD',
      'North Dakota': 'ND',
      'Alaska': 'AK',
      'Vermont': 'VT',
      'Wyoming': 'WY'
    };

    return stateMap[stateName] || stateName.slice(0, 2).toUpperCase();
  };

  // Detect user's location
  const detectLocation = async () => {
    console.log('🔍 DEBUG: Detect location button clicked');

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported');
      return;
    }

    setIsDetectingLocation(true);
    console.log('🔍 DEBUG: Starting geolocation detection...');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      console.log('🔍 DEBUG: Got coordinates:', { latitude, longitude });

      const result = await reverseGeocode(latitude, longitude);
      console.log('🔍 DEBUG: Reverse geocoding result:', result);

      if (result.location) {
        setDetectedLocation(result.location);
        setInputValue(result.location);
        onChange(result.location);
        console.log('🔍 DEBUG: Location set successfully:', result.location);

        // Update zipcode if available
        if (result.zipCode && onZipCodeChange) {
          console.log('🔍 DEBUG: Setting ZIP code:', result.zipCode);
          onZipCodeChange(result.zipCode);
        } else if (!result.zipCode && result.location) {
          // Try to look up ZIP code by city name
          const cityName = result.location.split(',')[0].trim();
          console.log('🔍 DEBUG: No ZIP code from geocoding, trying city lookup for:', cityName);
          const zipCode = await getZipCodeFromCity(cityName);
          if (zipCode && onZipCodeChange) {
            console.log('🔍 DEBUG: Found ZIP code via city lookup:', zipCode);
            onZipCodeChange(zipCode);
          }
        }
      }
    } catch (error) {
      console.error('🔍 DEBUG: Location detection failed:', error);
    } finally {
      setIsDetectingLocation(false);
      console.log('🔍 DEBUG: Location detection finished');
    }
  };

  // Save new location to database
  const saveLocation = async (formattedName: string): Promise<string | null> => {
    try {
      // Check if location already exists
      const { data: existing } = await supabase
        .from('mb_locations')
        .select('id')
        .eq('formatted_name', formattedName)
        .single();

      if (existing) {
        return existing.id;
      }

      // Parse city and state
      const parts = formattedName.split(', ');
      if (parts.length !== 2) return null;

      const [city, stateCode] = parts;

      // Insert new location
      const { data, error } = await supabase
        .from('mb_locations')
        .insert({
          city: city.trim(),
          state: stateCode.trim(),
          state_code: stateCode.trim(),
          formatted_name: formattedName
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving location:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error saving location:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('🔍 DEBUG: LocationComboBox value changed:', value);
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      loadLocations(inputValue);
    }
  }, [isOpen, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
    onChange(newValue);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    loadLocations(inputValue);
  };

  const handleOptionClick = async (location: Location) => {
    setInputValue(location.formatted_name);
    setIsOpen(false);
    onChange(location.formatted_name, location.id);
  };

  const handleDetectLocationClick = () => {
    console.log('🔍 DEBUG: Location detect button clicked');
    detectLocation();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    const allOptions = [
      ...(detectedLocation && !locations.find(l => l.formatted_name === detectedLocation)
        ? [{ id: 'detected', formatted_name: detectedLocation, city: '', state: '', state_code: '' }]
        : []),
      ...locations
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < allOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : allOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allOptions.length) {
          const selectedOption = allOptions[highlightedIndex];
          if (selectedOption.id === 'detected') {
            setInputValue(selectedOption.formatted_name);
            onChange(selectedOption.formatted_name);
          } else {
            handleOptionClick(selectedOption as Location);
          }
        } else if (inputValue) {
          // Save custom location if it matches "City, ST" format
          const parts = inputValue.split(', ');
          if (parts.length === 2 && parts[1].length === 2) {
            saveLocation(inputValue).then(locationId => {
              onChange(inputValue, locationId || undefined);
            });
          } else {
            onChange(inputValue);
          }
        }
        setIsOpen(false);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allOptions = [
    ...(detectedLocation && !locations.find(l => l.formatted_name === detectedLocation)
      ? [{ id: 'detected', formatted_name: detectedLocation, city: '', state: '', state_code: '' }]
      : []),
    ...locations
  ];

  return (
    <div className="combobox-container" ref={dropdownRef}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="combobox-input"
          style={{ flex: 1 }}
          autoComplete="off"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${id}-dropdown`}
          aria-autocomplete="list"
        />
        <button
          type="button"
          onClick={handleDetectLocationClick}
          disabled={disabled || isDetectingLocation}
          className="location-detect-btn"
          title="Detect current location"
        >
          {isDetectingLocation ? '🔄' : '📍'}
        </button>
      </div>

      {isOpen && (
        <div
          id={`${id}-dropdown`}
          className="combobox-dropdown"
          role="listbox"
        >
          {allOptions.length > 0 ? (
            allOptions.map((option, index) => (
              <div
                key={option.id}
                className={`combobox-option ${
                  index === highlightedIndex ? 'highlighted' : ''
                } ${option.id === 'detected' ? 'detected-location' : ''}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => {
                  if (option.id === 'detected') {
                    setInputValue(option.formatted_name);
                    onChange(option.formatted_name);
                    setIsOpen(false);
                  } else {
                    handleOptionClick(option as Location);
                  }
                }}
              >
                {option.id === 'detected' ? (
                  <span>
                    📍 <strong>{option.formatted_name}</strong> (Current Location)
                  </span>
                ) : (
                  option.formatted_name
                )}
              </div>
            ))
          ) : inputValue ? (
            <div className="combobox-no-options">
              No matching locations found. Press Enter to use "{inputValue}"
            </div>
          ) : (
            <div className="combobox-no-options">
              Type to search locations or click 📍 to detect current location
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationComboBox;
