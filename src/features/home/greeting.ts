import { Game } from '../../types';

/**
 * 홈 첫 줄. <b>응원팀과 그 팀의 오늘 경기 상태</b>로 결정된다.
 *
 * <p>기능 이름을 그대로 쓰지 않고 말을 걸듯 쓴다. 느낌표는 한 줄에 하나까지만 — 여기저기 붙으면
 * 들뜬 게 아니라 시끄러워진다. 진 날에는 밝게 쓰지 않는다. 놀리는 건 친구들이 채팅으로 한다.
 */
export interface Greeting {
  title: string;
  subtitle: string;
}

interface Params {
  /** 응원팀 약칭. 설정 전이면 비어 있다 */
  myTeamShortName?: string | null;
  games: Game[];
  now?: Date;
}

export function buildGreeting({ myTeamShortName, games, now = new Date() }: Params): Greeting {
  if (!myTeamShortName) {
    return { title: '어느 팀 보세요?', subtitle: '팀을 고르면 그 경기부터 보여드릴게요' };
  }

  const myGame = games.find(
    (g) => g.awayTeam.shortName === myTeamShortName || g.homeTeam.shortName === myTeamShortName
  );

  if (!myGame) {
    const others = games.length;
    return others > 0
      ? { title: `오늘 ${myTeamShortName}은 쉬어요`, subtitle: `다른 경기 ${others}개는 열려 있어요` }
      : { title: '오늘은 야구가 쉬어요', subtitle: '내일 경기를 기다려요' };
  }

  const isAway = myGame.awayTeam.shortName === myTeamShortName;
  const opponent = (isAway ? myGame.homeTeam : myGame.awayTeam).shortName;

  switch (myGame.status) {
    case 'IN_PROGRESS':
      return inProgress(myGame, myTeamShortName, isAway);
    case 'FINISHED':
      return finished(myGame, myTeamShortName, isAway, opponent);
    case 'CANCELLED':
      return {
        title: `오늘 ${myTeamShortName} 경기는 취소됐어요`,
        subtitle: '다음 경기를 기다려요',
      };
    default:
      return scheduled(myGame, myTeamShortName, opponent, now);
  }
}

function inProgress(game: Game, myTeam: string, isAway: boolean): Greeting {
  const live = game.live;

  // 수집이 멈췄거나 아직 점수를 못 받은 상태. 없는 점수를 0:0으로 꾸며내지 않는다
  if (!live || live.awayScore == null || live.homeScore == null) {
    return {
      title: `${myTeam} 경기가 진행 중이에요`,
      subtitle: '점수는 잠시 뒤에 보여드릴게요',
    };
  }

  const mine = isAway ? live.awayScore : live.homeScore;
  const theirs = isAway ? live.homeScore : live.awayScore;
  const where = situation(live);

  if (mine > theirs) {
    return { title: `지금 ${myTeam}이 앞서고 있어요!`, subtitle: `${where} · 한 판 걸어볼까요?` };
  }
  if (mine < theirs) {
    return { title: `${myTeam}이 ${theirs - mine}점 뒤지고 있어요`, subtitle: `${where} · 아직 안 끝났어요` };
  }
  return { title: `${mine}대 ${theirs}, 팽팽하네요`, subtitle: where };
}

function finished(game: Game, myTeam: string, isAway: boolean, opponent: string): Greeting {
  const mine = isAway ? game.awayScore : game.homeScore;
  const theirs = isAway ? game.homeScore : game.awayScore;

  if (mine == null || theirs == null) {
    return { title: `${myTeam} 경기가 끝났어요`, subtitle: '결과를 불러오는 중이에요' };
  }
  if (mine > theirs) {
    return { title: `${myTeam} 이겼어요!`, subtitle: `${mine}대 ${theirs}로 ${opponent}전 승` };
  }
  if (mine < theirs) {
    return { title: '아쉽게 졌어요', subtitle: `${theirs}대 ${mine} · 내일 다시 붙어요` };
  }
  return { title: '무승부로 끝났어요', subtitle: `${mine}대 ${theirs} · ${opponent}전` };
}

function scheduled(game: Game, myTeam: string, opponent: string, now: Date): Greeting {
  const subtitle = `${game.stadium}에서 ${opponent}전`;
  const minutes = minutesUntil(game, now);

  if (minutes == null) return { title: `오늘 ${myTeam} 경기가 있어요`, subtitle };
  if (minutes <= 0) return { title: `${myTeam} 경기, 곧 시작해요`, subtitle };
  if (minutes < 60) return { title: `${myTeam} 경기, ${minutes}분 뒤예요`, subtitle };

  return { title: `${myTeam} 경기, ${Math.floor(minutes / 60)}시간 뒤예요`, subtitle };
}

/** "7회초 2사" 처럼 지금 어디쯤인지 */
function situation(live: NonNullable<Game['live']>): string {
  if (live.inning == null) return '경기 중';

  const half = live.half === 'BOTTOM' ? '말' : '초';
  const outs = live.out != null ? ` ${live.out}사` : '';
  return `${live.inning}회${half}${outs}`;
}

function minutesUntil(game: Game, now: Date): number | null {
  const time = game.gameTime ?? game.startTime;
  if (!time) return null;

  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  const start = new Date(now);
  start.setHours(hour, minute, 0, 0);
  return Math.round((start.getTime() - now.getTime()) / 60000);
}
