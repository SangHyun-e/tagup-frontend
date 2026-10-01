import { TextStyle } from 'react-native';

/**
 * 글자·간격·모서리 토큰.
 *
 * <p><b>굵기는 fontWeight 가 아니라 fontFamily 로 준다.</b> 안드로이드는 커스텀 폰트에
 * {@code fontWeight} 를 먹이지 않고 가짜 굵기(synthetic bold)를 그리거나 무시한다.
 * 그래서 Pretendard 는 굵기별 파일을 따로 싣고 이름으로 고른다.
 *
 * <p>굵기는 셋뿐이다. 기존 화면은 400~800을 섞어 썼고 본문에까지 800이 붙어 있었는데,
 * 한글은 굵기를 과하게 주면 획이 뭉개진다. 800은 제목과 점수에만 쓴다.
 */
export const Font = {
  regular: 'Pretendard-Regular',
  bold: 'Pretendard-Bold',
  extraBold: 'Pretendard-ExtraBold',
} as const;

/** 폰트 로딩에 쓰는 맵. 키가 곧 fontFamily 이름이 된다 */
export const FontAssets = {
  [Font.regular]: require('../../assets/fonts/Pretendard-Regular.otf'),
  [Font.bold]: require('../../assets/fonts/Pretendard-Bold.otf'),
  [Font.extraBold]: require('../../assets/fonts/Pretendard-ExtraBold.otf'),
};

/**
 * 글자 단계. 화면에서 직접 fontSize 를 쓰지 말고 이 중 하나를 고를 것.
 * 자간이 음수인 이유는 Pretendard 가 기본 자간이 넉넉해 제목이 헐거워 보이기 때문이다.
 */
export const Type = {
  /** 화면 제목 — "지금 두산이 앞서고 있어요!" */
  screenTitle: {
    fontFamily: Font.extraBold,
    fontSize: 23,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  /** 구역 제목 — "오늘의 경기", 방 이름 */
  sectionTitle: {
    fontFamily: Font.extraBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  /** 목록 한 줄의 제목 */
  itemTitle: {
    fontFamily: Font.bold,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  /** 본문·말풍선 */
  body: {
    fontFamily: Font.regular,
    fontSize: 14.5,
    lineHeight: 21,
  },
  /** 설명·부연 */
  caption: {
    fontFamily: Font.regular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  /** 시각·개수처럼 가장 작은 글자 */
  micro: {
    fontFamily: Font.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  /** 버튼 */
  button: {
    fontFamily: Font.bold,
    fontSize: 14.5,
    lineHeight: 20,
  },
  /** 배지 — "성립", "적중!" */
  badge: {
    fontFamily: Font.extraBold,
    fontSize: 10.5,
    lineHeight: 14,
  },
  /** 점수 */
  score: {
    fontFamily: Font.extraBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
  },
} as const satisfies Record<string, TextStyle>;

/** 간격. 4의 배수로만 쓴다 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** 모서리. 작은 요소일수록 작게 */
export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;
