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
  startTime: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINAL' | 'FINISHED' | 'CANCELLED';
  inning: number | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'BET';
  imageUrl?: string;
  betId?: number;
  createdAt: number;
}

export interface Bet {
  id: number;
  roomId: number;
  proposerId: number;
  proposerNickname: string;
  gameId: number;
  betType: 'GAME_RESULT' | 'AT_BAT';
  condition: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
  result: 'SAFE' | 'OUT' | null;
  createdAt: string;
}
