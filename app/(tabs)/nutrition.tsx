import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { useActiveMealPlan, useGroceryItems, useToggleGrocery, useCreateMealPlan } from '../../src/hooks/useNutrition';
import { useAuthStore } from '../../src/stores/authStore';
import { generateMealPlan } from '../../src/utils/mealPlanner';
import { calculateCalorieTarget } from '../../src/utils/workoutGenerator';
import { Card, MacroRing, Badge, Button } from '../../src/components/ui';
import { Colors, Typography, Spacing, Radius, DAYS_OF_WEEK, FITNESS_GOALS } from '../../src/constants';
import { Meal, MealType, DayOfWeek } from '../../src/types';
import { useT } from '../../src/stores/languageStore';

type View2 = 'plan' | 'grocery';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅', lunch: '🥗', dinner: '🍽️', snack: '🍎',
};

export default function NutritionScreen() {
  const { user, profile } = useAuthStore();
  const t = useT();
  const [view, setView] = useState<View2>('plan');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DAYS_OF_WEEK[0]);
  const [generating, setGenerating] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  const { data: mealPlan, isLoading } = useActiveMealPlan();
  const { data: groceryItems = [] } = useGroceryItems(mealPlan?.id);
  const toggleGrocery = useToggleGrocery();
  const createMealPlan = useCreateMealPlan();

  const goalInfo = FITNESS_GOALS.find((g) => g.id === profile?.fitness_goal);

  const mealsToday: Meal[] = (mealPlan?.meals ?? [])
    .filter((m: Meal) => m.day_of_week === selectedDay)
    .sort((a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type));

  const dayTotals = mealsToday.reduce(
    (acc, m) => ({ cal: acc.cal + m.calories, p: acc.p + m.protein, c: acc.c + m.carbs, f: acc.f + m.fat }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  // Unique recipes (deduplicated by meal name) for the grocery grouping
  const uniqueRecipes = useMemo(() => {
    const seen = new Set<string>();
    return (mealPlan?.meals ?? []).filter((m) => {
      if (seen.has(m.name)) return false;
      seen.add(m.name);
      return true;
    });
  }, [mealPlan?.meals]);

  // Fast lookup: lowercase grocery item name → item
  const groceryByName = useMemo(() => {
    const map = new Map<string, typeof groceryItems[number]>();
    groceryItems.forEach((item) => map.set(item.name.toLowerCase(), item));
    return map;
  }, [groceryItems]);

  // Returns true when any ingredient string contains the item name (case-insensitive)
  const itemsForRecipe = (meal: Meal) =>
    groceryItems.filter((item) =>
      meal.ingredients.some((ing) => ing.toLowerCase().includes(item.name.toLowerCase())),
    );

  // Items that don't match any known recipe
  const linkedItemIds = useMemo(() => {
    const ids = new Set<string>();
    uniqueRecipes.forEach((meal) => {
      groceryItems.forEach((item) => {
        if (meal.ingredients.some((ing) => ing.toLowerCase().includes(item.name.toLowerCase()))) {
          ids.add(item.id);
        }
      });
    });
    return ids;
  }, [uniqueRecipes, groceryItems]);

  const unlinkedItems = useMemo(
    () => groceryItems.filter((i) => !linkedItemIds.has(i.id)),
    [groceryItems, linkedItemIds],
  );

  const checkedCount = groceryItems.filter((i) => i.checked).length;
  const totalCount = groceryItems.length;
  const allDone = totalCount > 0 && checkedCount === totalCount;

  const handleGeneratePlan = async () => {
    if (!user || !profile?.fitness_goal) {
      Alert.alert('Profile needed', 'Please complete your profile first.');
      return;
    }
    setGenerating(true);
    try {
      const macros = calculateCalorieTarget({
        weight: profile.weight ?? 75,
        height: profile.height ?? 175,
        age: profile.age ?? 28,
        goal: profile.fitness_goal,
        daysPerWeek: profile.preferred_days_per_week,
      });

      const mealData = generateMealPlan({
        goal: profile.fitness_goal,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        dietary: profile.dietary_preferences,
        weekOffset: 0,
      });

      await createMealPlan.mutateAsync({
        plan: {
          user_id: user.id,
          week_start: mealData.weekStart,
          week_end: mealData.weekEnd,
          total_calories: macros.calories,
          total_protein: macros.protein,
          total_carbs: macros.carbs,
          total_fat: macros.fat,
        },
        meals: mealData.meals,
        groceryItems: mealData.groceryItems,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not generate meal plan.');
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
        <TouchableOpacity onPress={handleGeneratePlan} disabled={generating} style={styles.genBtn}>
          {generating
            ? <ActivityIndicator color={Colors.primary} size="small" />
            : <Text style={styles.genBtnText}>↺ New Plan</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Tab Toggle */}
      <View style={styles.toggle}>
        {(['plan', 'grocery'] as View2[]).map((v) => (
          <TouchableOpacity key={v} onPress={() => setView(v)} style={[styles.toggleBtn, view === v && styles.toggleBtnActive]}>
            <Text style={[styles.toggleText, view === v && styles.toggleTextActive]}>
              {v === 'plan' ? `🗓 ${t.weeklyMealPlan}` : `🛒 ${t.groceryList}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!mealPlan && !generating ? (
        /* ── Empty State ── */
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🥗</Text>
          <Text style={styles.emptyTitle}>No Meal Plan Yet</Text>
          <Text style={styles.emptyDesc}>
            Generate a personalised weekly meal plan with recipes, macros and a grocery list.
          </Text>
          {goalInfo && (
            <Badge label={`Goal: ${goalInfo.label}`} color={goalInfo.color} style={{ marginBottom: Spacing.base }} />
          )}
          <Button title="Generate Meal Plan" onPress={handleGeneratePlan} loading={generating} size="lg" style={{ width: '100%' }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {view === 'plan' ? (
            <>
              {/* Daily Macro Summary */}
              <Card elevated style={styles.macroCard}>
                <View style={styles.macroCardRow}>
                  <MacroRing
                    calories={dayTotals.cal}
                    protein={dayTotals.p}
                    carbs={dayTotals.c}
                    fat={dayTotals.f}
                    size={130}
                  />
                  <View style={styles.macroLegend}>
                    <MacroLegendItem color={Colors.protein} label="Protein" value={`${dayTotals.p}g`} />
                    <MacroLegendItem color={Colors.carbs} label="Carbs" value={`${dayTotals.c}g`} />
                    <MacroLegendItem color={Colors.fat} label="Fat" value={`${dayTotals.f}g`} />
                    <MacroLegendItem color={Colors.accent} label="Total" value={`${dayTotals.cal} kcal`} />
                  </View>
                </View>
              </Card>

              {/* Day Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={[styles.dayBtn, selectedDay === day && styles.dayBtnActive]}
                  >
                    <Text style={[styles.dayBtnText, selectedDay === day && styles.dayBtnTextActive]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Meals for selected day */}
              {mealsToday.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayText}>No meals planned for {selectedDay}.</Text>
                </View>
              ) : (
                mealsToday.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    expanded={expandedMeal === meal.id}
                    onToggle={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                  />
                ))
              )}
            </>
          ) : (
            /* ── Grocery List (grouped by recipe) ── */
            <>
              {/* Header */}
              <View style={styles.groceryHeader}>
                <Text style={styles.groceryCount}>
                  {checkedCount}/{totalCount} {t.checked}
                </Text>
                <Text style={styles.groceryNote}>Tap items to check them off</Text>
              </View>

              {/* All-done banner */}
              {allDone && (
                <View style={styles.allDoneBadge}>
                  <Text style={styles.allDoneText}>{t.allDone}</Text>
                </View>
              )}

              {/* Recipe cards */}
              {uniqueRecipes.map((meal) => {
                const mealItems = itemsForRecipe(meal);
                const recipeAllDone = mealItems.length > 0 && mealItems.every((i) => i.checked);
                return (
                  <View key={meal.id} style={[styles.recipeCard, recipeAllDone && styles.recipeCardDone]}>
                    <View style={styles.recipeHeader}>
                      <View style={styles.recipeIconWrap}>
                        <Text style={styles.recipeIcon}>{MEAL_ICONS[meal.meal_type]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recipeName, recipeAllDone && styles.recipeNameDone]}>
                          {meal.name}
                        </Text>
                        <Text style={styles.recipeMeta}>
                          {mealItems.length} {t.ingredients.toLowerCase()} · {meal.day_of_week}
                        </Text>
                      </View>
                      {recipeAllDone && <Text style={styles.recipeDoneIcon}>✓</Text>}
                    </View>

                    <View style={styles.ingredientList}>
                      {mealItems.length === 0 ? (
                        <Text style={styles.noLinkedText}>{t.noLinkedItems}</Text>
                      ) : (
                        mealItems.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => toggleGrocery.mutate({ itemId: item.id, checked: !item.checked })}
                            style={styles.ingredientRow}
                          >
                            <View style={[styles.checkbox, item.checked && styles.checkboxDone]}>
                              {item.checked && <Text style={styles.checkMark}>✓</Text>}
                            </View>
                            <Text style={[styles.ingredientText, item.checked && styles.ingredientDone]}>
                              {item.name}
                            </Text>
                            {item.quantity ? (
                              <Text style={styles.groceryQty}>{item.quantity}</Text>
                            ) : null}
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Unlinked items (catch-all) */}
              {unlinkedItems.length > 0 && (
                <View style={styles.recipeCard}>
                  <View style={styles.recipeHeader}>
                    <View style={styles.recipeIconWrap}>
                      <Text style={styles.recipeIcon}>🛒</Text>
                    </View>
                    <Text style={[styles.recipeName, { flex: 1 }]}>{t.otherItems}</Text>
                  </View>
                  <View style={styles.ingredientList}>
                    {unlinkedItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => toggleGrocery.mutate({ itemId: item.id, checked: !item.checked })}
                        style={styles.ingredientRow}
                      >
                        <View style={[styles.checkbox, item.checked && styles.checkboxDone]}>
                          {item.checked && <Text style={styles.checkMark}>✓</Text>}
                        </View>
                        <Text style={[styles.ingredientText, item.checked && styles.ingredientDone]}>
                          {item.name}
                        </Text>
                        {item.quantity ? (
                          <Text style={styles.groceryQty}>{item.quantity}</Text>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Meal Card ────────────────────────────────────────────────────────────────

function MealCard({ meal, expanded, onToggle }: { meal: Meal; expanded: boolean; onToggle: () => void }) {
  const t = useT();
  const mealTypeLabel: Record<MealType, string> = {
    breakfast: t.breakfast,
    lunch: t.lunch,
    dinner: t.dinner,
    snack: t.snack,
  };
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onToggle} style={{ marginBottom: Spacing.md }}>
      <Card>
        <View style={mc.header}>
          <View style={mc.iconWrap}>
            <Text style={mc.icon}>{MEAL_ICONS[meal.meal_type]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mc.mealType}>{mealTypeLabel[meal.meal_type]}</Text>
            <Text style={mc.mealName}>{meal.name}</Text>
            <Text style={mc.mealDesc} numberOfLines={expanded ? undefined : 1}>{meal.description}</Text>
          </View>
          <Text style={mc.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>

        {/* Macro pills */}
        <View style={mc.macroPills}>
          <MacroPill label="Cal" value={`${meal.calories}`} color={Colors.accent} />
          <MacroPill label="P" value={`${meal.protein}g`} color={Colors.protein} />
          <MacroPill label="C" value={`${meal.carbs}g`} color={Colors.carbs} />
          <MacroPill label="F" value={`${meal.fat}g`} color={Colors.fat} />
          <MacroPill label="⏱" value={`${meal.prep_time_minutes + meal.cook_time_minutes}m`} color={Colors.textMuted} />
        </View>

        {/* Expanded: ingredients + instructions */}
        {expanded && (
          <View style={mc.details}>
            <Text style={mc.detailTitle}>{t.ingredients}</Text>
            {meal.ingredients.map((ing, i) => (
              <Text key={i} style={mc.ingredient}>• {ing}</Text>
            ))}

            <Text style={[mc.detailTitle, { marginTop: Spacing.md }]}>{t.instructions}</Text>
            {meal.instructions.map((step, i) => (
              <View key={i} style={mc.step}>
                <View style={mc.stepNum}><Text style={mc.stepNumText}>{i + 1}</Text></View>
                <Text style={mc.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

function MacroPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[mpp.pill, { backgroundColor: color + '18' }]}>
      <Text style={[mpp.label, { color }]}>{label} </Text>
      <Text style={[mpp.value, { color }]}>{value}</Text>
    </View>
  );
}

function MacroLegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={ml.row}>
      <View style={[ml.dot, { backgroundColor: color }]} />
      <Text style={ml.label}>{label}</Text>
      <Text style={[ml.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.base, paddingBottom: Spacing.md },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  genBtn: { backgroundColor: Colors.primary + '22', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '55' },
  genBtnText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  toggle: { flexDirection: 'row', marginHorizontal: Spacing['2xl'], gap: Spacing.sm, marginBottom: Spacing.base },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.card },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.white },
  scroll: { paddingHorizontal: Spacing['2xl'] },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'], gap: Spacing.base },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  emptyDesc: { fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  macroCard: { marginBottom: Spacing.base },
  macroCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  macroLegend: { flex: 1, gap: Spacing.sm },
  dayScroll: { marginBottom: Spacing.base },
  dayScrollContent: { gap: Spacing.sm, paddingRight: Spacing.base },
  dayBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  dayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayBtnText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.textSecondary },
  dayBtnTextActive: { color: Colors.white },
  emptyDay: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyDayText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm },
  groceryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  groceryCount: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  groceryNote: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  groceryQty: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },

  // All-done banner
  allDoneBadge: {
    backgroundColor: Colors.accentGreen + '22',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accentGreen + '55',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  allDoneText: { fontSize: Typography.sizes.sm, color: Colors.accentGreen, fontWeight: Typography.weights.semibold, textAlign: 'center' },

  // Recipe cards
  recipeCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  recipeCardDone: { borderColor: Colors.accentGreen + '66', opacity: 0.8 },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recipeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeIcon: { fontSize: 18 },
  recipeName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  recipeNameDone: { color: Colors.textMuted },
  recipeMeta: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  recipeDoneIcon: { fontSize: Typography.sizes.base, color: Colors.accentGreen, fontWeight: Typography.weights.bold },

  // Ingredient rows
  ingredientList: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '88',
  },
  ingredientText: { flex: 1, fontSize: Typography.sizes.base, color: Colors.textPrimary },
  ingredientDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  noLinkedText: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontStyle: 'italic', paddingVertical: Spacing.sm },

  // Shared checkbox
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: Colors.accentGreen, borderColor: Colors.accentGreen },
  checkMark: { color: Colors.white, fontSize: 12, fontWeight: '700' },
});

const mc = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  mealType: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  mealName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  mealDesc: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  macroPills: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  details: { marginTop: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.base },
  detailTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  ingredient: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, paddingVertical: 2 },
  step: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontSize: Typography.sizes.xs, color: Colors.white, fontWeight: '700' },
  stepText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },
});

const mpp = StyleSheet.create({
  pill: { flexDirection: 'row', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  label: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  value: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
});

const ml = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  value: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
});
