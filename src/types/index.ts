export interface User {
  id: number;
  firebaseUid: string;
  email: string;
  nickname: string;
  teamId: number | null;
  team: Team | null;
  createdAt: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  emoji: string;
  primaryColor: string;
}

export interface Room {
  id: number;
  name: string;
  tagCode: string;
  chatKey: string; // Firestore 채팅 경로 키 (rooms/{chatKey}/messages)
  memberCount: number;
  hostId: number;
  gameId: number | null;
  createdAt: string;
}

export interface Game {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  stadium: string;
  gameDate: string;
  gameTime?: string;
  startTime?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'; // BE GameStatus와 1:1
  inning: number | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string; // 시스템 안내 메시지는 'system'
  senderNickname: string;
  senderTeamEmoji?: string;
  senderTeamShort?: string | null; // 발신 시점의 응원 구단 (엠블럼 표시용)
  content: string;
  /** 'LIVE' = 서버가 보내는 실시간 중계 (타석 시작/결과) */
  type: 'TEXT' | 'IMAGE' | 'BET' | 'LIVE';
  /** type === 'LIVE' 일 때만. AT_BAT_START 에 배팅 버튼을 붙인다 */
  liveKind?: 'AT_BAT_START' | 'AT_BAT_RESULT';
  imageUrl?: string;
  betId?: number;
  createdAt: number;
}

export interface RoomMember {
  id: number;
  nickname: string;
  favoriteTeamName: string | null;
  joinedAt: string;
}

// BE BetResponse 스펙과 1:1 대응 (tagup-backend BetResponse.java · docs/AT_BAT_BET_API.md)
export type BetStatus = 'PENDING' | 'ACCEPTED' | 'FINISHED' | 'CANCELLED';
export type BetResult = 'WIN' | 'LOSE' | 'DRAW';

/** 승패 배팅 / 타석 배팅 — 정산 경로가 완전히 다르다 */
export type BetType = 'WIN_LOSE' | 'AT_BAT';

/**
 * 타석 결과. KBO 응답으로는 안타·볼넷·뜬공·땅볼을 구분할 수 없어 2지선다뿐이다.
 * UNKNOWN 은 정산 결과로만 나오고 배팅 대상이 아니다.
 */
export type AtBatResult = 'OUT' | 'SAFE' | 'UNKNOWN';

export interface AtBatInfo {
  inning: number;
  half: string; // '초' | '말'
  batter: string;
  betOnResult: AtBatResult;
}

export interface BetUserInfo {
  id: number;
  nickname: string;
}

export interface BetTeamInfo {
  id: number;
  shortName: string;
}

export interface BetGameSummary {
  id: number;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
}

export interface Bet {
  id: number;
  type: BetType;
  proposer: BetUserInfo;
  receiver: BetUserInfo | null; // 오픈 배팅: 콜 전까지 null
  /** 승패 배팅에서만 채워진다. 타석 배팅에서는 null */
  betOnTeamId: number | null;
  betOnTeam: BetTeamInfo | null;
  /** 타석 배팅에서만 채워진다. 승패 배팅에서는 null */
  atBat: AtBatInfo | null;
  content: string;
  status: BetStatus;
  proposerResult: BetResult | null; // 제안자 기준, 정산 전 null
  game: BetGameSummary;
  createdAt: string;
}
