import React from 'react';
import Svg, {
  Circle, Path, Rect, Text, Defs, ClipPath, Ellipse, G,
} from 'react-native-svg';

interface EmblemProps { size?: number; }

// ---- 공통 래퍼 ----
function Base({
  uid, primary, label, subLabel, size, children,
}: {
  uid: string; primary: string; label: string; subLabel: string;
  size: number; children: React.ReactNode;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <ClipPath id={`c-${uid}`}>
          <Circle cx="120" cy="120" r="110" />
        </ClipPath>
      </Defs>
      <Circle cx="120" cy="120" r="118" fill={primary} />
      <Circle cx="120" cy="120" r="113" fill="#FBF6EC" />
      <G clipPath={`url(#c-${uid})`}>
        {children}
        <Rect x="0" y="150" width="240" height="90" fill={primary} />
        <Text x="120" y="189" textAnchor="middle" fontWeight="900" fontSize={28} fill="#fff" letterSpacing={1}>
          {label}
        </Text>
        <Text x="120" y="211" textAnchor="middle" fontWeight="700" fontSize={11} fill="#fff" fillOpacity={0.85} letterSpacing={2.5}>
          {subLabel}
        </Text>
      </G>
      <Circle cx="120" cy="120" r="110" fill="none" stroke="#fff" strokeWidth="4" />
      <Circle cx="120" cy="120" r="118" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
    </Svg>
  );
}

// ---- LG 트윈스 ----
export function LGTwins({ size = 120 }: EmblemProps) {
  return (
    <Base uid="lg" primary="#D6294A" label="TWINS" subLabel="SEOUL · '82" size={size}>
      <Path d="M67,92 C69,71 111,71 113,92 Z" fill="#D6294A" />
      <Path d="M127,92 C129,71 171,71 173,92 Z" fill="#D6294A" />
      <Circle cx="90" cy="94" r="25" fill="#FBF6EC" stroke="#D6294A" strokeWidth="3" />
      <Circle cx="150" cy="94" r="25" fill="#FBF6EC" stroke="#D6294A" strokeWidth="3" />
      <Circle cx="76" cy="102" r="5" fill="#F7A8B8" />
      <Circle cx="164" cy="102" r="5" fill="#F7A8B8" />
      <Circle cx="83" cy="94" r="3.4" fill="#2A2530" />
      <Circle cx="97" cy="94" r="3.4" fill="#2A2530" />
      <Circle cx="143" cy="94" r="3.4" fill="#2A2530" />
      <Circle cx="157" cy="94" r="3.4" fill="#2A2530" />
      <Path d="M85,102 l5,6 l5,-6 Z" fill="#E8912E" />
      <Path d="M145,102 l5,6 l5,-6 Z" fill="#E8912E" />
    </Base>
  );
}

// ---- 두산 베어스 ----
export function DoosanBears({ size = 120 }: EmblemProps) {
  return (
    <Base uid="doosan" primary="#1E2E5F" label="BEARS" subLabel="SEOUL · '82" size={size}>
      <Circle cx="90" cy="58" r="15" fill="#B98A5A" />
      <Circle cx="90" cy="58" r="8" fill="#E7C79A" />
      <Circle cx="150" cy="58" r="15" fill="#B98A5A" />
      <Circle cx="150" cy="58" r="8" fill="#E7C79A" />
      <Circle cx="120" cy="92" r="48" fill="#C89B6A" />
      <Ellipse cx="120" cy="110" rx="24" ry="18" fill="#EBD6B0" />
      <Circle cx="102" cy="86" r="7" fill="#FBF6EC" />
      <Circle cx="138" cy="86" r="7" fill="#FBF6EC" />
      <Circle cx="103" cy="87" r="4" fill="#3A2A1E" />
      <Circle cx="137" cy="87" r="4" fill="#3A2A1E" />
      <Ellipse cx="120" cy="102" rx="9" ry="6" fill="#3A2A1E" />
      <Path d="M120,108 v6 M120,114 q-8,4 -12,0 M120,114 q8,4 12,0" fill="none" stroke="#3A2A1E" strokeWidth="2.5" strokeLinecap="round" />
    </Base>
  );
}

