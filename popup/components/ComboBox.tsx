import React, { useState, useEffect, useRef } from 'react';

interface Option {
  id: string;
  name: string;
  icon?: string; // Optional HTML string for icons
}

interface ComboBoxProps {
  id: string;
  name: string;
  value: string | null;
  onChange: (value: string, name: string) => void;
  onSelect?: (value: string, name: string) => void; // New callback for dropdown selection
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}

const ComboBox: React.FC<ComboBoxProps> = ({
  id,
  name,
  value,
  onChange,
  onSelect,
  options,
  placeholder = "Select or type...",
  disabled = false,
  allowCustom = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update input value when value prop changes
  useEffect(() => {

    if (value) {
      // First try to find by ID (UUID)
      const selectedOptionById = options.find(option => option.id === value);
      if (selectedOptionById) {
        console.log('🔍 COMBOBOX DEBUG: Found option by ID:', selectedOptionById);
        setInputValue(selectedOptionById.name);
        return;
      }

      // Then try to find by name (for custom values or name-based lookups)
      const selectedOptionByName = options.find(option => option.name === value);
      if (selectedOptionByName) {
        console.log('🔍 COMBOBOX DEBUG: Found option by name:', selectedOptionByName);
        setInputValue(selectedOptionByName.name);
        return;
      }

      // If no option found, use the value as-is (custom value)
      console.log('🔍 COMBOBOX DEBUG: No option found, using value as-is:', value);
      setInputValue(value);
    } else {
      setInputValue('');
    }
  }, [value, options]);

  // Update filtered options when input changes
  useEffect(() => {
    if (inputValue === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
    setHighlightedIndex(-1);
  }, [inputValue, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('🔍 COMBOBOX DEBUG: handleInputChange called:', { newValue, name });
    setInputValue(newValue);
    setIsOpen(true);

    // Find exact match or send custom value
    const exactMatch = options.find(option =>
      option.name.toLowerCase() === newValue.toLowerCase()
    );

    if (exactMatch) {
      console.log('🔍 COMBOBOX DEBUG: Exact match found:', exactMatch);
      onChange(exactMatch.id, name);
    } else if (allowCustom && newValue.trim() !== '') {
      // For custom values, we'll use the input value as both id and name
      console.log('🔍 COMBOBOX DEBUG: Using custom value:', newValue.trim());
      onChange(newValue.trim(), name);
    } else if (newValue.trim() === '') {
      // Clear the value when input is empty
      console.log('🔍 COMBOBOX DEBUG: Clearing value');
      onChange('', name);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleOptionClick = (option: Option) => {
    console.log('🔍 COMBOBOX DEBUG: handleOptionClick called:', { option, name });
    setInputValue(option.name);
    onChange(option.id, name);
    // Call onSelect callback when user selects from dropdown
    onSelect?.(option.id, name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else if (allowCustom && inputValue.trim() !== '') {
          // Accept current input as custom value
          onChange(inputValue.trim(), name);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="combobox-container" ref={dropdownRef}>
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
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />

      {isOpen && (
        <div className="combobox-dropdown" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option.id}
                className={`combobox-option ${index === highlightedIndex ? 'highlighted' : ''}`}
                onClick={() => handleOptionClick(option)}
                role="option"
                aria-selected={value === option.id}
              >
                <span className="option-content">
                  {option.name}
                  {option.icon && (
                    <span
                      className="option-icon"
                      dangerouslySetInnerHTML={{ __html: option.icon }}
                    />
                  )}
                </span>
              </div>
            ))
          ) : (
            <div className="combobox-no-options">
              {allowCustom && inputValue.trim() !== '' ? (
                <div>
                  <div className="combobox-no-results">No matching options found</div>
                  <div className="combobox-custom-hint">
                    Press Enter to use "{inputValue.trim()}" as custom value
                  </div>
                </div>
              ) : (
                <div className="combobox-no-results">
                  {inputValue.trim() === '' ? 'Type to search...' : 'No matching options found'}
                </div>
              )}
            </div>
          )}

          {/* Show custom option hint when typing something that doesn't match */}
          {allowCustom && inputValue.trim() !== '' && filteredOptions.length > 0 &&
           !options.find(option => option.name.toLowerCase() === inputValue.toLowerCase()) && (
            <div className="combobox-option combobox-custom-option">
              <span className="combobox-custom-label">Custom:</span> "{inputValue.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComboBox;
