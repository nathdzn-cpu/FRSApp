"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getQuotes, createQuote, updateQuote, deleteQuote } from '@/lib/supabase';
import { Quote } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format } from 'date-fns';
import { formatGBPDisplay } from '@/lib/utils/formatUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { CreateQuotePayload } from '@/lib/api/quotes';

const quoteFormSchema = z.object({
  from_location: z.string().min(1, { message: 'From location is required.' }),
  to_location: z.string().min(1, { message: 'To location is required.' }),
  customer: z.string().min(1, { message: 'Customer is required.' }),
  price: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, { message: 'Price must be non-negative.' }).nullable()
  ),
  mileage: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().int().min(0, { message: 'Mileage must be a positive integer.' }).nullable()
  ),
  drops: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1, { message: 'Must be at least 1 drop.' }).max(10, { message: 'Cannot exceed 10 drops.' })
  ),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth, isOfficeOrAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const currentOrgId = profile?.org_id;
  const canAccess = isOfficeOrAdmin;

  const { data: quotes = [], isLoading: isLoadingQuotes, error: quotesError } = useQuery<Quote[], Error>({
    queryKey: ['quotes', currentOrgId],
    queryFn: () => getQuotes(currentOrgId!),
    enabled: !!currentOrgId && canAccess && !isLoadingAuth,
  });

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      from_location: '',
      to_location: '',
      customer: '',
      price: null,
      mileage: null,
      drops: 1,
    },
  });

  useEffect(() => {
    if (editingQuote) {
      form.reset({
        from_location: editingQuote.from_location,
        to_location: editingQuote.to_location,
        customer: editingQuote.customer,
        price: editingQuote.price,
        mileage: editingQuote.mileage,
        drops: editingQuote.drops,
      });
      setIsFormOpen(true);
    } else {
      form.reset();
    }
  }, [editingQuote, form]);

  const createQuoteMutation = useMutation({
    mutationFn: (newQuote: CreateQuotePayload) => createQuote(currentOrgId!, newQuote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', currentOrgId] });
      toast.success("Quote created successfully!");
      setIsFormOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      toast.error(`Failed to create quote: ${err.message}`);
    },
  });

  const updateQuoteMutation = useMutation({
    mutationFn: (updatedQuote: QuoteFormValues) => updateQuote(editingQuote!.id, currentOrgId!, updatedQuote),
    onSuccess: () => {
      toast.success('Quote updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['quotes', currentOrgId] });
      setIsFormOpen(false);
      setEditingQuote(null);
      form.reset();
    },
    onError: (err: any) => {
      toast.error(`Failed to update quote: ${err.message}`);
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => deleteQuote(quoteId, currentOrgId!),
    onSuccess: () => {
      toast.success('Quote deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['quotes', currentOrgId] });
      setIsDeleteConfirmOpen(false);
      setDeletingQuote(null);
    },
    onError: (err: any) => {
      toast.error(`Failed to delete quote: ${err.message}`);
    },
  });

  const onSubmit = (values: QuoteFormValues) => {
    if (editingQuote) {
      updateQuoteMutation.mutate(values);
    } else {
      createQuoteMutation.mutate(values as CreateQuotePayload);
    }
  };

  const handleEditClick = (quote: Quote) => {
    setEditingQuote(quote);
  };

  const handleDeleteClick = (quote: Quote) => {
    setDeletingQuote(quote);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deletingQuote) {
      deleteQuoteMutation.mutate(deletingQuote.id);
    }
  };

  useEffect(() => {
    if (!isLoadingAuth && (!user || !canAccess)) {
      toast.error("You do not have permission to access this page.");
      navigate('/');
    }
  }, [user, canAccess, navigate, isLoadingAuth]);

  if (isLoadingAuth || isLoadingQuotes) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading quotes...</p>
      </div>
    );
  }

  if (quotesError) {
    return <p className="text-red-500">Error loading quotes: {quotesError.message}</p>;
  }

  return (
    <div className="w-full">
      <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Button>
      <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
          <CardTitle className="text-2xl font-bold text-gray-900">Quotes</CardTitle>
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingQuote(null); // Clear editing quote when dialog closes
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <PlusCircle className="h-4 w-4 mr-2" /> New Quote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingQuote ? 'Edit Quote' : 'Create New Quote'}</DialogTitle>
                <DialogDescription>
                  {editingQuote ? 'Modify the details of the quote.' : 'Fill in the details below to create a new quote.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="from_location" render={({ field }) => (
                    <FormItem><FormLabel>From</FormLabel><FormControl><Input placeholder="City or Postcode" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="to_location" render={({ field }) => (
                    <FormItem><FormLabel>To</FormLabel><FormControl><Input placeholder="City or Postcode" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="customer" render={({ field }) => (
                    <FormItem><FormLabel>Customer</FormLabel><FormControl><Input placeholder="Customer Name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>Price (£)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mileage" render={({ field }) => (
                    <FormItem><FormLabel>Mileage</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="drops" render={({ field }) => (
                    <FormItem><FormLabel>Number of Drops</FormLabel><FormControl><Input type="number" min="1" max="10" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={createQuoteMutation.isPending || updateQuoteMutation.isPending}>
                    {(createQuoteMutation.isPending || updateQuoteMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingQuote ? 'Update Quote' : 'Save Quote'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Drops</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>{format(new Date(quote.created_at), 'PPP')}</TableCell>
                  <TableCell>{quote.customer}</TableCell>
                  <TableCell>{quote.from_location}</TableCell>
                  <TableCell>{quote.to_location}</TableCell>
                  <TableCell>{formatGBPDisplay(quote.price)}</TableCell>
                  <TableCell>{quote.mileage}</TableCell>
                  <TableCell>{quote.drops}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(quote)} className="mr-2">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(quote)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Quotes;