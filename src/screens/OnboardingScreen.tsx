import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/common/Button';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '⚾',
    title: '더그아웃',
    description: '태그코드로 친구를 초대해\n우리만의 응원 공간을 만들어요.',
  },
  {
    id: '2',
    emoji: '🎯',
    title: '배팅',
    description: '경기 결과를 예측하고\n친구와 배팅으로 더 짜릿하게!',
  },
  {
    id: '3',
    emoji: '🏷️',
    title: '태그코드',
    description: '6자리 태그코드로 친구를 태그해\n같이 야구를 즐겨요.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex((prev) => prev + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/login');
  };

  const renderSlide: ListRenderItem<Slide> = ({ item }) => (
    <View style={styles.slide}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.flatList}
      />

      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Button label={currentIndex < SLIDES.length - 1 ? '다음' : '시작하기'} onPress={handleNext} />
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finishOnboarding} style={styles.skipButton}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    color: Colors.placeholder,
  },
});
