//index.tsx
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';

export default function Home() {
  
  const { session } = useAuth();
  
  if (session) {
    return <Redirect href="/(tabs)" />;
  }
  
  return <Redirect href="/(auth)/Login" />;
}