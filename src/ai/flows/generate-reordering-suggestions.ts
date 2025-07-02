'use server';

/**
 * @fileOverview AI-powered tool to analyze supply levels and expiration dates to predict potential shortages and recommend reordering actions.
 *
 * - generateReorderingSuggestions - A function that generates reordering suggestions based on inventory data.
 * - GenerateReorderingSuggestionsInput - The input type for the generateReorderingSuggestions function.
 * - GenerateReorderingSuggestionsOutput - The return type for the generateReorderingSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReorderingSuggestionsInputSchema = z.object({
  inventoryData: z
    .string()
    .describe(
      'A JSON string containing an array of medical supply items, each with name, barcode, quantity, expiration date, and vehicle ID.'
    ),
});
export type GenerateReorderingSuggestionsInput = z.infer<
  typeof GenerateReorderingSuggestionsInputSchema
>;

const GenerateReorderingSuggestionsOutputSchema = z.object({
  reorderingSuggestions: z
    .string()
    .describe(
      'A JSON string containing an array of reordering suggestions, each with item name, quantity to reorder, and reason for reorder.'
    ),
});
export type GenerateReorderingSuggestionsOutput = z.infer<
  typeof GenerateReorderingSuggestionsOutputSchema
>;

export async function generateReorderingSuggestions(
  input: GenerateReorderingSuggestionsInput
): Promise<GenerateReorderingSuggestionsOutput> {
  return generateReorderingSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReorderingSuggestionsPrompt',
  input: {schema: GenerateReorderingSuggestionsInputSchema},
  output: {schema: GenerateReorderingSuggestionsOutputSchema},
  prompt: `You are an AI assistant specialized in inventory management for medical supplies. Analyze the provided inventory data and predict potential shortages based on current stock levels and expiration dates. Recommend reordering actions, including the item name, quantity to reorder, and the reason for the reorder. Structure your response as a JSON array of reordering suggestions.

Inventory Data: {{{inventoryData}}}

Output reordering suggestions in JSON format:
`,
});

const generateReorderingSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateReorderingSuggestionsFlow',
    inputSchema: GenerateReorderingSuggestionsInputSchema,
    outputSchema: GenerateReorderingSuggestionsOutputSchema,
  },
  async input => {
    try {
      JSON.parse(input.inventoryData);
    } catch (e) {
      throw new Error('Invalid JSON format for inventory data.');
    }
    const {output} = await prompt(input);
    try {
      JSON.parse(output!.reorderingSuggestions);
    } catch (e) {
      throw new Error(
        'The reordering suggestions MUST be valid JSON. The LLM returned invalid JSON.'
      );
    }
    return output!;
  }
);
