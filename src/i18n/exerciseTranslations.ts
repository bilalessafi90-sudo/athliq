/**
 * Exercise name + instructions translations.
 *
 * Key  = exact English exercise name (must match EXERCISE_DB / DB seed).
 * Value = per-language overrides.  Fallback is always the English original.
 */

export type ExerciseLang = { name: string; instructions: string };

export const exerciseTranslations: Record<string, { de: ExerciseLang }> = {
  // ─── Chest ────────────────────────────────────────────────────────────────
  'Barbell Bench Press': {
    de: {
      name: 'Langhantel-Bankdrücken',
      instructions:
        'Flach auf der Bank liegen. Die Stange etwas breiter als schulterbreit greifen. Zur Brust absenken und explosiv nach oben drücken.',
    },
  },
  'Dumbbell Bench Press': {
    de: {
      name: 'Kurzhantel-Bankdrücken',
      instructions:
        'Flach auf der Bank liegen und die Kurzhanteln von Brusthöhe bis zur vollen Streckung drücken.',
    },
  },
  'Incline Barbell Press': {
    de: {
      name: 'Schrägbankdrücken (Langhantel)',
      instructions:
        'Bank auf 30–45° einstellen. Die Stange von der Oberbrust bis zur vollen Streckung drücken.',
    },
  },
  'Push-Ups': {
    de: {
      name: 'Liegestütze',
      instructions:
        'In der Plank-Position die Brust zum Boden absenken und wieder hochdrücken. Rumpf dabei angespannt halten.',
    },
  },
  'Cable Chest Fly': {
    de: {
      name: 'Kabel-Fliegende (Brust)',
      instructions:
        'Kabel auf Schulterhöhe einstellen. Griffe bogenförmig vor der Brust zusammenführen.',
    },
  },
  'Dips': {
    de: {
      name: 'Dips',
      instructions:
        'Den Körper durch Beugen der Ellbogen absenken. Nach vorne lehnen, um die Brust stärker zu betonen.',
    },
  },

  // ─── Back ─────────────────────────────────────────────────────────────────
  'Barbell Deadlift': {
    de: {
      name: 'Langhantel-Kreuzheben',
      instructions:
        'Schulterbreiter Stand, neutrale Wirbelsäule. Durch die Fersen nach oben drücken und die Stange am Körper entlangführen.',
    },
  },
  'Pull-Ups': {
    de: {
      name: 'Klimmzüge',
      instructions:
        'An der Stange hängen. Kinn über die Stange ziehen und den Körper kontrolliert absenken.',
    },
  },
  'Lat Pulldown': {
    de: {
      name: 'Latzug',
      instructions:
        'Stange weit greifen. Zur Oberbrust herunterziehen und die Lats dabei anspannen.',
    },
  },
  'Barbell Bent-Over Row': {
    de: {
      name: 'Langhantel-Rudern vorgebeugt',
      instructions:
        'In der Hüfte nach vorne beugen, neutrale Wirbelsäule halten. Die Stange zum unteren Rippenbogen ziehen.',
    },
  },
  'Seated Cable Row': {
    de: {
      name: 'Kabelrudern sitzend',
      instructions:
        'Aufrecht sitzen, den Griff zum Bauch ziehen und die Schulterblätter zusammendrücken.',
    },
  },
  'Dumbbell Row': {
    de: {
      name: 'Kurzhantel-Rudern',
      instructions:
        'Auf einer Bank abstützen, Kurzhantel zur Hüfte ziehen und kontrolliert absenken.',
    },
  },
  'Inverted Row': {
    de: {
      name: 'Australische Klimmzüge',
      instructions:
        'Unter einer Stange hängen und die Brust zur Stange ziehen, dabei den Körper gerade halten.',
    },
  },

  // ─── Shoulders ────────────────────────────────────────────────────────────
  'Overhead Press': {
    de: {
      name: 'Schulterdrücken (Langhantel)',
      instructions:
        'Stange von der Schlüsselbeinregion senkrecht über den Kopf drücken. Oben vollständig ausschreiben.',
    },
  },
  'Dumbbell Shoulder Press': {
    de: {
      name: 'Kurzhantel-Schulterdrücken',
      instructions:
        'Kurzhanteln von Ohrhöhe über den Kopf drücken.',
    },
  },
  'Lateral Raises': {
    de: {
      name: 'Seitheben',
      instructions:
        'Arme mit leichter Beugung im Ellbogen seitlich auf Schulterhöhe anheben.',
    },
  },
  'Face Pulls': {
    de: {
      name: 'Face Pulls',
      instructions:
        'Das Seil mit hohen Ellbogen zum Gesicht ziehen. Am Ende des Zugs die Schultern nach außen rotieren.',
    },
  },
  'Arnold Press': {
    de: {
      name: 'Arnold-Press',
      instructions:
        'Mit den Handflächen zu dir beginnen und beim Drücken nach oben nach außen rotieren.',
    },
  },

  // ─── Biceps ───────────────────────────────────────────────────────────────
  'Barbell Curl': {
    de: {
      name: 'Langhantel-Curl',
      instructions:
        'Aufrecht stehen, die Stange auf Schulterhöhe curlen. Kontrolliert absenken.',
    },
  },
  'Dumbbell Curl': {
    de: {
      name: 'Kurzhantel-Curl',
      instructions:
        'Einen Arm nach dem anderen oder abwechselnd curlen. Oben die Hand supinieren.',
    },
  },
  'Hammer Curl': {
    de: {
      name: 'Hammer-Curl',
      instructions:
        'Neutraler Griff (Daumen nach oben). Trainiert vor allem den Brachialis und Brachioradialis.',
    },
  },
  'Cable Curl': {
    de: {
      name: 'Kabel-Curl',
      instructions:
        'Ellbogen seitlich am Körper fixieren, Kabelstange bis zum Kinn curlen.',
    },
  },

  // ─── Triceps ──────────────────────────────────────────────────────────────
  'Close-Grip Bench Press': {
    de: {
      name: 'Enges Bankdrücken',
      instructions:
        'Schulterbreiter Griff. Zur Brust absenken und dabei die Ellbogen eng am Körper halten.',
    },
  },
  'Tricep Pushdown': {
    de: {
      name: 'Trizepsdrücken am Kabel',
      instructions:
        'Ellbogen seitlich am Körper fixieren, Stange bis zur vollen Streckung nach unten drücken.',
    },
  },
  'Skull Crushers': {
    de: {
      name: 'Stirndrücken',
      instructions:
        'Stange kontrolliert zur Stirn absenken, dabei die Oberarme senkrecht halten.',
    },
  },
  'Diamond Push-Ups': {
    de: {
      name: 'Diamant-Liegestütze',
      instructions:
        'Hände unter der Brust zu einer Diamantform legen. Brust zu den Händen absenken und hochdrücken.',
    },
  },
  'Overhead Tricep Extension': {
    de: {
      name: 'Trizepsstrecken über dem Kopf',
      instructions:
        'Gewicht über dem Kopf halten, hinter den Kopf absenken und wieder strecken.',
    },
  },

  // ─── Legs ─────────────────────────────────────────────────────────────────
  'Barbell Back Squat': {
    de: {
      name: 'Kniebeuge (Langhantel)',
      instructions:
        'Stange auf dem oberen Rücken. Unter die Parallele kniebeugen und durch die Fersen nach oben drücken.',
    },
  },
  'Front Squat': {
    de: {
      name: 'Front-Kniebeuge',
      instructions:
        'Stange auf den vorderen Schultern. Während der gesamten Bewegung aufrecht bleiben.',
    },
  },
  'Romanian Deadlift': {
    de: {
      name: 'Rumänisches Kreuzheben',
      instructions:
        'In der Hüfte beugen mit leichter Kniebeugung. Die Dehnung in den hinteren Oberschenkeln spüren.',
    },
  },
  'Leg Press': {
    de: {
      name: 'Beinpresse',
      instructions:
        'Plattform nach oben drücken. Die Knie oben nicht vollständig durchstrecken.',
    },
  },
  'Lunges': {
    de: {
      name: 'Ausfallschritte',
      instructions:
        'Einen Schritt nach vorne machen, das hintere Knie Richtung Boden absenken. Zurück zur Ausgangsposition drücken.',
    },
  },
  'Bulgarian Split Squat': {
    de: {
      name: 'Bulgarische Kniebeuge',
      instructions:
        'Hinteres Bein auf einer Bank erhöht. Das vordere Knie auf 90° absenken.',
    },
  },
  'Leg Curl': {
    de: {
      name: 'Beinbeuger',
      instructions:
        'Die Fußknöchel zu den Gesäßmuskeln curlen. Kontrolliert in die Ausgangsposition absenken.',
    },
  },
  'Leg Extension': {
    de: {
      name: 'Beinstrecker',
      instructions:
        'Die Knie bis zur vollen Streckung strecken. Kurz oben halten.',
    },
  },
  'Box Jumps': {
    de: {
      name: 'Box-Sprünge',
      instructions:
        'Explosiv auf die Box springen. Kontrolliert heruntersteigen – nicht herunterspringen.',
    },
  },

  // ─── Core ─────────────────────────────────────────────────────────────────
  'Plank': {
    de: {
      name: 'Unterarmstütz (Plank)',
      instructions:
        'Unterarmstütz einnehmen. Hüfte level halten und gleichmäßig atmen.',
    },
  },
  'Cable Crunch': {
    de: {
      name: 'Kabel-Crunch',
      instructions:
        'Knien und das Seil nach unten ziehen, dabei die Bauchmuskeln anspannen. Hüfte stillhalten.',
    },
  },
  'Ab Wheel Rollout': {
    de: {
      name: 'Bauchradrollen',
      instructions:
        'Das Rad ausrollen, bis der Körper fast flach ist. Mit den Bauchmuskeln zurückziehen.',
    },
  },
  'Hanging Leg Raise': {
    de: {
      name: 'Hängendes Beinheben',
      instructions:
        'An der Stange hängen und die Beine auf 90° oder höher anheben. Kontrolliert absenken.',
    },
  },
  'Bicycle Crunch': {
    de: {
      name: 'Fahrrad-Crunch',
      instructions:
        'Den Ellbogen abwechselnd zum gegenüberliegenden Knie in einer Fahrradbewegung führen.',
    },
  },
  'Mountain Climbers': {
    de: {
      name: 'Bergsteiger',
      instructions:
        'In der Plank-Position. Abwechselnd die Knie schnell zur Brust ziehen.',
    },
  },

  // ─── Calves ───────────────────────────────────────────────────────────────
  'Standing Calf Raise': {
    de: {
      name: 'Wadenheben stehend',
      instructions:
        'Auf die Zehenspitzen steigen, kurz oben halten, vollständig absenken.',
    },
  },
  'Seated Calf Raise': {
    de: {
      name: 'Wadenheben sitzend',
      instructions:
        'Gewicht auf den Knien platzieren und die Fersen so hoch wie möglich anheben.',
    },
  },

  // ─── Full Body / Cardio ───────────────────────────────────────────────────
  'Treadmill Run': {
    de: {
      name: 'Laufband',
      instructions:
        'Ein Tempo wählen, bei dem man sich noch unterhalten kann. Auf gleichmäßige Atmung achten.',
    },
  },
  'Jump Rope': {
    de: {
      name: 'Seilspringen',
      instructions:
        'Leicht auf den Zehenspitzen abspringen. Einen gleichmäßigen Rhythmus halten.',
    },
  },
  'Burpees': {
    de: {
      name: 'Burpees',
      instructions:
        'In die Hocke gehen, Beine in den Liegestütz springen, einen Liegestütz machen, zurückspringen und mit Armen über dem Kopf hochspringen.',
    },
  },
  'Rowing Machine': {
    de: {
      name: 'Rudermaschine',
      instructions:
        'Zuerst mit den Beinen drücken, dann nach hinten lehnen, dann die Arme ziehen. Rückwärts in umgekehrter Reihenfolge zurückführen.',
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the translated exercise name, with English as fallback. */
export function getExerciseName(name: string, language: string): string {
  if (language === 'en') return name;
  return exerciseTranslations[name]?.[language as 'de']?.name ?? name;
}

/** Returns the translated instructions, with the original English as fallback. */
export function getExerciseInstructions(
  name: string,
  instructions: string,
  language: string,
): string {
  if (language === 'en') return instructions;
  return exerciseTranslations[name]?.[language as 'de']?.instructions ?? instructions;
}

/**
 * Convenience: returns both translated name and instructions in one call.
 * Always falls back to the supplied English originals.
 */
export function translateExercise(
  name: string,
  instructions: string,
  language: string,
): { name: string; instructions: string } {
  if (language === 'en') return { name, instructions };
  const t = exerciseTranslations[name]?.[language as 'de'];
  return {
    name: t?.name ?? name,
    instructions: t?.instructions ?? instructions,
  };
}
