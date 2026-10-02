import { Game } from '../../types';

/**
 * 홈 첫 줄. <b>응원팀과 그 팀의 오늘 경기 상태</b>로 결정된다.
 *
 * <p><b>중계체로 쓴다.</b> 완결 어미("~하고 있어요")와 권유("~볼까요?")를 붙이지 않는다.
 * 모든 줄이 완전한 문장이고 끝마다 권유가 달리면 리듬이 똑같아져 템플릿처럼 읽힌다.
 * 숫자와 명사로 끊어 적으면 전광판처럼 보이고, 그게 야구 앱에는 더 자연스럽다.
 *
 * <p>같은 상황에도 문구를 2~3개 두고 돌아가며 쓴다. 열 때마다 글자 하나 안 바뀌면
 * 그 순간 기계가 쓴 티가 난다. 다만 {@link pick} 은 경기 상황으로 고르므로,
 * 화면을 다시 그린다고 문장이 깜빡이며 바뀌지는 않는다.
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
    return { title: '응원팀 미설정', subtitle: '프로필에서 팀을 고르면 그 경기가 먼저' };
  }

  const myGame = games.find(
    (g) => g.awayTeam.shortName === myTeamShortName || g.homeTeam.shortName === myTeamShortName
  );

  if (!myGame) {
    return games.length > 0
      ? { title: `오늘 ${myTeamShortName} 경기 없음`, subtitle: `다른 경기 ${games.length}개` }
      : { title: '오늘 경기 없음', subtitle: '내일 일정 확인' };
  }

  const isAway = myGame.awayTeam.shortName === myTeamShortName;
  const opponent = (isAway ? myGame.homeTeam : myGame.awayTeam).shortName;

  switch (myGame.status) {
    case 'IN_PROGRESS':
      return inProgress(myGame, myTeamShortName, isAway);
    case 'FINISHED':
      return finished(myGame, myTeamShortName, isAway, opponent);
    case 'CANCELLED':
      return { title: `오늘 ${myTeamShortName} 경기 취소`, subtitle: '다음 경기 대기' };
    default:
      return scheduled(myGame, myTeamShortName, opponent, now);
  }
}

function inProgress(game: Game, myTeam: string, isAway: boolean): Greeting {
  const live = game.live;

  // 수집이 멈췄거나 아직 점수를 못 받았다. 없는 점수를 0-0으로 꾸며내지 않는다
  if (!live || live.awayScore == null || live.homeScore == null) {
    return { title: `${myTeam} 경기 중`, subtitle: '점수 집계 중' };
  }

  const mine = isAway ? live.awayScore : live.homeScore;
  const theirs = isAway ? live.homeScore : live.awayScore;
  const seed = (live.inning ?? 0) * 10 + mine + theirs;
  const subtitle = situation(live);

  if (mine > theirs) {
    return {
      title: pick(seed, [
        `${myTeam} ${mine}-${theirs} 리드`,
        `${myTeam} ${mine - theirs}점 앞서는 중`,
        `${mine}-${theirs}, ${myTeam} 우세`,
      ]),
      subtitle,
    };
  }

  if (mine < theirs) {
    return {
      title: pick(seed, [
        `${myTeam} ${theirs - mine}점 뒤`,
        `${mine}-${theirs}, ${myTeam} 추격 중`,
        `${myTeam} 열세 ${mine}-${theirs}`,
      ]),
      subtitle,
    };
  }

  return {
    title: pick(seed, [`${mine}-${theirs} 동점`, `동점 승부 ${mine}-${theirs}`]),
    subtitle,
  };
}

function finished(game: Game, myTeam: string, isAway: boolean, opponent: string): Greeting {
  const mine = isAway ? game.awayScore : game.homeScore;
  const theirs = isAway ? game.homeScore : game.awayScore;

  if (mine == null || theirs == null) {
    return { title: `${myTeam} 경기 종료`, subtitle: `${opponent}전` };
  }

  const seed = mine * 3 + theirs;
  const subtitle = `${opponent}전`;

  if (mine > theirs) {
    return {
      title: pick(seed, [`${myTeam} ${mine}-${theirs} 승`, `${myTeam} 승 · ${mine}-${theirs}`]),
      subtitle,
    };
  }
  if (mine < theirs) {
    return {
      title: pick(seed, [`${myTeam} ${mine}-${theirs} 패`, `${myTeam} 패 · ${mine}-${theirs}`]),
      subtitle,
    };
  }
  return { title: `${mine}-${theirs} 무승부`, subtitle };
}

function scheduled(game: Game, myTeam: string, opponent: string, now: Date): Greeting {
  const time = (game.gameTime ?? game.startTime ?? '').slice(0, 5);
  const subtitle = game.stadium || `${opponent}전`;
  const minutes = minutesUntil(time, now);

  if (minutes == null) return { title: `오늘 ${opponent}전`, subtitle };
  if (minutes <= 0) return { title: `${opponent}전 곧 시작`, subtitle };

  const left = minutes < 60 ? `${minutes}분` : `${Math.floor(minutes / 60)}시간`;
  const seed = minutes;

  return {
    title: pick(seed, [
      `오늘 ${time} ${opponent}전`,
      `${opponent}전 ${left} 뒤`,
      `${myTeam} 경기 ${left} 뒤`,
    ]),
    subtitle,
  };
}

/** "7회초 2사 1·2루" — 숫자와 명사로만 끊는다 */
function situation(live: NonNullable<Game['live']>): string {
  if (live.inning == null) return '경기 중';

  const half = live.half === 'BOTTOM' ? '말' : '초';
  const outs = live.out != null ? `${live.out}사` : '';
  const bases = [
    live.bases?.first && '1',
    live.bases?.second && '2',
    live.bases?.third && '3',
  ].filter(Boolean);

  const runners = bases.length === 3 ? '만루' : bases.length > 0 ? `${bases.join('·')}루` : '';
  return [`${live.inning}회${half}`, outs, runners].filter(Boolean).join(' ');
}

/**
 * 변주를 고른다. 난수가 아니라 <b>경기 상황에서 뽑은 값</b>으로 고르는 이유는,
 * 화면을 다시 그릴 때마다 문장이 바뀌면 눈에 거슬리기 때문이다. 점수나 이닝이 바뀌면 문장도 바뀐다.
 */
function pick<T>(seed: number, options: T[]): T {
  return options[Math.abs(Math.trunc(seed)) % options.length];
}

function minutesUntil(time: string, now: Date): number | null {
  if (!time) return null;

  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  const start = new Date(now);
  start.setHours(hour, minute, 0, 0);
  return Math.round((start.getTime() - now.getTime()) / 60000);
}
