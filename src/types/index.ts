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

/** 진행 중인 경기의 지금 상태. 서버가 15초마다 KBO에서 받아둔 값 (docs/LIVE_GAME_API.md) */
export interface LiveState {
  inning: number | null;
  half: 'TOP' | 'BOTTOM' | null;
  awayScore: number | null;
  homeScore: number | null;
  out: number | null;
  ball: number | null;
  strike: number | null;
  bases: { first: boolean; second: boolean; third: boolean };
  batter: string | null;
  pitcher: string | null;
  /** 서버가 이 값을 받은 시각 (ISO) */
  updatedAt: string;
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
  /**
   * 진행 중이고 서버 수집이 살아 있을 때만 채워진다.
   *
   * 경기 중에는 homeScore/awayScore 가 null 이다 — KBO 일정 API가 경기 중 점수를 0:0으로
   * 주기 때문에 서버가 버린다. **경기 중 점수는 반드시 이 필드에서 읽을 것.**
   */
  live?: LiveState | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string; // 시스템 안내 메시지는 'system'
  senderNickname: string;
  senderTeamShort?: string | null; // 발신 시점의 응원 구단 (엠블럼 표시용)
  content: string;
  /** 'LIVE' = 서버가 보내는 실시간 중계 (타석 시작/결과) */
  type: 'TEXT' | 'IMAGE' | 'BET' | 'LIVE';
  /** type === 'LIVE' 일 때만. AT_BAT_START 에 배팅 버튼을 붙인다 */
  liveKind?: 'AT_BAT_START' | 'AT_BAT_RESULT';
  /**
   * 중계 내용을 그릴 재료 (docs/LIVE_RELAY_MESSAGE.md).
   *
   * 2026-10-02 이전 메시지에는 없다 — 그때는 서버가 이모지까지 박은 완성 문장만 보냈다.
   * 없으면 content 를 그대로 출력할 것.
   */
  live?: LiveRelay;
  imageUrl?: string;
  betId?: number;
  createdAt: number;
}

/** 서버가 보내는 중계 재료. 판별하지 못한 값은 키 자체가 없다 */
export interface LiveRelay {
  inning?: number;
  half?: 'TOP' | 'BOTTOM';
  batter?: string;
  pitcher?: string;
  /** 타석 시작에만 — 직전 타석과 투수가 다르면 true */
  pitcherChanged?: boolean;
  /** 타석 결과에만. KBO는 안타·볼넷·뜬공을 구분해주지 않는다 */
  result?: 'OUT' | 'SAFE' | 'UNKNOWN';
  runsScored?: number;
  endedInning?: boolean;
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