// ---- 키움 히어로즈 ----
export function KiwoomHeroes({ size = 120 }: EmblemProps) {
  return (
    <Base uid="kiwoom" primary="#7C2B45" label="HEROES" subLabel="SEOUL · '08" size={size}>
      <Path d="M92,96 L76,142 L120,126 L164,142 L148,96 Z" fill="#5E1E33" />
      <Circle cx="120" cy="90" r="42" fill="#FBF6EC" stroke="#7C2B45" strokeWidth="3" />
      <Path d="M86,82 Q120,70 154,82 Q152,99 120,99 Q88,99 86,82 Z" fill="#7C2B45" />
      <Circle cx="106" cy="86" r="6.5" fill="#fff" />
      <Circle cx="134" cy="86" r="6.5" fill="#fff" />
      <Circle cx="107" cy="87" r="3.2" fill="#2A2530" />
      <Circle cx="133" cy="87" r="3.2" fill="#2A2530" />
      <Circle cx="98" cy="107" r="6" fill="#F7A8B8" />
      <Circle cx="142" cy="107" r="6" fill="#F7A8B8" />
      <Path d="M108,109 Q120,119 132,109" fill="none" stroke="#7C2B45" strokeWidth="3" strokeLinecap="round" />
    </Base>
  );
}

// ---- SSG 랜더스 (우주인) ----
export function SSGLanders({ size = 120 }: EmblemProps) {
  return (
    <Base uid="ssg" primary="#D93A34" label="LANDERS" subLabel="INCHEON · '00" size={size}>
      <Path d="M120,44 v10" stroke="#D93A34" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="120" cy="42" r="4.5" fill="#D93A34" />
      <Circle cx="120" cy="92" r="42" fill="#FBF6EC" stroke="#D93A34" strokeWidth="3" />
      <Circle cx="86" cy="92" r="9" fill="#D93A34" />
      <Circle cx="154" cy="92" r="9" fill="#D93A34" />
      <Path d="M94,90 Q94,66 120,66 Q146,66 146,90 Q146,112 120,114 Q94,112 94,90 Z" fill="#2B3A5E" />
      <Ellipse cx="107" cy="80" rx="7" ry="11" fill="#5B76A8" fillOpacity={0.7} />
      <Circle cx="110" cy="92" r="4.5" fill="#fff" />
      <Circle cx="132" cy="92" r="4.5" fill="#fff" />
      <Path d="M110,102 Q121,110 132,102" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </Base>
  );
}

// ---- KT 위즈 ----
export function KTWiz({ size = 120 }: EmblemProps) {
  return (
    <Base uid="kt" primary="#2C2C33" label="WIZ" subLabel="SUWON · '13" size={size}>
      <Path d="M84,58 l4,-20 l16,12 Z" fill="#4A5560" />
      <Path d="M156,58 l-4,-20 l-16,12 Z" fill="#4A5560" />
      <Circle cx="120" cy="94" r="48" fill="#4A5560" />
      <Ellipse cx="120" cy="116" rx="28" ry="22" fill="#5E6A76" />
      <Circle cx="102" cy="90" r="16" fill="#fff" stroke="#E23B34" strokeWidth="3" />
      <Circle cx="138" cy="90" r="16" fill="#fff" stroke="#E23B34" strokeWidth="3" />
      <Circle cx="103" cy="91" r="7" fill="#2A2A2A" />
      <Circle cx="137" cy="91" r="7" fill="#2A2A2A" />
      <Path d="M113,100 L120,114 L127,100 Z" fill="#E8912E" />
    </Base>
  );
}

