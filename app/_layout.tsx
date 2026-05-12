import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { queryClient } from '../src/lib/queryClient';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { useLanguageStore } from '../src/stores/languageStore';
import { profileService } from '../src/services/profileService';
import { Colors } from '../src/constants';

export default function RootLayout() {
  const { setSession, setProfile, setLoading } = useAuthStore();
  const { loadLanguage } = useLanguageStore();

  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);

        if (session?.user) {
          try {
            const profile = await profileService.getProfile(session.user.id);
            setProfile(profile);

            if (profile?.onboarding_completed) {
              router.replace('/(tabs)');
            } else {
              router.replace('/(onboarding)/goal');
            }
          } catch {
            router.replace('/(onboarding)/goal');
          }
        } else {
          setProfile(null);
          router.replace('/(auth)/login');
        }

        setLoading(false);
      },
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
        router.replace('/(auth)/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout/active" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="workout/[id]" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});
