export interface KboTeam {
  id: number;
  name: string;
  shortName: string;
  emoji: string;
  primaryColor: string;
}

export const KBO_TEAMS: KboTeam[] = [
  { id: 1, name: '기아 타이거즈', shortName: 'KIA', emoji: '🐯', primaryColor: '#EA0029' },
  { id: 2, name: '삼성 라이온즈', shortName: '삼성', emoji: '🦁', primaryColor: '#074CA1' },
  { id: 3, name: 'LG 트윈스', shortName: 'LG', emoji: '⚡', primaryColor: '#C30452' },
  { id: 4, name: '두산 베어스', shortName: '두산', emoji: '🐻', primaryColor: '#131230' },
  { id: 5, name: 'KT 위즈', shortName: 'KT', emoji: '🧙', primaryColor: '#000000' },
  { id: 6, name: 'SSG 랜더스', shortName: 'SSG', emoji: '🚀', primaryColor: '#CE0E2D' },
  { id: 7, name: '롯데 자이언츠', shortName: '롯데', emoji: '🔵', primaryColor: '#002B5C' },
  { id: 8, name: '한화 이글스', shortName: '한화', emoji: '🦅', primaryColor: '#FF6600' },
  { id: 9, name: 'NC 다이노스', shortName: 'NC', emoji: '🦕', primaryColor: '#071D3C' },
  { id: 10, name: '키움 히어로즈', shortName: '키움', emoji: '⚾', primaryColor: '#820024' },
];