// ---- KIA 타이거즈 ----
export function KIATigers({ size = 120 }: EmblemProps) {
  return (
    <Base uid="kia" primary="#E11B2E" label="TIGERS" subLabel="GWANGJU · '82" size={size}>
      <Circle cx="86" cy="60" r="14" fill="#F3922B" />
      <Circle cx="86" cy="60" r="7" fill="#FBF6EC" />
      <Circle cx="154" cy="60" r="14" fill="#F3922B" />
      <Circle cx="154" cy="60" r="7" fill="#FBF6EC" />
      <Circle cx="120" cy="92" r="48" fill="#F3922B" />
      <Ellipse cx="120" cy="112" rx="26" ry="18" fill="#FBF6EC" />
      <Path d="M120,50 v16 M104,54 l4,14 M136,54 l-4,14" stroke="#2A2320" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M78,90 l14,4 M78,102 l14,2 M162,90 l-14,4 M162,102 l-14,2" stroke="#2A2320" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Circle cx="105" cy="90" r="5.5" fill="#2A2320" />
      <Circle cx="135" cy="90" r="5.5" fill="#2A2320" />
      <Path d="M112,104 h16 l-8,8 Z" fill="#E86A8A" />
      <Path d="M120,112 v6 M120,118 q-9,6 -14,0 M120,118 q9,6 14,0" fill="none" stroke="#2A2320" strokeWidth="2.5" strokeLinecap="round" />
    </Base>
  );
}

// ---- 삼성 라이온즈 ----
export function SamsungLions({ size = 120 }: EmblemProps) {
  return (
    <Base uid="samsung" primary="#17539E" label="LIONS" subLabel="DAEGU · '82" size={size}>
      <G fill="#E7A73C">
        <Circle cx="120" cy="42" r="11" />
        <Circle cx="157" cy="57" r="11" />
        <Circle cx="172" cy="94" r="11" />
        <Circle cx="157" cy="131" r="11" />
        <Circle cx="83" cy="57" r="11" />
        <Circle cx="68" cy="94" r="11" />
        <Circle cx="83" cy="131" r="11" />
      </G>
      <Circle cx="120" cy="94" r="52" fill="#E39B2E" />
      <Circle cx="90" cy="66" r="11" fill="#EBCB92" />
      <Circle cx="150" cy="66" r="11" fill="#EBCB92" />
      <Circle cx="120" cy="94" r="38" fill="#EBCB92" />
      <Circle cx="107" cy="90" r="5" fill="#4A3620" />
      <Circle cx="133" cy="90" r="5" fill="#4A3620" />
      <Path d="M113,102 h14 l-7,7 Z" fill="#8A5A2E" />
      <Path d="M120,109 v5 M120,114 q-8,5 -12,0 M120,114 q8,5 12,0" fill="none" stroke="#8A5A2E" strokeWidth="2.5" strokeLinecap="round" />
    </Base>
  );
}

// ---- 롯데 자이언츠 ----
export function LotteGiants({ size = 120 }: EmblemProps) {
  return (
    <Base uid="lotte" primary="#16325C" label="GIANTS" subLabel="BUSAN · '82" size={size}>
      <Path d="M62,84 q22,-20 44,-4 q-22,-2 -44,6 Z" fill="#9AA7B4" />
      <Path d="M178,84 q-22,-20 -44,-4 q22,-2 44,6 Z" fill="#9AA7B4" />
      <Circle cx="120" cy="92" r="42" fill="#fff" stroke="#DFE4EA" strokeWidth="2" />
      <Path d="M82,88 C82,64 100,50 120,50 C140,50 158,64 158,88 C140,80 100,80 82,88 Z" fill="#B7C1CC" />
      <Circle cx="108" cy="90" r="5" fill="#2A2A2A" />
      <Circle cx="132" cy="90" r="5" fill="#2A2A2A" />
      <Path d="M112,100 L120,116 L128,100 Z" fill="#E8B02E" />
      <Path d="M115,108 L120,116 L125,108 Z" fill="#D6342F" />
      <Circle cx="99" cy="103" r="5.5" fill="#F7C3BF" />
      <Circle cx="141" cy="103" r="5.5" fill="#F7C3BF" />
    </Base>
  );
}

