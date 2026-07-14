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
  status: 'SCHEDULED' | 'LIVE' | 'FINAL' | 'FINISHED' | 'CANCELLED';
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
  type: 'TEXT' | 'IMAGE' | 'BET';
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

// BE BetResponse 스펙과 1:1 대응 (tagup-backend BetResponse.java)
export type BetStatus = 'PENDING' | 'ACCEPTED' | 'FINISHED' | 'CANCELLED';
export type BetResult = 'WIN' | 'LOSE' | 'DRAW';

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
  proposer: BetUserInfo;
  receiver: BetUserInfo | null; // 오픈 배팅: 콜 전까지 null
  betOnTeamId: number;
  betOnTeam: BetTeamInfo;
  content: string;
  status: BetStatus;
  proposerResult: BetResult | null; // 제안자 기준, 정산 전 null
  game: BetGameSummary;
  createdAt: string;
}
