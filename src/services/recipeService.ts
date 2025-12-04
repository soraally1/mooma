import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export interface Recipe {
    id?: string;
    name: string;
    servings: string;
    prepTime: string;
    cookTime: string;
    description: string;
    ingredients: Array<{
        item: string;
        amount: string;
        unit: string;
        nutrition?: string;
    }>;
    instructions: string[];
    nutritionBenefits: string[];
    tips: string;
    createdAt?: any;
}

export interface RecipeResponse {
    recipes: Recipe[];
    summary: string;
    warnings: string;
}

export const recipeService = {
    /**
     * Fetch saved recipes for a specific user.
     */
    async getSavedRecipes(userId: string): Promise<Recipe[]> {
        try {
            const q = query(collection(db, 'savedRecipes'), where('userId', '==', userId));
            const querySnapshot = await getDocs(q);
            const fetchedRecipes: Recipe[] = [];
            querySnapshot.forEach((doc) => {
                fetchedRecipes.push({ id: doc.id, ...doc.data().recipe } as Recipe);
            });
            // Sort by newest first
            fetchedRecipes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            return fetchedRecipes;
        } catch (error) {
            console.error('Error fetching saved recipes:', error);
            throw error;
        }
    },

    /**
     * Save a recipe to the user's journal.
     */
    async saveRecipe(userId: string, recipe: Recipe): Promise<void> {
        try {
            await addDoc(collection(db, 'savedRecipes'), {
                userId,
                recipe: { ...recipe, createdAt: Timestamp.now() },
                createdAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error saving recipe:', error);
            throw error;
        }
    },

    /**
     * Delete a recipe from the user's journal.
     */
    async deleteRecipe(recipeId: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'savedRecipes', recipeId));
        } catch (error) {
            console.error('Error deleting recipe:', error);
            throw error;
        }
    },

    /**
     * Generate recipes using the API.
     */
    async generateRecipes(answers: Record<string, string>): Promise<RecipeResponse> {
        try {
            const response = await fetch('/api/generate-recipe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(answers),
            });

            if (!response.ok) {
                throw new Error('Failed to generate recipes');
            }

            const data = await response.json();
            if (data.data) {
                return data.data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error generating recipes:', error);
            throw error;
        }
    }
};
