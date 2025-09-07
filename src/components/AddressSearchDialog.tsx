"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, MapPin } from 'lucide-react';
import { autocompleteAddress, getFullAddress, AddressSuggestion, FullAddress } from '@/lib/supabase';
import { toast } from 'sonner';

interface AddressSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddressSelect: (address: FullAddress) => void;
  initialQuery?: string;
}

const AddressSearchDialog: React.FC<AddressSearchDialogProps> = ({
  open,
  onOpenChange,
  onAddressSelect,
  initialQuery = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSearchTerm(initialQuery);
      setSuggestions([]);
      setError(null);
      if (initialQuery) {
        handleSearch(initialQuery);
      }
    }
  }, [open, initialQuery]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedSuggestions = await autocompleteAddress(query);
      setSuggestions(fetchedSuggestions);
      if (fetchedSuggestions.length === 0) {
        setError("No addresses found. Try a different postcode or address line.");
      }
    } catch (err: any) {
      console.error("Error during address autocomplete:", err);
      setError(err.message || "Failed to search for addresses.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = async (suggestionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const fullAddress = await getFullAddress(suggestionId);
      onAddressSelect(fullAddress);
      onOpenChange(false); // Close dialog on successful selection
    } catch (err: any) {
      console.error("Error fetching full address:", err);
      setError(err.message || "Failed to retrieve full address details.");
      toast.error("Failed to retrieve full address details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white p-6 rounded-xl shadow-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Find Address</DialogTitle>
          <DialogDescription>
            Enter a postcode or part of an address to search.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="e.g., SW1A 0AA or 10 Downing Street"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchTerm);
                  }
                }}
                className="pl-9 pr-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                disabled={loading}
              />
            </div>
            <Button onClick={() => handleSearch(searchTerm)} disabled={loading || !searchTerm.trim()} className="w-full bg-blue-600 text-white hover:bg-blue-700">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Search
            </Button>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {loading && suggestions.length === 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="ml-2 text-gray-700">Searching...</p>
              </div>
            )}

            {suggestions.length > 0 && (
              <ScrollArea className="h-60 w-full rounded-md border">
                <div className="p-2">
                  <div className="space-y-2">
                    {suggestions.map((suggestion) => (
                      <Button
                        key={suggestion.id}
                        variant="outline"
                        onClick={() => handleSelectSuggestion(suggestion.id)}
                        disabled={loading}
                        className="w-full justify-start text-left h-auto py-2"
                      >
                        <MapPin className="h-4 w-4 mr-3 text-gray-500" />
                        <span className="font-medium text-gray-800">{suggestion.address}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressSearchDialog;