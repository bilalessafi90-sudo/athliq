import { format, addDays, startOfWeek } from 'date-fns';
import { FitnessGoal, Meal, GroceryItem, MealType, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../constants';

// ─── Recipe Database ─────────────────────────────────────────────────────────

interface RecipeTemplate {
  name: string;
  description: string;
  meal_type: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  ingredients: string[];
  instructions: string[];
  servings: number;
  tags: string[];
  dietary: string[];
}

const RECIPES: RecipeTemplate[] = [
  // ── Breakfasts ─────────────────────────────────────────────────────────────
  {
    name: 'Scrambled Eggs & Oats',
    description: 'High-protein breakfast with complex carbs for sustained energy.',
    meal_type: 'breakfast', calories: 480, protein: 32, carbs: 52, fat: 14,
    prep_time_minutes: 5, cook_time_minutes: 10, servings: 1,
    ingredients: ['3 large eggs', '80g rolled oats', '200ml milk', '1 banana', '1 tsp honey', 'salt, pepper'],
    instructions: ['Cook oats with milk for 5 min', 'Scramble eggs in non-stick pan', 'Season eggs', 'Serve with banana and honey on oats'],
    tags: ['quick', 'high-protein'], dietary: ['none', 'vegetarian', 'gluten_free'],
  },
  {
    name: 'Greek Yogurt Parfait',
    description: 'Light and filling parfait packed with protein and probiotics.',
    meal_type: 'breakfast', calories: 350, protein: 28, carbs: 42, fat: 6,
    prep_time_minutes: 5, cook_time_minutes: 0, servings: 1,
    ingredients: ['200g Greek yogurt (0%)', '40g granola', '100g mixed berries', '1 tbsp honey', '1 tbsp chia seeds'],
    instructions: ['Layer yogurt in bowl', 'Top with granola and berries', 'Drizzle honey, sprinkle chia seeds'],
    tags: ['no-cook', 'high-protein'], dietary: ['none', 'vegetarian', 'gluten_free'],
  },
  {
    name: 'Protein Pancakes',
    description: 'Fluffy protein-packed pancakes — meal prep friendly.',
    meal_type: 'breakfast', calories: 520, protein: 40, carbs: 55, fat: 12,
    prep_time_minutes: 5, cook_time_minutes: 10, servings: 2,
    ingredients: ['2 scoops vanilla protein powder', '2 eggs', '1 banana', '50g oat flour', '100ml milk', '1 tsp baking powder'],
    instructions: ['Blend all ingredients', 'Pour into greased pan over medium heat', 'Cook 2 min per side', 'Serve with fruit'],
    tags: ['high-protein', 'meal-prep'], dietary: ['none', 'vegetarian'],
  },
  {
    name: 'Avocado Toast with Eggs',
    description: 'Balanced fats and protein on whole grain toast.',
    meal_type: 'breakfast', calories: 440, protein: 22, carbs: 36, fat: 22,
    prep_time_minutes: 5, cook_time_minutes: 8, servings: 1,
    ingredients: ['2 slices whole grain bread', '1 ripe avocado', '2 eggs', 'cherry tomatoes', 'salt, pepper, chili flakes', 'lemon juice'],
    instructions: ['Toast bread', 'Mash avocado with lemon, salt', 'Poach or fry eggs', 'Layer avocado, eggs, tomatoes on toast'],
    tags: ['quick', 'healthy-fats'], dietary: ['none', 'vegetarian', 'dairy_free'],
  },
  {
    name: 'Overnight Oats',
    description: 'Prep the night before for a ready-to-eat morning meal.',
    meal_type: 'breakfast', calories: 390, protein: 18, carbs: 58, fat: 9,
    prep_time_minutes: 5, cook_time_minutes: 0, servings: 1,
    ingredients: ['80g rolled oats', '200ml milk', '150g Greek yogurt', '1 tbsp peanut butter', '1 tbsp honey', '1 tsp cinnamon', 'handful blueberries'],
    instructions: ['Mix oats, milk, yogurt in jar', 'Add peanut butter and honey', 'Refrigerate overnight', 'Top with berries before eating'],
    tags: ['meal-prep', 'no-cook'], dietary: ['none', 'vegetarian'],
  },

  // ── Lunches ────────────────────────────────────────────────────────────────
  {
    name: 'Chicken Rice Bowl',
    description: 'Classic high-protein meal prep staple.',
    meal_type: 'lunch', calories: 620, protein: 48, carbs: 72, fat: 12,
    prep_time_minutes: 10, cook_time_minutes: 25, servings: 1,
    ingredients: ['180g chicken breast', '150g cooked rice', '200g broccoli', '2 tbsp soy sauce', '1 tsp olive oil', 'garlic, ginger'],
    instructions: ['Season chicken with soy, garlic, ginger', 'Bake at 200°C for 20 min', 'Steam broccoli', 'Serve over rice'],
    tags: ['meal-prep', 'high-protein'], dietary: ['none', 'dairy_free', 'gluten_free'],
  },
  {
    name: 'Tuna Salad Wrap',
    description: 'Quick protein wrap ready in 5 minutes.',
    meal_type: 'lunch', calories: 480, protein: 38, carbs: 42, fat: 14,
    prep_time_minutes: 5, cook_time_minutes: 0, servings: 1,
    ingredients: ['160g canned tuna (drained)', '2 whole wheat tortillas', '100g mixed greens', '50g Greek yogurt', '1 tbsp lemon juice', 'cucumber, red onion', 'salt, pepper'],
    instructions: ['Mix tuna with yogurt, lemon, salt', 'Lay greens on tortilla', 'Add tuna mix and veggies', 'Roll and serve'],
    tags: ['quick', 'no-cook'], dietary: ['none', 'dairy_free'],
  },
  {
    name: 'Lentil & Veggie Soup',
    description: 'Budget-friendly plant-based protein powerhouse.',
    meal_type: 'lunch', calories: 380, protein: 22, carbs: 58, fat: 6,
    prep_time_minutes: 10, cook_time_minutes: 30, servings: 3,
    ingredients: ['200g red lentils', '2 carrots', '2 celery stalks', '1 onion', '400g canned tomatoes', '1L vegetable broth', 'cumin, turmeric, garlic'],
    instructions: ['Sauté onion, carrot, celery 5 min', 'Add spices, cook 1 min', 'Add lentils, tomatoes, broth', 'Simmer 25 min until lentils soft'],
    tags: ['budget', 'meal-prep', 'vegan'], dietary: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
  },
  {
    name: 'Turkey & Quinoa Bowl',
    description: 'Complete protein bowl with healthy fats.',
    meal_type: 'lunch', calories: 580, protein: 42, carbs: 55, fat: 16,
    prep_time_minutes: 10, cook_time_minutes: 20, servings: 1,
    ingredients: ['150g lean turkey mince', '100g cooked quinoa', '1 bell pepper', '1 zucchini', '30g feta cheese', '2 tbsp olive oil', 'oregano, garlic'],
    instructions: ['Cook quinoa per packet', 'Brown turkey with garlic, oregano', 'Sauté peppers and zucchini', 'Combine, top with feta'],
    tags: ['high-protein', 'balanced'], dietary: ['none', 'gluten_free'],
  },
  {
    name: 'Egg & Veggie Stir Fry',
    description: 'Fast, affordable, and nutritious pan meal.',
    meal_type: 'lunch', calories: 420, protein: 26, carbs: 38, fat: 16,
    prep_time_minutes: 5, cook_time_minutes: 12, servings: 1,
    ingredients: ['3 eggs', '150g cooked rice', '1 cup mixed frozen veg', '2 tbsp soy sauce', '1 tsp sesame oil', 'garlic, spring onions'],
    instructions: ['Scramble eggs, set aside', 'Fry garlic, add veggies', 'Add rice, stir fry 3 min', 'Add eggs and soy sauce, mix'],
    tags: ['quick', 'budget'], dietary: ['none', 'vegetarian', 'dairy_free'],
  },

  // ── Dinners ────────────────────────────────────────────────────────────────
  {
    name: 'Baked Salmon & Sweet Potato',
    description: 'Omega-3 rich dinner with slow-release carbs.',
    meal_type: 'dinner', calories: 650, protein: 44, carbs: 58, fat: 22,
    prep_time_minutes: 10, cook_time_minutes: 30, servings: 1,
    ingredients: ['200g salmon fillet', '1 medium sweet potato', '200g asparagus', '1 tbsp olive oil', 'lemon, dill, garlic', 'salt, pepper'],
    instructions: ['Pierce sweet potato, microwave 8 min or bake 40 min', 'Season salmon with lemon, dill', 'Bake salmon at 200°C 15 min', 'Roast asparagus 10 min'],
    tags: ['healthy-fats', 'omega-3'], dietary: ['none', 'gluten_free', 'dairy_free'],
  },
  {
    name: 'Beef & Broccoli Stir Fry',
    description: 'High-protein Asian-inspired dinner ready in 20 min.',
    meal_type: 'dinner', calories: 580, protein: 46, carbs: 42, fat: 20,
    prep_time_minutes: 10, cook_time_minutes: 12, servings: 1,
    ingredients: ['180g lean beef strips', '300g broccoli', '150g cooked rice', '3 tbsp soy sauce', '1 tbsp oyster sauce', 'garlic, ginger, cornstarch'],
    instructions: ['Marinate beef in soy, cornstarch', 'Stir fry beef over high heat 3 min, set aside', 'Fry garlic, ginger, add broccoli', 'Add beef back, sauces, toss'],
    tags: ['quick', 'high-protein'], dietary: ['none', 'dairy_free'],
  },
  {
    name: 'Chickpea Curry',
    description: 'Warming vegan curry, meal-preps 4 days.',
    meal_type: 'dinner', calories: 480, protein: 18, carbs: 72, fat: 12,
    prep_time_minutes: 10, cook_time_minutes: 25, servings: 4,
    ingredients: ['2 cans chickpeas', '400g canned tomatoes', '1 can coconut milk (light)', '1 onion', 'curry powder, cumin, turmeric', '200g spinach', 'rice to serve'],
    instructions: ['Sauté onion and spices 5 min', 'Add tomatoes, simmer 10 min', 'Add chickpeas, coconut milk', 'Stir in spinach, serve over rice'],
    tags: ['vegan', 'meal-prep', 'budget'], dietary: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
  },
  {
    name: 'Grilled Chicken & Vegetables',
    description: 'Simple, lean dinner for any goal.',
    meal_type: 'dinner', calories: 520, protein: 48, carbs: 38, fat: 14,
    prep_time_minutes: 10, cook_time_minutes: 20, servings: 1,
    ingredients: ['200g chicken breast', '1 cup cherry tomatoes', '1 zucchini', '1 bell pepper', '2 tbsp olive oil', 'Italian herbs, garlic', '100g cooked pasta'],
    instructions: ['Marinate chicken with herbs, oil, garlic', 'Grill 6 min per side', 'Roast veggies at 200°C 20 min', 'Serve with pasta'],
    tags: ['simple', 'high-protein'], dietary: ['none', 'dairy_free'],
  },
  {
    name: 'Turkey Meatballs & Pasta',
    description: 'Comfort food with a lean protein twist.',
    meal_type: 'dinner', calories: 680, protein: 50, carbs: 72, fat: 16,
    prep_time_minutes: 15, cook_time_minutes: 25, servings: 2,
    ingredients: ['300g lean turkey mince', '160g whole wheat pasta', '400g tomato sauce', '30g breadcrumbs', '1 egg', 'parmesan, garlic, basil'],
    instructions: ['Mix turkey, breadcrumbs, egg, garlic', 'Form meatballs, bake 18 min at 190°C', 'Heat tomato sauce', 'Cook pasta, combine'],
    tags: ['meal-prep', 'comfort'], dietary: ['none'],
  },
  {
    name: 'Black Bean Tacos',
    description: 'Plant-based tacos with complete nutrition.',
    meal_type: 'dinner', calories: 520, protein: 24, carbs: 68, fat: 14,
    prep_time_minutes: 10, cook_time_minutes: 10, servings: 2,
    ingredients: ['2 cans black beans', '6 corn tortillas', '200g Greek yogurt', '1 avocado', 'lime, cumin, chili powder', 'red onion, cilantro', '100g shredded cabbage'],
    instructions: ['Season and heat beans with spices', 'Warm tortillas', 'Mash avocado with lime', 'Assemble: beans, avocado, cabbage, yogurt, onion'],
    tags: ['vegan-adaptable', 'quick'], dietary: ['vegetarian', 'gluten_free'],
  },

  // ── Snacks ─────────────────────────────────────────────────────────────────
  {
    name: 'Protein Shake with Banana',
    description: 'Post-workout recovery shake.',
    meal_type: 'snack', calories: 280, protein: 28, carbs: 32, fat: 4,
    prep_time_minutes: 2, cook_time_minutes: 0, servings: 1,
    ingredients: ['1 scoop whey protein', '1 banana', '250ml milk or water', '1 tbsp peanut butter'],
    instructions: ['Blend all ingredients', 'Drink immediately after workout'],
    tags: ['quick', 'post-workout'], dietary: ['none', 'vegetarian'],
  },
  {
    name: 'Apple with Almond Butter',
    description: 'Simple whole food snack with healthy fats.',
    meal_type: 'snack', calories: 220, protein: 5, carbs: 30, fat: 10,
    prep_time_minutes: 2, cook_time_minutes: 0, servings: 1,
    ingredients: ['1 large apple', '2 tbsp almond butter'],
    instructions: ['Slice apple', 'Dip in almond butter'],
    tags: ['no-cook', 'simple'], dietary: ['vegan', 'gluten_free', 'dairy_free'],
  },
  {
    name: 'Cottage Cheese & Fruit',
    description: 'Slow-digesting casein protein snack.',
    meal_type: 'snack', calories: 200, protein: 22, carbs: 18, fat: 4,
    prep_time_minutes: 2, cook_time_minutes: 0, servings: 1,
    ingredients: ['200g low-fat cottage cheese', '100g mixed berries', '1 tsp honey'],
    instructions: ['Serve cottage cheese topped with berries and honey'],
    tags: ['no-cook', 'high-protein'], dietary: ['vegetarian', 'gluten_free'],
  },
];

// ─── Meal Plan Generator ──────────────────────────────────────────────────────

export function generateMealPlan(params: {
  goal: FitnessGoal;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary: string[];
  weekOffset?: number;
}): {
  weekStart: string;
  weekEnd: string;
  meals: Omit<Meal, 'id' | 'plan_id'>[];
  groceryItems: Omit<GroceryItem, 'id' | 'plan_id'>[];
} {
  const { goal, calories, protein, carbs, fat, dietary, weekOffset = 0 } = params;

  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  // Filter recipes by dietary preferences
  const eligible = RECIPES.filter((r) => {
    if (dietary.includes('vegan')) return r.dietary.includes('vegan');
    if (dietary.includes('vegetarian')) return r.dietary.includes('vegetarian');
    if (dietary.includes('gluten_free')) return r.dietary.includes('gluten_free');
    if (dietary.includes('dairy_free')) return r.dietary.includes('dairy_free');
    return true;
  });

  const breakfasts = eligible.filter((r) => r.meal_type === 'breakfast');
  const lunches    = eligible.filter((r) => r.meal_type === 'lunch');
  const dinners    = eligible.filter((r) => r.meal_type === 'dinner');
  const snacks     = eligible.filter((r) => r.meal_type === 'snack');

  const meals: Omit<Meal, 'id' | 'plan_id'>[] = [];
  const allIngredients: string[] = [];

  DAYS_OF_WEEK.forEach((day, i) => {
    const pick = <T>(arr: T[]) => arr[(i + weekOffset) % arr.length];

    const dayMeals = [
      { template: pick(breakfasts), meal_type: 'breakfast' as MealType },
      { template: pick(lunches),    meal_type: 'lunch' as MealType },
      { template: pick(dinners),    meal_type: 'dinner' as MealType },
      { template: pick(snacks),     meal_type: 'snack' as MealType },
    ];

    for (const { template, meal_type } of dayMeals) {
      if (!template) continue;
      meals.push({
        day_of_week: day,
        meal_type,
        name: template.name,
        description: template.description,
        calories: template.calories,
        protein: template.protein,
        carbs: template.carbs,
        fat: template.fat,
        prep_time_minutes: template.prep_time_minutes,
        cook_time_minutes: template.cook_time_minutes,
        ingredients: template.ingredients,
        instructions: template.instructions,
        servings: template.servings,
      });
      allIngredients.push(...template.ingredients);
    }
  });

  const groceryItems = buildGroceryList(allIngredients);

  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    meals,
    groceryItems,
  };
}

