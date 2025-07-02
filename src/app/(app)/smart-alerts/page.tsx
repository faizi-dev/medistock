'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateReorderingSuggestions } from '@/ai/flows/generate-reordering-suggestions';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { MedicalItem, ReorderingSuggestion } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function SmartAlertsPage() {
  const [suggestions, setSuggestions] = useState<ReorderingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const itemsSnapshot = await getDocs(collection(db, 'items'));
      const inventoryData = itemsSnapshot.docs.map(doc => {
        const data = doc.data();
        // Firebase Timestamps need to be converted to a serializable format
        return {
          ...data,
          id: doc.id,
          expirationDate: data.expirationDate.toDate().toISOString(),
        };
      });

      if (inventoryData.length === 0) {
        toast({
          title: "No Inventory Data",
          description: "Cannot generate suggestions without any items in the inventory.",
        });
        setIsLoading(false);
        return;
      }

      const result = await generateReorderingSuggestions({
        inventoryData: JSON.stringify(inventoryData),
      });

      if (result.reorderingSuggestions) {
        const parsedSuggestions = JSON.parse(result.reorderingSuggestions);
        setSuggestions(parsedSuggestions);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'An error occurred while generating suggestions. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Smart Alerts"
        description="Use AI to analyze your inventory and get reordering suggestions."
      />

      <Card>
        <CardHeader>
          <CardTitle>Reordering Suggestions</CardTitle>
          <CardDescription>
            Click the button to analyze your current inventory levels and expiration dates to get smart reordering recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateSuggestions} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Generate Suggestions
              </>
            )}
          </Button>

          {isLoading && (
            <div className="mt-6 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">AI is analyzing your inventory...</p>
            </div>
          )}

          {!isLoading && suggestions.length > 0 && (
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity to Reorder</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((suggestion, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{suggestion.itemName}</TableCell>
                      <TableCell className="text-right">{suggestion.quantityToReorder}</TableCell>
                      <TableCell>{suggestion.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
             <Alert className="mt-6">
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Ready to Analyze</AlertTitle>
                <AlertDescription>
                  Your AI assistant is ready. Click "Generate Suggestions" to get started.
                </AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>
    </>
  );
}
