"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2, MapPin, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { searchSavedAddresses } from '@/lib/api/savedAddresses';
import { SavedAddress } from '@/utils/mockData';
import { cn } from '@/lib/utils';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';
import { useDebounce } from '@/hooks/useDebounce'; // Assuming useDebounce hook exists

interface AddressSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onAddressSelect: (address: SavedAddress) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  value,
  onValueChange,
  onAddressSelect,
  placeholder,
  disabled,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const debouncedSearchTerm = useDebounce(value, 300); // Debounce search term

  const currentOrgId = profile?.org_id;

  const fetchSuggestions = useCallback(async (term: string) => {
    if (!currentOrgId || !term.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetchedSuggestions = await searchSavedAddresses(currentOrgId, term);
      setSuggestions(fetchedSuggestions);
    } catch (error) {
      console.error("Failed to fetch address suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchSuggestions(debouncedSearchTerm);
      setOpen(true); // Open popover when there's a debounced search term
    } else {
      setSuggestions([]);
      setOpen(false); // Close popover if search term is empty
    }
  }, [debouncedSearchTerm, fetchSuggestions]);

  const handleSelect = (address: SavedAddress) => {
    onAddressSelect(address);
    onValueChange(address.line_1); // Set the input value to line_1 for display
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("w-full", className)}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white shadow-lg rounded-md">
        <Command>
          <CommandInput
            value={value}
            onValueChange={onValueChange}
            placeholder="Search addresses..."
            className="h-9"
            disabled={disabled}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading suggestions...
              </CommandEmpty>
            ) : suggestions.length === 0 ? (
              <CommandEmpty>No addresses found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {suggestions.map((address) => (
                  <CommandItem
                    key={address.id}
                    value={`${address.name || ''} ${address.line_1} ${address.postcode}`}
                    onSelect={() => handleSelect(address)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-gray-900">
                        {address.name ? `${address.name} - ` : ''}
                        {formatAddressPart(address.line_1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatAddressPart(address.town_or_city)}, {formatPostcode(address.postcode)}
                      </span>
                    </div>
                    {address.favourite && <Star className="h-4 w-4 text-yellow-500 ml-2" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AddressSearchInput;