// ---- 한화 이글스 ----
export function HanwhaEagles({ size = 120 }: EmblemProps) {
  return (
    <Base uid="hanwha" primary="#EE6A1E" label="EAGLES" subLabel="DAEJEON · '86" size={size}>
      <Circle cx="120" cy="98" r="44" fill="#fff" stroke="#E6E0D8" strokeWidth="2" />
      <Path d="M78,92 C80,60 100,46 120,46 C140,46 160,60 162,92 C140,80 100,80 78,92 Z" fill="#6E4B2E" />
      <Path d="M96,86 l16,6 M144,86 l-16,6" stroke="#6E4B2E" strokeWidth="5" strokeLinecap="round" />
      <Circle cx="104" cy="96" r="7" fill="#F4C430" />
      <Circle cx="136" cy="96" r="7" fill="#F4C430" />
      <Circle cx="104" cy="97" r="3.5" fill="#2A2A2A" />
      <Circle cx="136" cy="97" r="3.5" fill="#2A2A2A" />
      <Path d="M110,104 q10,4 20,0 q-2,16 -10,20 q-8,-4 -10,-20 Z" fill="#E8B02E" />
      <Path d="M112,120 q8,3 16,0 q-6,8 -8,8 q-2,0 -8,-8 Z" fill="#D89416" />
    </Base>
  );
}

// ---- NC 다이노스 ----
export function NCDinos({ size = 120 }: EmblemProps) {
  return (
    <Base uid="nc" primary="#21315F" label="DINOS" subLabel="CHANGWON · '11" size={size}>
      <G fill="#C79A44">
        <Path d="M92,56 l7,-14 l7,14 Z" />
        <Path d="M113,50 l7,-15 l7,15 Z" />
        <Path d="M134,56 l7,-14 l7,14 Z" />
      </G>
      <Ellipse cx="120" cy="98" rx="50" ry="44" fill="#5FB06A" />
      <Ellipse cx="120" cy="116" rx="30" ry="22" fill="#8FCF96" />
      <Circle cx="132" cy="86" r="11" fill="#fff" />
      <Circle cx="134" cy="87" r="5.5" fill="#2A2A2A" />
      <Circle cx="100" cy="88" r="8" fill="#fff" />
      <Circle cx="101" cy="89" r="4" fill="#2A2A2A" />
      <Circle cx="112" cy="70" r="2.5" fill="#3D7D47" />
      <Circle cx="128" cy="70" r="2.5" fill="#3D7D47" />
      <Path d="M96,112 q24,14 48,0" fill="none" stroke="#3D7D47" strokeWidth="3" strokeLinecap="round" />
      <G fill="#fff">
        <Path d="M104,114 l4,7 l4,-7 Z" />
        <Path d="M128,114 l4,7 l4,-7 Z" />
      </G>
    </Base>
  );
}

// ---- shortName → 컴포넌트 매핑 ----
const EMBLEM_MAP: Record<string, React.ComponentType<EmblemProps>> = {
  LG: LGTwins,
  두산: DoosanBears,
  키움: KiwoomHeroes,
  SSG: SSGLanders,
  KT: KTWiz,
  KIA: KIATigers,
  삼성: SamsungLions,
  롯데: LotteGiants,
  한화: HanwhaEagles,
  NC: NCDinos,
};

interface TeamEmblemProps extends EmblemProps {
  shortName: string;
}

export function TeamEmblem({ shortName, size = 120 }: TeamEmblemProps) {
  const Component = EMBLEM_MAP[shortName];
  if (!Component) return null;
  return <Component size={size} />;
}
