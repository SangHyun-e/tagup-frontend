import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Text } from '../components/common/Text';
import LogoBubble from '../../assets/images/tagup_logo_bubble.svg';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { InputField } from '../components/common/InputField';
import { Colors } from '../constants/colors';
import { Spacing, Type } from '../constants/theme';
import { User } from '../types';

export default function LoginScreen() {
  const router = useRouter();
  const { setFirebaseUser, setAppUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = '이메일을 입력해주세요.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = '올바른 이메일 형식이 아닙니다.';
    if (!password.trim()) newErrors.password = '비밀번호를 입력해주세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setFirebaseUser(credential.user);
      try {
        const nickname = credential.user.displayName ?? email.trim().split('@')[0];
        const appUser = await api.post<User>('/api/v1/auth/sync', { nickname });
        setAppUser(appUser);
      } catch {
        // sync 실패 시에도 Firebase 인증만으로 진입 허용
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const code = err.code as string;
      console.error('[Login Error]', code, err.message, err);
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrors({ general: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      } else {
        setErrors({ general: `오류: ${code ?? err.message ?? '알 수 없음'}` });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 비밀번호 재설정 메일 보내기.
   *
   * 결과 문구를 성공·실패 구분 없이 똑같이 띄운다. "그런 계정 없어요"라고 알려주면
   * 아무나 이메일을 넣어보며 <b>가입자 명단을 캐낼 수 있다.</b>
   */
  const handleResetPassword = async () => {
    const target = email.trim();
    if (!target) {
      setErrors({ email: '비밀번호를 찾으려면 이메일을 먼저 입력해주세요.' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(target)) {
      setErrors({ email: '올바른 이메일 형식이 아닙니다.' });
      return;
    }

    setErrors({});
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, target);
    } catch (err: any) {
      // 계정 없음(auth/user-not-found)도 조용히 넘긴다 — 아래 안내는 어느 쪽이든 같다
      if (err?.code !== 'auth/user-not-found' && err?.code !== 'auth/invalid-email') {
        console.warn('[Reset Password]', err?.code, err?.message);
      }
    } finally {
      setSendingReset(false);
      Alert.alert(
        '메일을 보냈어요',
        `${target} 으로 비밀번호 재설정 링크를 보냈어요.\n메일이 안 보이면 스팸함도 확인해주세요.`,
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea} accessible accessibilityRole="header">
          <LogoBubble width={48} height={48} />
          <Text style={styles.appName}>태그업</Text>
          <Text style={styles.slogan}>같이 보는 야구의 맛</Text>
        </View>

        <View style={styles.form}>
          {errors.general && (
            <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <InputField
            label="이메일"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={errors.email}
            textContentType="emailAddress"
          />

          <InputField
            label="비밀번호"
            placeholder="비밀번호 입력"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
            textContentType="password"
          />

          <Button label="로그인" onPress={handleLogin} loading={loading} style={styles.mt8} />

          <Button
            label="회원가입"
            onPress={() => router.push('/signup')}
            variant="secondary"
            disabled={loading}
          />

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={handleResetPassword}
            disabled={sendingReset || loading}
            accessibilityRole="button"
            accessibilityLabel="비밀번호 찾기"
            accessibilityHint="입력한 이메일로 재설정 링크를 보내요"
            accessibilityState={{ disabled: sendingReset || loading, busy: sendingReset }}
          >
            <Text style={styles.forgotText}>
              {sendingReset ? '메일 보내는 중…' : '비밀번호 찾기'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 40,
  },
  logoArea: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appName: {
    ...Type.sectionTitle,
    fontSize: 20,
    color: Colors.dark,
  },
  slogan: {
    ...Type.caption,
    color: Colors.textSub,
  },
  form: {
    gap: Spacing.md,
  },
  errorBanner: {
    backgroundColor: Colors.outSoft,
    borderRadius: 10,
    padding: Spacing.md,
  },
  errorBannerText: {
    ...Type.caption,
    color: Colors.fail,
    textAlign: 'center',
  },
  mt8: {
    marginTop: Spacing.sm,
  },
  forgotButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  forgotText: {
    ...Type.caption,
    color: Colors.textMuted,
  },
});
