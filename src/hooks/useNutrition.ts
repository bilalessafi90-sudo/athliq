import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nutritionService } from '../services/nutritionService';
import { useAuthStore } from '../stores/authStore';
import { Meal, GroceryItem, MealPlan } from '../types';

export function useActiveMealPlan() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['activeMealPlan', user?.id],
    queryFn: () => nutritionService.getActiveMealPlan(user!.id),
    enabled: !!user?.id,
  });
}

export function useGroceryItems(planId?: string) {
  return useQuery({
    queryKey: ['groceryItems', planId],
    queryFn: () => nutritionService.getGroceryItems(planId!),
    enabled: !!planId,
  });
}

export function useToggleGrocery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      nutritionService.toggleGroceryItem(itemId, checked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groceryItems'] }),
  });
}

export function useCreateMealPlan() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      plan,
      meals,
      groceryItems,
    }: {
      plan: Omit<MealPlan, 'id' | 'created_at'>;
      meals: Omit<Meal, 'id' | 'plan_id'>[];
      groceryItems: Omit<GroceryItem, 'id' | 'plan_id'>[];
    }) => nutritionService.createMealPlan(plan, meals, groceryItems),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activeMealPlan'] }),
  });
}
