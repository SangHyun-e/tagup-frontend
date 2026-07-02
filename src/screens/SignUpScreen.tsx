import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { InputField } from '../components/common/InputField';
import { KBO_TEAMS, KboTeam } from '../constants/teams';
import { Colors } from '../constants/colors';
import { User, Team } from '../types';

export default function SignUpScreen() {
  const router = useRouter();
  const { setFirebaseUser, setAppUser } = useAuthStore();

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<KboTeam | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    nickname?: string;
    email?: string;
    password?: string;
    team?: string;
    general?: string;
  }>({});

  const isFormValid =
    nickname.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.trim().length >= 8 &&
    selectedTeam !== null;

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!nickname.trim()) newErrors.nickname = '닉네임을 입력해주세요.';
    else if (nickname.trim().length < 2) newErrors.nickname = '닉네임은 2자 이상이어야 합니다.';
    if (!email.trim()) newErrors.email = '이메일을 입력해주세요.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = '올바른 이메일 형식이 아닙니다.';
    if (!password.trim()) newErrors.password = '비밀번호를 입력해주세요.';
    else if (password.trim().length < 8) newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    if (!selectedTeam) newErrors.team = '응원 구단을 선택해주세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: nickname.trim() });
      setFirebaseUser(credential.user);

      const appUser = await api.post<User>('/api/v1/auth/sync', {
        nickname: nickname.trim(),
        teamId: selectedTeam!.id,
      });
      // BE sync 응답에 team 객체가 없는 경우 로컬 선택값으로 채움
      setAppUser({
        ...appUser,
        teamId: selectedTeam!.id,
        team: appUser.team ?? (selectedTeam as unknown as Team),
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      const code = err.code as string;
      if (code === 'auth/email-already-in-use') {
        setErrors({ email: '이미 사용 중인 이메일입니다.' });
      } else if (code === 'auth/invalid-email') {
        setErrors({ email: '올바른 이메일 형식이 아닙니다.' });
      } else {
        setErrors({ general: '회원가입 중 오류가 발생했습니다.' });
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원가입</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {errors.general && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        )}

        <InputField
          label="닉네임"
          placeholder="2~10자 이내"
          value={nickname}
          onChangeText={setNickname}
          maxLength={10}
          error={errors.nickname}
        />

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
          placeholder="8자 이상"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
        />

        <View style={styles.teamSection}>
          <Text style={styles.teamLabel}>내 팀 선택 *</Text>
          {errors.team && <Text style={styles.teamError}>{errors.team}</Text>}
          <View style={styles.teamGrid}>
            {KBO_TEAMS.map((team) => {
              const isSelected = selectedTeam?.id === team.id;
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamCell, isSelected && styles.teamCellSelected]}
                  onPress={() => setSelectedTeam(team)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.teamEmoji}>{team.emoji}</Text>
                  <Text style={[styles.teamName, isSelected && styles.teamNameSelected]}>
                    {team.shortName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedTeam && (
            <Text style={styles.selectedTeamText}>
              {selectedTeam.emoji} {selectedTeam.name} 선택됨
            </Text>
          )}
        </View>

        <Button
          label="가입하기"
          onPress={handleSignUp}
          loading={loading}
          disabled={!isFormValid}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },
  container: {
    padding: 24,
    gap: 16,
    paddingBottom: 60,
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
  teamSection: {
    gap: 10,
  },
  teamLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
  },
  teamError: {
    fontSize: 11,
    color: Colors.fail,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamCell: {
    width: '18%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 2,
  },
  teamCellSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.accentLight,
  },
  teamEmoji: {
    fontSize: 22,
  },
  teamName: {
    fontSize: 9,
    color: Colors.textSub,
    fontWeight: '600',
  },
  teamNameSelected: {
    color: Colors.primary,
  },
  selectedTeamText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
  },
});
