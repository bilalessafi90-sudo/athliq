import { supabase } from '../lib/supabase';
import { MealPlan, Meal, GroceryItem } from '../types';

export const nutritionService = {
  async getActiveMealPlan(userId: string): Promise<(MealPlan & { meals: Meal[] }) | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*, meals(*)')
      .eq('user_id', userId)
      .lte('week_start', today)
      .gte('week_end', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getAllMealPlans(userId: string): Promise<MealPlan[]> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createMealPlan(
    plan: Omit<MealPlan, 'id' | 'created_at'>,
    meals: Omit<Meal, 'id' | 'plan_id'>[],
    groceryItems: Omit<GroceryItem, 'id' | 'plan_id'>[],
  ): Promise<MealPlan> {
    const { data: planData, error: planError } = await supabase
      .from('meal_plans')
      .insert(plan)
      .select()
      .single();
    if (planError) throw planError;

    if (meals.length > 0) {
      const { error: mealsError } = await supabase
        .from('meals')
        .insert(meals.map((m) => ({ ...m, plan_id: planData.id })));
      if (mealsError) throw mealsError;
    }

    if (groceryItems.length > 0) {
      const { error: groceryError } = await supabase
        .from('grocery_items')
        .insert(groceryItems.map((g) => ({ ...g, plan_id: planData.id })));
      if (groceryError) throw groceryError;
    }

    return planData;
  },

  async getGroceryItems(planId: string): Promise<GroceryItem[]> {
    const { data, error } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('plan_id', planId)
      .order('category');
    if (error) throw error;
    return data ?? [];
  },

  async toggleGroceryItem(itemId: string, checked: boolean): Promise<void> {
    const { error } = await supabase
      .from('grocery_items')
      .update({ checked })
      .eq('id', itemId);
    if (error) throw error;
  },

  async getMealsForDay(planId: string, dayOfWeek: string): Promise<Meal[]> {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('plan_id', planId)
      .eq('day_of_week', dayOfWeek)
      .order('meal_type');
    if (error) throw error;
    return data ?? [];
  },
};
