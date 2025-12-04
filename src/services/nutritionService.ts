export interface NutritionAnalysis {
    foodName: string;
    calories: string;
    isGoodForPregnancy: boolean;
    verdict: 'Safe' | 'Limit' | 'Avoid';
    nutrition: {
        protein: string;
        carbs: string;
        fat: string;
        vitamins: string;
    };
    benefits: string[];
    risks: string[];
    advice: string;
}

export const nutritionService = {
    /**
     * Analyze a food image to get nutritional advice.
     * @param imageBase64 Base64 encoded image string (including data:image/... prefix)
     */
    async analyzeFood(imageBase64: string): Promise<NutritionAnalysis> {
        try {
            const response = await fetch('/api/analyze-food', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageBase64 }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze food');
            }

            const data = await response.json();
            if (data.data) {
                return data.data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error analyzing food:', error);
            throw error;
        }
    }
};