// ─── Grocery List Builder ─────────────────────────────────────────────────────

const GROCERY_CATEGORIES: Record<string, string[]> = {
  'Proteins': ['chicken', 'beef', 'turkey', 'salmon', 'tuna', 'eggs', 'lentils', 'chickpeas', 'black beans', 'protein powder', 'whey', 'cottage cheese'],
  'Dairy': ['milk', 'Greek yogurt', 'feta', 'parmesan', 'cheese'],
  'Produce': ['broccoli', 'spinach', 'asparagus', 'bell pepper', 'zucchini', 'tomato', 'avocado', 'banana', 'apple', 'berries', 'lemon', 'lime', 'onion', 'carrot', 'celery', 'cucumber', 'cabbage'],
  'Grains': ['rice', 'oats', 'quinoa', 'pasta', 'bread', 'tortilla', 'granola', 'oat flour', 'breadcrumbs'],
  'Pantry': ['olive oil', 'soy sauce', 'honey', 'peanut butter', 'almond butter', 'coconut milk', 'tomato', 'broth', 'oyster sauce'],
  'Spices': ['garlic', 'ginger', 'cumin', 'turmeric', 'curry powder', 'chili', 'oregano', 'dill', 'cinnamon', 'basil'],
};

function categorize(ingredient: string): string {
  const lower = ingredient.toLowerCase();
  for (const [cat, keywords] of Object.entries(GROCERY_CATEGORIES)) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return 'Other';
}

function buildGroceryList(ingredients: string[]): Omit<GroceryItem, 'id' | 'plan_id'>[] {
  const seen = new Set<string>();
  return ingredients
    .map((ing) => {
      // Normalize: extract core ingredient name
      const name = ing.replace(/^\d+[\w\s]*\s/, '').split(',')[0].trim();
      if (seen.has(name.toLowerCase())) return null;
      seen.add(name.toLowerCase());
      return {
        name,
        quantity: ing.match(/^[\d\w\s\.]+/)?.[0]?.trim() ?? '',
        category: categorize(ing),
        checked: false,
      };
    })
    .filter(Boolean) as Omit<GroceryItem, 'id' | 'plan_id'>[];
}
