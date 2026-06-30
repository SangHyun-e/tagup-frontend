import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LogoBubble from '../../assets/images/tagup_logo_bubble.svg';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { InputField } from '../components/common/InputField';
import { Colors } from '../constants/colors';
import { User } from '../types';

export default function LoginScreen() {
  const router = useRouter();
  const { setFirebaseUser, setAppUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
        const appUser = await api.get<User>('/api/users/me');
        setAppUser(appUser);
      } catch {
        // 백엔드 미연결 시에도 Firebase 인증만으로 진입 허용
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
        <View style={styles.logoArea}>
          <LogoBubble width={48} height={48} />
          <Text style={styles.appName}>태그업</Text>
          <Text style={styles.slogan}>같이 보는 야구의 맛</Text>
        </View>

        <View style={styles.form}>
          {errors.general && (
            <View style={styles.errorBanner}>
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
          />

          <InputField
            label="비밀번호"
            placeholder="비밀번호 입력"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Button label="로그인" onPress={handleLogin} loading={loading} style={styles.mt8} />

          <Button
            label="회원가입"
            onPress={() => router.push('/signup')}
            variant="secondary"
            disabled={loading}
          />

          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>비밀번호 찾기</Text>
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
    gap: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
  },
  slogan: {
    fontSize: 12,
    color: Colors.textSub,
  },
  form: {
    gap: 12,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: Colors.fail,
    textAlign: 'center',
  },
  mt8: {
    marginTop: 8,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.placeholder,
  },
});
