# CSAT Simulator - TV Display Version

수능 시뮬레이터의 TV 디스플레이 버전입니다. 강의실 맨 앞 대형 화면에 표시하기 위해 만들어졌습니다.

## 🎯 주요 기능

- **대형 시계**: 180px 크기의 디지털 시계 (토글 가능)
- **과목명 대형 표시**: 현재 진행 중인 과목/상태를 화면 중앙에 크게 표시
- **자동 재생**: 페이지 로드 시 자동으로 시작
- **수능 시간표 자동 진행**: 08:05부터 16:32까지 실제 수능 시간표에 맞춰 진행
- **안내 방송**: 각 타임라인마다 실제 수능 안내 방송 재생 (토글 가능)
- **키보드 단축키**: 시계/소리 빠르게 제어
- **반응형 UI**: 시계를 끄면 과목명이 더 크게 표시됨 (9xl)

## 🚀 로컬 개발

```bash
# 의존성 설치
yarn install

# 개발 서버 실행
yarn dev
```

http://localhost:3000 으로 접속하세요.

## 📦 빌드

```bash
yarn build
```

빌드 후 `out` 폴더에 정적 파일이 생성됩니다.

## 🌐 GitHub Pages 배포

### 1. GitHub Repository 설정

1. GitHub에서 저장소 생성
2. Settings → Pages → Source를 "GitHub Actions"로 변경

### 2. 코드 푸시

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### 3. 자동 배포

`main` 브랜치에 푸시하면 자동으로 GitHub Pages에 배포됩니다.
배포된 사이트는 `https://[username].github.io/csat-simulator/`에서 확인할 수 있습니다.

## ⚙️ 설정 변경

### 저장소 이름이 다른 경우

**방법 1**: `.env.production` 파일 수정 (권장)
```bash
NEXT_PUBLIC_BASE_PATH=/your-repo-name
```

**방법 2**: `next.config.js`의 `basePath` 수정
```javascript
const nextConfig = {
  output: 'export',
  basePath: '/your-repo-name', // 여기를 수정
  images: {
    unoptimized: true,
  },
};
```

### 자동 재생 시간 조정

`src/app/page.tsx`의 자동 시작 타이머를 조정할 수 있습니다:

```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    setActive(true);
  }, 1000); // 1초 후 시작 (조정 가능)
  return () => clearTimeout(timer);
}, []);
```

## 📱 사용법

1. TV 브라우저에서 배포된 URL 접속
2. **화면 한 번 클릭** (브라우저 자동재생 정책 때문에 필요)
3. 자동으로 시뮬레이션 시작
4. 전체화면 모드(F11) 권장

### ⌨️ 키보드 단축키

- **M** - 메뉴 열기/닫기
- **S** - 소리 켜기/끄기
- **C** - 시계 보이기/숨기기

### 🎛️ 토글 기능

**우측 상단 메뉴 버튼**을 클릭하면 컨트롤 패널이 나타납니다:
- **소리 재생**: 안내 방송을 끄거나 켤 수 있습니다 (타임라인은 계속 진행)
- **시계 표시**: 시계를 숨기면 과목명이 더 크게 표시됩니다

### 💡 팁
- **처음 접속 시**: "화면을 클릭하여 시작하세요" 메시지가 나타나면 화면 아무곳이나 클릭
- **오디오**: 클릭 후 수능 안내 방송이 자동으로 재생됩니다
- **시간**: 08:05(입실 시간)부터 16:32(시험 종료)까지 수능 시간표에 맞춰 진행됩니다
- **시계 OFF**: 과목명만 크게 보고 싶을 때 **C키** 또는 메뉴에서 시계를 끄세요
- **소리 OFF**: 밤이나 조용한 환경에서는 **S키**로 소리를 끄세요

## 🔧 기술 스택

- **Next.js 13** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **dayjs** - 시간 처리
- **Web Audio API** - 오디오 이펙트

## 📝 원작자

Original CSAT Simulator by [ArpaAP](https://github.com/ArpaAP/csat-simulator)

---

## 서버 필요 여부

**서버 필요 없습니다!** 이 프로젝트는 완전히 클라이언트 사이드로만 동작하며, 정적 파일로 배포됩니다.
