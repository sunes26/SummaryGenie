# SummaryGenie 🧞‍♂️

> AI 기반 웹페이지 요약 및 질문-답변 Chrome Extension

[![Version](https://img.shields.io/badge/version-2.7.0-blue.svg)](https://github.com/yourusername/summarygenie)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-orange.svg)]()
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange.svg)](https://firebase.google.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-brightgreen.svg)](https://openai.com/)

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시스템 아키텍처](#-시스템-아키텍처)
- [설치 및 실행](#-설치-및-실행)
- [프로젝트 구조](#-프로젝트-구조)
- [API 엔드포인트](#-api-엔드포인트)
- [핵심 모듈 및 서비스](#-핵심-모듈-및-서비스)
- [개발 가이드](#-개발-가이드)
- [Firebase 설정](#-firebase-설정)
- [환경 변수](#-환경-변수)
- [배포](#-배포)
- [보안 및 인증](#-보안-및-인증)
- [에러 처리](#-에러-처리)
- [모니터링](#-모니터링)
- [로드맵](#-로드맵)
- [라이선스](#-라이선스)

## 🎯 프로젝트 소개

**SummaryGenie**는 OpenAI GPT-4o-mini를 활용하여 웹페이지를 즉시 요약하고, 내용에 대해 질문할 수 있는 올인원 Chrome Extension입니다. 정보 과부하 시대에 효율적인 콘텐츠 소비를 돕습니다.

### 핵심 가치

- ⚡ **빠른 요약**: 긴 글, 뉴스, 논문을 3-5줄로 즉시 요약
- 📄 **PDF 지원**: PDF 파일 텍스트 자동 추출 및 요약 (180초 타임아웃, 프리미엄 전용)
- 💬 **대화형 Q&A**: 요약 후 추가 질문으로 깊이 있는 이해 (프리미엄 전용)
- 🌏 **다국어 지원**: 한국어, 영어, 일본어, 중국어 완벽 지원
- 🔐 **Firebase 인증**: 영구 로그인 및 자동 토큰 갱신
- ☁️ **클라우드 동기화**: 여러 기기에서 히스토리 공유 (Firestore)
- 🎨 **현대적 UI**: Material Design 기반의 직관적 Side Panel 인터페이스
- ✨ **실시간 진행 상황**: PDF 추출 단계별 시각적 피드백
- 🛡️ **Circuit Breaker**: OpenAI API 장애 시 자동 복구
- 📧 **이메일 통합**: 회원가입, 비밀번호 재설정 이메일 자동 발송
- 🔄 **Service Worker Keep-Alive**: PDF 처리 시 안정적인 백그라운드 작업

### 타겟 사용자

- 정보 수집이 많은 직장인 (마케터, 연구원, 기자)
- 학생 및 연구자
- 영어 콘텐츠를 소비하는 한국인
- 기업의 리서치팀, 컨설팅팀

## ✨ 주요 기능

### 무료 버전
- ✅ 하루 3회 웹페이지 요약
- ✅ 요약 길이 자동 최적화 (콘텐츠 길이 기반)
- ✅ 로컬 히스토리 저장
- ✅ 4개 언어 지원 (한국어, 영어, 일본어, 중국어)
- ✅ Rate Limiting (분당 30회)
- ✅ Modern Side Panel UI

### 프리미엄 버전
- 🌟 무제한 요약
- 🌟 **PDF 파일 요약 지원** (ES Module 기반, 180초 타임아웃, 실시간 진행 표시)
- 🌟 **무제한 질문 기능** (채팅 스타일 Q&A UI)
- 🌟 클라우드 히스토리 동기화 (Firestore)
- 🌟 고급 요약 옵션 (very_detailed, ultra_detailed)
- 🌟 다국어 번역 + 요약
- 🌟 광고 제거
- 🌟 우선 지원
- 🌟 Rate Limiting (분당 100회)

### 기업용 기능 (예정)
- 👥 팀 대시보드 및 협업 기능
- 📊 사용량 통계 및 분석
- 🔒 관리자 권한 관리
- 🔌 API 액세스

## 🛠 기술 스택

### Frontend (Chrome Extension)
- **언어**: JavaScript (ES6+), HTML5, CSS3
- **프레임워크**: Vanilla JS (Chrome Extension Manifest V3)
- **UI 라이브러리**: Material Icons, Inter Font
- **다국어**: Chrome i18n API + I18nManager (v6.0.0)
- **PDF 처리**: PDF.js (ES Module, .mjs) v2.0.0

### Backend (Proxy Server)
- **언어**: Node.js 18+ + Express.js
- **데이터베이스**: 
  - **Firebase Firestore** (사용자 데이터, 히스토리, 구독 정보, 토큰 관리)
  - Firebase Realtime Database (실시간 동기화, 선택사항)
- **인증**: Firebase Authentication + JWT (v9.0.2)
- **AI 모델**: OpenAI GPT-4o-mini (gpt-4o-mini)
- **결제**: Stripe (v14.25.0)
- **이메일**: Nodemailer (Gmail SMTP / SendGrid)
- **비밀번호 해싱**: bcryptjs (10 salt rounds)
- **컨테이너**: Docker + Docker Compose
- **호스팅**: 
  - Google Cloud Run (권장)
  - AWS (EC2, S3)
  - Vercel

### 보안
- **인증**: Firebase Auth (LOCAL persistence) + JWT Token
- **데이터 암호화**: Firestore 자동 암호화 (AES-256)
- **비밀번호 해싱**: bcrypt (10 rounds)
- **입력 검증**: express-validator (v7.0.1)
- **보안 헤더**: helmet (v7.0.0)
- **Rate Limiting**: express-rate-limit (v7.1.5)
- **Circuit Breaker**: 커스텀 구현 (5회 실패 시 차단)

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   Chrome Extension                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ Side Panel │  │  Content   │  │ Background │       │
│  │   (UI)     │  │  Script    │  │  Service   │       │
│  │  v7.0.0    │  │  v5.1.0    │  │  v5.0.0    │       │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘       │
│        │               │               │               │
│        │         ┌─────┴─────┐         │               │
│        │         │ PDF       │         │               │
│        │         │ Offscreen │         │               │
│        │         │ v2.1.0    │         │               │
│        │         │ (ES Mod.) │         │               │
│        │         └───────────┘         │               │
│        │                               │               │
│        │         ┌──────────────┐      │               │
│        │         │ Keep-Alive   │      │               │
│        │         │  (15초 주기)  │      │               │
│        │         │  v7.0.0      │      │               │
│        │         └──────────────┘      │               │
└────────┼───────────────┼───────────────┼──────────────┘
         │               │               │
         │        ┌──────┴───────┐       │
         │        │ PDF Progress │       │
         │        │  Messages    │       │
         │        └──────────────┘       │
         │                               │
         └───────────────┴───────────────┘
                         │
                         │ HTTPS (JWT Bearer Token)
                         ▼
         ┌───────────────────────────────┐
         │  Proxy Server (Node.js/Express)│
         │  ┌──────────┐  ┌──────────┐   │
         │  │ Express  │  │  Helmet  │   │
         │  │  Router  │  │Rate Limit│   │
         │  │          │  │ Circuit  │   │
         │  │          │  │ Breaker  │   │
         │  └────┬─────┘  └──────────┘   │
         └───────┼────────────────────────┘
                 │
      ┌──────────┼──────────┬──────────┐
      │          │          │          │
      ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ OpenAI  │ │Firebase │ │ Stripe  │ │  SMTP   │
│   API   │ │ Cloud   │ │   API   │ │ Server  │
│         │ │  - Auth │ │         │ │(Email)  │
│ Circuit │ │  -Store │ │         │ │         │
│ Breaker │ │ -Tokens │ │         │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### PDF 처리 플로우 (v7.0.0)

```
┌───────────────────────────────────────────────────────────┐
│                     PDF 추출 플로우                        │
└───────────────────────────────────────────────────────────┘

1. 사용자가 Side Panel에서 "요약하기" 클릭
   │
   ├─→ [Side Panel] PDF URL 감지
   │
   ├─→ [Side Panel] Keep-Alive 시작 (15초 주기 ping)
   │
   ├─→ [Side Panel] Background에 extractPDF 메시지 전송
   │
   └─→ [Background] 메시지 수신

2. Background Service Worker 처리
   │
   ├─→ [Background] PDF 다운로드 시작 (fetch)
   │   └─→ 진행 상황: 0% → 50% (다운로드 중)
   │
   ├─→ [Background] Offscreen Document 생성/활성화
   │   └─→ 진행 상황: 50% → 55% (준비 중)
   │
   ├─→ [Background] Offscreen에 PDF 데이터 전송
   │
   └─→ [Offscreen] PDF.js로 텍스트 추출
       ├─→ 진행 상황: 55% → 60% (분석 중)
       ├─→ 진행 상황: 60% → 95% (페이지별 추출)
       └─→ 진행 상황: 95% → 100% (정리 중)

3. 결과 반환 및 Keep-Alive 종료
   │
   ├─→ [Offscreen] 추출 완료 → Background 전송
   │
   ├─→ [Background] pdfExtractionComplete 메시지 발송
   │
   ├─→ [Side Panel] 결과 수신 및 Keep-Alive 중지
   │
   └─→ [Side Panel] 텍스트 요약 진행

※ 타임아웃: 180초 (ACK 10초 + 추출 180초)
※ Keep-Alive: PDF 처리 중 Service Worker 유지
※ 진행 상황: 실시간 UI 업데이트 (0% → 100%)
```

### Firebase Firestore 데이터 구조

```
firestore/
├── users/{userId}
│   ├── id: string (Firebase Auth UID)
│   ├── email: string
│   ├── name: string | null
│   ├── extensionId: string
│   ├── isPremium: boolean
│   ├── role: 'user' | 'admin' | 'moderator'
│   ├── subscriptionPlan: 'free' | 'pro' | 'team' | 'enterprise'
│   ├── stripeCustomerId: string | null
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── lastLoginAt: timestamp
│   ├── metadata: object
│   │   ├── emailVerified: boolean
│   │   ├── loginCount: number
│   │   ├── signupMethod: 'email' | 'google'
│   │   └── ...
│   │
│   ├── /history/{historyId}  ← 서브컬렉션
│   │   ├── userId: string
│   │   ├── title: string (1-500자)
│   │   ├── url: string
│   │   ├── summary: string (1-10000자)
│   │   ├── qaHistory: array<{question, answer, timestamp}>
│   │   ├── metadata: object
│   │   │   ├── language: 'ko' | 'en' | 'ja' | 'zh'
│   │   │   ├── model: string
│   │   │   ├── wordCount: number
│   │   │   ├── tags: array<string>
│   │   │   └── domain: string
│   │   ├── timestamp: number (JavaScript timestamp)
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   └── deletedAt: timestamp | null (soft delete)
│   │
│   ├── /daily/{date}  ← 서브컬렉션 (사용량 추적)
│   │   ├── userId: string
│   │   ├── date: string (YYYY-MM-DD)
│   │   ├── count: number (요약 횟수)
│   │   ├── questionCount: number (질문 횟수)
│   │   ├── isPremium: boolean
│   │   ├── summaries: array<object>  ← 요약 상세 정보
│   │   │   ├── title: string
│   │   │   ├── url: string
│   │   │   ├── summary: string
│   │   │   ├── model: string
│   │   │   ├── language: string
│   │   │   ├── wordCount: number
│   │   │   ├── historyId: string | null
│   │   │   └── timestamp: timestamp
│   │   └── createdAt: timestamp
│   │
│   └── /tokens/{tokenId}  ← 서브컬렉션 (비밀번호 재설정, 이메일 인증)
│       ├── id: string
│       ├── userId: string
│       ├── token: string (해시된 토큰)
│       ├── type: 'password-reset' | 'email-verification'
│       ├── used: boolean
│       ├── expiresAt: timestamp
│       ├── createdAt: timestamp
│       └── usedAt: timestamp | null
│
├── subscriptions/{userId}
│   ├── userId: string
│   ├── plan: 'free' | 'pro' | 'team' | 'enterprise'
│   ├── status: 'active' | 'canceled' | 'past_due'
│   ├── stripeSubscriptionId: string | null
│   ├── currentPeriodStart: timestamp
│   ├── currentPeriodEnd: timestamp
│   ├── limits: object
│   │   ├── dailySummaries: number | Infinity
│   │   ├── dailyQuestions: number | Infinity
│   │   └── historyStorage: number
│   ├── usage: object
│   │   ├── summariesUsed: number
│   │   ├── questionsUsed: number
│   │   └── lastResetAt: timestamp
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
└── usageHistory/{usageId}
    ├── userId: string
    ├── type: 'summary' | 'question' | 'api' | 'pdf'
    ├── date: string (YYYY-MM-DD)
    ├── metadata: object
    │   ├── title: string
    │   ├── url: string
    │   ├── model: string
    │   ├── tokensUsed: number
    │   └── ...
    └── createdAt: timestamp
```

## 📁 프로젝트 구조

```
summarygenie/
├── docker-compose.yml          # Docker Compose 설정 (루트)
├── package-lock.json           # NPM 패키지 잠금 파일 (루트)
├── readme.md                   # 프로젝트 README (이 파일)
├── SECURITY.md                 # 보안 가이드
│
├── extension/                  # Chrome Extension
│   ├── manifest.json          # Extension 매니페스트 (v3, v2.3.1)
│   ├── config.js              # 중앙 설정 파일
│   ├── package-lock.json      # Extension NPM 패키지 잠금 파일
│   │
│   ├── auth.html              # 인증 페이지
│   ├── auth.css               # 인증 페이지 스타일
│   ├── auth.js                # 인증 로직
│   │
│   ├── firebase-app.js        # Firebase App SDK (v10.8.0)
│   ├── firebase-auth.js       # Firebase Auth SDK (v10.8.0)
│   │
│   ├── sidepanel.html         # Side Panel HTML (v7.0) ✨
│   ├── sidepanel.css          # 채팅 스타일 Q&A UI (v6.0) ✨
│   ├── sidepanel.js           # Side Panel 로직 (v7.0.0, Keep-Alive) ✨
│   │
│   ├── options.html           # 설정 페이지 HTML
│   ├── options.css            # 프리미엄 잠금 오버레이 (v2.3.0) ✨
│   ├── options.js             # 설정 페이지 로직 (v2.3.0) ✨
│   │
│   ├── popup.html             # Popup HTML (레거시)
│   ├── popup.css              # Popup 스타일
│   ├── popup.js               # Popup 로직
│   │
│   ├── background.js          # Background Service Worker (v5.0.0)
│   ├── content.js             # Content Script (v5.1.0)
│   ├── content-styles.css     # Content Script 스타일
│   ├── error-styles.css       # 에러 스타일
│   │
│   ├── pdf-extractor.js       # PDF 추출 로직 (v2.0.0, ES Module) ✨
│   ├── pdf-offscreen.html     # Offscreen HTML (ES Module) ✨
│   ├── pdf-offscreen-main.js  # Offscreen 메인 (v2.1.0, ping 처리) ✨
│   │
│   ├── _locales/              # 다국어 리소스
│   │   ├── ko/messages.json   # 한국어
│   │   ├── en/messages.json   # 영어
│   │   ├── ja/messages.json   # 일본어
│   │   └── zh/messages.json   # 중국어
│   │
│   ├── dashboard/             # 에러 대시보드
│   │   └── error-dashboard.html
│   │
│   ├── icons/                 # 아이콘 파일들
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   ├── icon128.png
│   │   └── logo.png
│   │
│   ├── lib/                   # 라이브러리
│   │   ├── pdf.mjs            # PDF.js (ES Module) ✨
│   │   ├── pdf.mjs.map        # PDF.js Source Map
│   │   ├── pdf.worker.mjs     # PDF.js Worker ✨
│   │   ├── pdf.worker.mjs.map # Worker Source Map
│   │   ├── pdf.sandbox.mjs    # PDF.js Sandbox ✨
│   │   ├── pdf.sandbox.mjs.map # Sandbox Source Map
│   │   └── cmaps/             # PDF.js 문자 맵 (CJK 지원)
│   │       ├── 78-EUC-H.bcmap
│   │       ├── Adobe-CNS1-*.bcmap
│   │       ├── Adobe-GB1-*.bcmap
│   │       ├── Adobe-Japan1-*.bcmap
│   │       ├── Adobe-Korea1-*.bcmap
│   │       ├── UniCNS-*.bcmap
│   │       ├── UniGB-*.bcmap
│   │       ├── UniJIS-*.bcmap
│   │       ├── UniKS-*.bcmap
│   │       └── ... (총 200+ cmap 파일)
│   │
│   └── modules/               # 핵심 모듈
│       ├── api-client.js      # API 클라이언트 (레거시)
│       ├── api-service.js     # API 호출 (v6.2.0)
│       ├── auth-manager.js    # 인증 관리 (v4.0.0)
│       ├── error-handler.js   # 에러 핸들러
│       ├── history-manager.js # 히스토리 관리
│       ├── i18n-manager.js    # 국제화 관리 (신규) ✨
│       ├── language-manager.js # 다국어 관리 (v6.0.0)
│       ├── qa-manager.js      # Q&A 관리 ✨
│       ├── security.js        # 보안 유틸리티
│       ├── settings-manager.js # 설정 관리
│       ├── storage-manager.js # 스토리지 관리
│       ├── sync-manager.js    # 동기화 관리
│       ├── token-manager.js   # 토큰 관리
│       ├── ui-components.js   # UI 컴포넌트
│       ├── ui-manager.js      # UI 관리
│       ├── usage-manager.js   # 사용량 관리
│       └── utils.js           # 유틸리티
│
└── server/                    # Node.js Proxy Server
    ├── .gitignore            # Git 제외 파일 목록 (보안 중요!)
    ├── .dockerignore         # Docker 제외 파일 목록
    ├── .gcloudignore         # Google Cloud 제외 파일 목록
    ├── .firebaserc           # Firebase 프로젝트 설정
    ├── Dockerfile            # Docker 이미지 빌드 설정
    ├── docker-compose.yml    # Docker Compose 설정 (서버용)
    ├── package.json          # 서버 의존성
    ├── package-lock.json     # 서버 패키지 잠금 파일
    ├── .env                  # 환경 변수 (보안!) ⚠️ Git 제외 필수
    ├── serviceAccountKey.json # Firebase 서비스 계정 키 (보안!) ⚠️ Git 제외 필수
    ├── user-db.js            # 사용자 데이터베이스 (개발용)
    │
    ├── firebase.json         # Firebase 설정
    ├── firestore.rules       # Firestore 보안 규칙
    ├── firestore.indexes.json # Firestore 인덱스
    │
    ├── scripts/              # 유틸리티 스크립트
    │   └── firebase-init.js  # Firebase 초기화 스크립트
    │
    └── src/
        ├── server.js         # 메인 서버 파일 (Cloud Run 최적화)
        ├── app.js            # Express 앱 설정
        │
        ├── config/
        │   └── firebase.js   # Firebase Admin 초기화
        │
        ├── constants/
        │   └── index.js      # 전역 상수 정의
        │
        ├── routes/
        │   ├── index.js      # 메인 라우터
        │   └── api/
        │       ├── auth.js   # 인증 API (v3.0.0)
        │       ├── chat.js   # 채팅/요약 API
        │       ├── usage.js  # 사용량 조회 API
        │       └── history.js # 히스토리 관리 API
        │
        ├── middleware/
        │   ├── auth.js       # JWT 인증 미들웨어 (v3.0.0)
        │   ├── errorHandler.js # 에러 핸들러 (v2.0.0)
        │   ├── rateLimiter.js # Rate Limiting (v1.0.0)
        │   └── validator.js  # 입력 검증 (v2.2.0)
        │
        ├── services/
        │   ├── AuthService.js     # Firebase Auth 서비스 (v3.0.0)
        │   ├── EmailService.js    # 이메일 발송 서비스
        │   ├── TokenService.js    # 토큰 관리 서비스
        │   ├── UsageService.js    # 사용량 추적 (v2.1.0)
        │   └── HistoryService.js  # 히스토리 관리
        │
        ├── tests/            # 테스트 파일
        │   └── password.test.js # 비밀번호 유틸리티 테스트
        │
        └── utils/            # 유틸리티
            ├── jwt.js        # JWT 토큰 유틸리티
            ├── password.js   # 비밀번호 해싱 유틸리티
            ├── password-README.md # 비밀번호 유틸리티 가이드
            └── tokenUtils.js # 토큰 생성 유틸리티

⚠️ 주의사항:
- .env, serviceAccountKey.json은 절대 Git에 커밋하지 마세요!
- 모든 보안 관련 파일은 .gitignore에 포함되어 있는지 확인하세요.
- 문서 파일들은 루트의 SECURITY.md와 프로젝트 문서를 참조하세요.
```

## 📦 설치 및 실행

### 사전 요구사항

- Node.js 18+ 
- Chrome Browser (114+)
- Firebase 프로젝트 (무료 Spark 플랜 가능)
- OpenAI API Key
- Gmail 계정 또는 SendGrid 계정 (이메일 발송용)
- (선택) Docker & Docker Compose (컨테이너 배포용)
- (선택) Stripe 계정 (결제 기능 필요 시)

### 1. 저장소 클론

```bash
git clone https://github.com/yourusername/summarygenie.git
cd summarygenie
```

### 2. Firebase 프로젝트 설정

#### 2.1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: summarygenie)
4. Google Analytics 설정 (선택사항)

#### 2.2. Firebase Authentication 활성화

1. Firebase Console → Authentication
2. "시작하기" 클릭
3. Sign-in method → Email/Password 활성화
4. (선택) Google OAuth 활성화
5. (선택) 이메일 확인 필요 설정

#### 2.3. Firestore 데이터베이스 생성

1. Firebase Console → Firestore Database
2. "데이터베이스 만들기" 클릭
3. 위치 선택: `asia-northeast3` (서울)
4. 보안 규칙: 프로덕션 모드로 시작 (나중에 수정)

#### 2.4. Firebase 서비스 계정 키 다운로드

```bash
# Firebase Console에서:
# 1. 프로젝트 설정 → 서비스 계정
# 2. "새 비공개 키 생성" 클릭
# 3. 다운로드한 JSON 파일을 server/serviceAccountKey.json으로 저장
```

⚠️ **중요**: `serviceAccountKey.json`은 절대 Git에 커밋하지 마세요!

```bash
# .gitignore에 추가 확인
echo "server/serviceAccountKey.json" >> server/.gitignore
```

### 3. 서버 설정

#### 3.1. 의존성 설치

```bash
cd server
npm install
```

#### 3.2. 환경 변수 설정

`.env` 파일 생성:

```env
# ===== Node.js =====
NODE_ENV=development
PORT=3000

# ===== OpenAI =====
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# ===== Firebase =====
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
# 서비스 계정 키 파일 경로 (선택사항)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# ===== JWT (Firebase ID Token 검증에 사용) =====
JWT_SECRET=your_jwt_secret_min_32_characters_long_please_change_this

# ===== Email (이메일 발송) =====
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="SummaryGenie <noreply@summarygenie.com>"
# SendGrid 사용 시
# EMAIL_SERVICE=sendgrid
# SENDGRID_API_KEY=SG.your_sendgrid_api_key

# ===== Frontend URL (이메일 링크용) =====
FRONTEND_URL=http://localhost:5500

# ===== Stripe (선택사항) =====
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_PRO=price_your_pro_plan_price_id

# ===== 확장프로그램 =====
ALLOWED_EXTENSION_IDS=your_chrome_extension_id_here

# ===== 사용량 제한 =====
FREE_USER_DAILY_LIMIT=3
DATA_RETENTION_DAYS=30

# ===== Rate Limiting =====
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
RATE_LIMIT_MAX_REQUESTS_PREMIUM=100

# ===== Circuit Breaker =====
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# ===== Fallback Model =====
FALLBACK_MODEL=gpt-4o-mini
```

#### 3.3. Firestore 보안 규칙 배포

```bash
# Firebase CLI 설치 (없는 경우)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 초기화 (이미 완료된 경우 스킵)
firebase init firestore

# 보안 규칙 및 인덱스 배포
firebase deploy --only firestore:rules,firestore:indexes
```

#### 3.4. 서버 실행

```bash
# 개발 모드 (nodemon)
npm run dev

# 프로덕션 모드
npm start

# 헬스체크
curl http://localhost:3000/health
```

### 4. Chrome Extension 설정

#### 4.1. Extension 설정 파일 수정

`extension/config.js` 파일에서 Firebase 설정:

```javascript
// Firebase 설정 (Firebase Console에서 확인)
CONFIG.FIREBASE = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// API 엔드포인트 설정
CONFIG.API_ENDPOINTS.DEV = "http://localhost:3000";
CONFIG.API_ENDPOINTS.PROD = "https://your-server-url.run.app";
```

#### 4.2. Chrome Extension 로드

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. "개발자 모드" 활성화 (우측 상단)
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension` 폴더 선택
5. Extension ID 복사 → `.env` 파일의 `ALLOWED_EXTENSION_IDS`에 추가

### 5. 테스트

#### 5.1. 서버 헬스체크

```bash
curl http://localhost:3000/health

# 응답 예시
{
  "status": "healthy",
  "timestamp": "2025-01-10T10:00:00.000Z",
  "environment": "development",
  "uptime": 120,
  "services": {
    "usageService": { "available": true, "mode": "Firestore" },
    "historyService": { "available": true, "mode": "Firestore" },
    "authService": { "available": true, "mode": "Firebase Auth" },
    "emailService": { "available": true, "type": "gmail" },
    "tokenService": { "available": true, "mode": "Firestore" }
  },
  "memory": {
    "used": 150000000,
    "total": 500000000,
    "percentage": 30
  }
}
```

#### 5.2. Extension 테스트

1. Chrome Extension 아이콘 클릭 → Side Panel 열림
2. "회원가입" 또는 "로그인"
3. 이메일 인증 링크 확인 (Gmail)
4. 웹페이지에서 요약 기능 테스트
5. PDF 파일 열고 요약 테스트 (진행 상황 UI 확인)
6. 서버 로그 확인

## 🌐 API 엔드포인트

### 시스템 엔드포인트

```
GET  /                  - API 정보 및 엔드포인트 목록
GET  /health            - 헬스체크 (서버 상태 및 의존성 확인)
```

### 인증 API (`/api/auth`)

```
POST   /api/auth/signup              - 회원가입 (Firebase Auth + 이메일 발송)
POST   /api/auth/login               - 로그인 (ID Token 검증)
POST   /api/auth/logout              - 로그아웃
GET    /api/auth/me                  - 현재 사용자 정보 조회
PUT    /api/auth/profile             - 프로필 업데이트
POST   /api/auth/change-password     - 비밀번호 변경
POST   /api/auth/forgot-password     - 비밀번호 재설정 요청 (이메일 발송)
POST   /api/auth/reset-password      - 비밀번호 재설정 완료
POST   /api/auth/verify-email        - 이메일 인증 확인
POST   /api/auth/resend-verification - 인증 이메일 재발송
POST   /api/auth/google-signin       - Google OAuth 로그인
DELETE /api/auth/account             - 계정 삭제
```

### 채팅/요약 API (`/api/chat`)

```
POST /api/chat                  - 채팅/요약 요청 (OpenAI API)
GET  /api/chat/circuit-breaker  - Circuit Breaker 상태 조회
```

### 사용량 조회 API (`/api/usage`)

```
GET  /api/usage            - 현재 사용량 조회
POST /api/usage/increment  - 사용량 증가 (내부용)
GET  /api/usage/statistics - 사용량 통계 (기간별)
GET  /api/usage/check      - 사용 가능 여부 확인
GET  /api/usage/reset-info - 리셋 시간 정보
```

### 히스토리 관리 API (`/api/history`)

```
GET    /api/history/statistics     - 히스토리 통계
GET    /api/history                - 히스토리 목록 조회 (페이지네이션, 검색)
POST   /api/history                - 히스토리 저장
GET    /api/history/:historyId     - 단일 히스토리 조회
POST   /api/history/:historyId/qa  - Q&A 추가
DELETE /api/history/:historyId     - 히스토리 삭제 (soft/hard)
```

## 🚀 배포

### Docker Compose 배포 (권장 - 로컬/개발)

#### 1. Docker Compose 설정 확인

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    container_name: summarygenie-server
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
```

#### 2. 환경 변수 설정

```bash
cp .env.example .env
nano .env  # 필수 환경변수 설정
```

#### 3. Docker Compose 실행

```bash
# 서비스 빌드 및 시작
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 헬스체크
curl http://localhost:3000/health

# 서비스 중지
docker-compose down
```

### Cloud Run 배포 (프로덕션)

#### 1. Docker 이미지 빌드

```bash
cd server

# 이미지 빌드
docker build -t gcr.io/your-project-id/summarygenie-server:v2.7.0 .

# Container Registry에 푸시
docker push gcr.io/your-project-id/summarygenie-server:v2.7.0
```

#### 2. Cloud Run 배포

```bash
gcloud run deploy summarygenie-server \
  --image gcr.io/your-project-id/summarygenie-server:v2.7.0 \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,FREE_USER_DAILY_LIMIT=3,PORT=3000" \
  --set-secrets "OPENAI_API_KEY=openai-api-key:latest,JWT_SECRET=jwt-secret:latest"
```

## 🔐 보안 및 인증

⚠️ **중요**: 상세한 보안 가이드는 `SECURITY.md` 파일을 참조하세요.

### 보안 체크리스트

#### 개발 단계
- [x] `.env` 파일이 `.gitignore`에 포함됨
- [x] `.env.example` 파일에 실제 키가 없음
- [x] 모든 시크릿이 강력한 랜덤 값임
- [x] 코드에 하드코딩된 시크릿이 없음
- [x] `serviceAccountKey.json`이 Git에서 제외됨

#### 배포 단계
- [ ] 프로덕션 환경변수가 안전하게 설정됨
- [ ] HTTPS 사용 중
- [ ] Rate limiting 활성화
- [ ] 로깅에 민감 정보 제외
- [ ] 정기적인 키 로테이션 계획

### Firebase Authentication 흐름

1. **회원가입**: 
   - 클라이언트: Firebase SDK로 이메일/비밀번호 회원가입
   - 서버: Firestore에 사용자 프로필 생성
   - 이메일 인증 링크 발송 (EmailService)

2. **로그인**:
   - 클라이언트: Firebase SDK로 로그인 → ID Token 발급
   - 서버: ID Token 검증 (`admin.auth().verifyIdToken()`)
   - Firestore에서 추가 정보 조회

3. **API 호출**:
   - 클라이언트: `Authorization: Bearer <ID_TOKEN>` 헤더 추가
   - 서버: `authenticate` 미들웨어로 토큰 검증
   - `req.user`에 사용자 정보 저장

## ⚠️ 에러 처리

### 에러 응답 형식

```json
{
  "error": true,
  "message": "일일 무료 사용 한도를 초과했습니다",
  "code": "USAGE_LIMIT_EXCEEDED",
  "errorId": "ERR-1A2B3C4D-5E6F",
  "statusCode": 403,
  "timestamp": "2025-01-10T10:00:00.000Z"
}
```

### 주요 에러 코드

| 코드 | 설명 | HTTP 상태 |
|------|------|-----------|
| `AUTH_REQUIRED` | 인증이 필요합니다 | 401 |
| `TOKEN_EXPIRED` | 토큰이 만료되었습니다 | 401 |
| `PERMISSION_DENIED` | 권한이 없습니다 | 403 |
| `USAGE_LIMIT_EXCEEDED` | 사용 한도 초과 | 403 |
| `RATE_LIMIT_EXCEEDED` | 요청 속도 제한 초과 | 429 |
| `PDF_EXTRACTION_TIMEOUT` | PDF 추출 타임아웃 (180초) | 408 |
| `SERVICE_WORKER_UNAVAILABLE` | Service Worker 응답 없음 | 503 |

## 📊 모니터링

### 헬스체크

```bash
curl http://localhost:3000/health

# 응답
{
  "status": "healthy",
  "timestamp": "2025-01-10T10:00:00.000Z",
  "environment": "production",
  "uptime": 86400,
  "services": {
    "usageService": { "available": true, "mode": "Firestore" },
    "historyService": { "available": true, "mode": "Firestore" },
    "authService": { "available": true, "mode": "Firebase Auth" },
    "emailService": { "available": true, "type": "gmail" },
    "tokenService": { "available": true, "mode": "Firestore" }
  }
}
```

## 📈 로드맵

### Phase 1: MVP 안정화 (완료 ✅)
- [x] 기본 요약 기능
- [x] Q&A 기능
- [x] 로컬 히스토리
- [x] 다국어 지원 (4개 언어)
- [x] PDF 추출 기능 (ES Module, 180초 타임아웃)
- [x] Side Panel UI (v7.0.0)
- [x] Keep-Alive 구현 (v7.0.0)

### Phase 2: 서버 인프라 (완료 ✅)
- [x] Firebase Firestore 연동
- [x] Firebase Authentication
- [x] 클라우드 동기화
- [x] PDF 요약 (프리미엄 전용)
- [x] Circuit Breaker 구현
- [x] PDF 진행 상황 UI (v7.0.0)

### Phase 3: 사용자 시스템 (완료 ✅)
- [x] 인증 시스템 (Firebase Auth)
- [x] 사용자 대시보드
- [x] 무료 티어 (일 3회)
- [x] 이메일 발송 서비스
- [x] 비밀번호 재설정
- [x] 비밀번호 보안 강화
- [x] 프리미엄 기능 잠금 UI (v2.3.0)
- [ ] 추천 시스템

### Phase 4: 결제 시스템 (진행 중 🚧)
- [ ] Stripe 통합
- [ ] 가격 플랜 (Free, Pro, Team, Enterprise)
- [ ] 프리미엄 기능 잠금
- [ ] 구독 관리 대시보드

### Phase 5: 제품 고도화 (예정 📅)
- [ ] 고급 요약 옵션
- [ ] 성능 최적화 (캐싱, CDN)
- [ ] 분석 도구
- [ ] OCR 지원

### Phase 6: 출시 준비 (예정 📅)
- [ ] Chrome 웹스토어 등록
- [ ] 마케팅 준비
- [ ] 초기 사용자 피드백

## 🆕 최신 업데이트 (v2.7.0)

### Side Panel & PDF 처리 강화
- ✨ **Side Panel v7.0.0**: Keep-Alive 구현으로 PDF 처리 안정성 향상
- ✨ **PDF 진행 상황 UI**: 실시간 추출 진행률 표시 (0% → 100%)
- ✨ **PDF Offscreen v2.1.0**: ping 메시지 처리 추가
- ✨ **PDF Extractor v2.0.0**: ES Module 기반 동적 import
- ✨ **Service Worker Keep-Alive**: 15초 주기 ping으로 타임아웃 방지

### Options 페이지 개선
- ✨ **프리미엄 잠금 UI (v2.3.0)**: 히스토리 섹션 오버레이
- ✨ **구독 UI 동적 변경**: 프리미엄 상태에 따른 UI 업데이트
- ✨ **언어 변경 시 UI 업데이트**: 오버레이 텍스트 즉시 반영

### 사용자 경험 개선
- ✨ **콘텐츠 길이 기반 자동 최적화**: 요약 길이 자동 판단 (v6.0)
- ✨ **채팅 스타일 Q&A UI (v5.0)**: 말풍선 형태의 대화형 인터페이스
- ✨ **실시간 사용량 업데이트**: Storage 리스너 기반
- ✨ **프리미엄 기능 모달**: 한도 초과 시 업그레이드 안내

### 기술적 개선
- ✨ **타임아웃 통일**: PDF 추출 180초로 통일
- ✨ **에러 처리 강화**: Service Worker 응답 없음 감지
- ✨ **진행 상황 메시징**: pdfProgress 이벤트 시스템

## 🐛 알려진 이슈

### v2.7.0
- [ ] PDF 추출 타임아웃 시 Keep-Alive 정리 확인 필요
- [ ] Service Worker 응답 없음 시 재시도 로직 개선 필요
- [ ] PDF 진행 상황 UI 모바일 대응 필요

### v2.3.0
- [ ] SendGrid 이메일 전송 테스트 필요
- [ ] 이메일 템플릿 국제화
- [ ] PDF 특수 문자 처리 개선

## 🤝 기여

기여는 언제나 환영합니다! 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 코드 기여 가이드

- 모든 코드는 JSDoc 주석 포함
- Firestore 보안 규칙 준수
- 에러 핸들러 사용 필수
- 다국어 지원
- 비밀번호는 `password.js` 유틸리티 사용
- Rate Limiting 고려
- 테스트 코드 작성

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📧 연락처

- 프로젝트 링크: [https://github.com/sunes26/SummaryGenie](https://github.com/sunes26/SummaryGenie)

## 🙏 감사의 말

- **OpenAI** - GPT-4o-mini API
- **Google Firebase** - Firestore, Auth
- **Chrome Extensions** - 플랫폼
- **Mozilla PDF.js** - PDF 처리 (ES Module)
- **Material Design** - UI 디자인
- **Stripe** - 결제 인프라
- **Nodemailer** - 이메일 발송
- **bcryptjs** - 비밀번호 해싱
- **Express.js** - 백엔드 프레임워크

## 📚 추가 자료

- [보안 가이드](SECURITY.md)
- [기획서](__AI_웹페이지_요약봇_크롬_확장프로그램_기획서)
- [개발 로드맵](__SummaryGenie_개발_로드맵_ver_2.0)

---

**Made with ❤️ by SummaryGenie Team**

**Version**: 2.7.0 | **Last Updated**: 2025-11-11