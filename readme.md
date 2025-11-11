# SummaryGenie 🧞‍♂️

> AI 기반 웹페이지 요약 및 질문-답변 Chrome Extension

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/yourusername/summarygenie)
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
- [라이선스](#-라이선스)

## 🎯 프로젝트 소개

**SummaryGenie**는 OpenAI GPT-4o-mini를 활용하여 웹페이지를 즉시 요약하고, 내용에 대해 질문할 수 있는 올인원 Chrome Extension입니다. 정보 과부하 시대에 효율적인 콘텐츠 소비를 돕습니다.

### 핵심 가치

- ⚡ **빠른 요약**: 긴 글, 뉴스, 논문을 3-5줄로 즉시 요약
- 📄 **PDF 지원**: PDF 파일 텍스트 자동 추출 및 요약 (180초 타임아웃, 프리미엄 전용)
- 💬 **대화형 Q&A**: 요약 후 추가 질문으로 깊이 있는 이해
- 🌏 **다국어 지원**: 한국어, 영어, 일본어, 중국어 완벽 지원
- 🔐 **Firebase 인증**: 영구 로그인 및 자동 토큰 갱신
- ☁️ **클라우드 동기화**: 여러 기기에서 히스토리 공유 (Firestore)
- 🎨 **깔끔한 UI**: Material Design 기반의 직관적 인터페이스
- ✨ **실시간 진행 상황**: PDF 추출 단계별 시각적 피드백
- 🛡️ **Circuit Breaker**: OpenAI API 장애 시 자동 복구
- 📧 **이메일 통합**: 회원가입, 비밀번호 재설정 이메일 자동 발송

### 타겟 사용자

- 정보 수집이 많은 직장인 (마케터, 연구원, 기자)
- 학생 및 연구자
- 영어 콘텐츠를 소비하는 한국인
- 기업의 리서치팀, 컨설팅팀

## ✨ 주요 기능

### 무료 버전
- ✅ 하루 3회 웹페이지 요약
- ✅ 요약 길이 자동 최적화 (콘텐츠 길이 기반)
- ✅ 기본 질문 기능 (3회/일)
- ✅ 로컬 히스토리 저장
- ✅ 4개 언어 지원 (한국어, 영어, 일본어, 중국어)
- ✅ Rate Limiting (분당 30회)

### 프리미엄 버전
- 🌟 무제한 요약 및 질문
- 🌟 **PDF 파일 요약 지원** (180초 타임아웃, 실시간 진행 표시)
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
- **PDF 처리**: PDF.js (ES Module, .mjs)

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
│  │   Popup    │  │  Content   │  │ Background │       │
│  │   (UI)     │  │  Script    │  │  Service   │       │
│  │  v3.8.0    │  │  v5.1.0    │  │  v5.0.0    │       │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘       │
│        │               │               │               │
│        │         ┌─────┴─────┐         │               │
│        │         │ PDF       │         │               │
│        │         │ Offscreen │         │               │
│        │         │ v2.1.0    │         │               │
│        │         └───────────┘         │               │
└────────┼───────────────┼───────────────┼──────────────┘
         │               │               │
         │        ┌──────┴───────┐       │
         │        │ Keep-Alive   │       │
         │        │  (15초 주기)  │       │
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

### Firestore 복합 인덱스

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "history",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "deletedAt", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "daily",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "tokens",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "token", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "used", "order": "ASCENDING" }
      ]
    }
  ]
}
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

`firestore.rules` 파일 예시:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 문서
    match /users/{userId} {
      // 본인만 읽기/쓰기 가능
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // 히스토리 서브컬렉션
      match /history/{historyId} {
        allow read: if request.auth != null && 
                      request.auth.uid == userId && 
                      request.auth.token.email_verified == true;
        allow create: if request.auth != null && 
                        request.auth.uid == userId &&
                        request.auth.token.email_verified == true;
        allow update, delete: if request.auth != null && 
                                 request.auth.uid == userId;
      }
      
      // 일일 사용량 서브컬렉션
      match /daily/{date} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false; // 서버에서만 쓰기
      }
      
      // 토큰 서브컬렉션 (서버에서만 접근)
      match /tokens/{tokenId} {
        allow read, write: if false; // Admin SDK에서만
      }
    }
    
    // 구독 정보 (읽기만 허용, 쓰기는 서버에서만)
    match /subscriptions/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Admin SDK에서만
    }
    
    // 사용량 히스토리 (서버에서만)
    match /usageHistory/{usageId} {
      allow read: if false;
      allow write: if false; // Admin SDK에서만
    }
  }
}
```

#### 3.4. Gmail 앱 비밀번호 생성 (이메일 발송용)

1. Google 계정 → 보안 설정
2. "앱 비밀번호" 생성 (2단계 인증 필요)
3. `.env` 파일의 `EMAIL_PASSWORD`에 입력

#### 3.5. 서버 실행

```bash
# 개발 모드 (nodemon)
npm run dev

# 프로덕션 모드
npm start

# 헬스체크
curl http://localhost:3000/health
```

서버가 `http://localhost:3000`에서 실행됩니다.

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

Firebase 설정 값은 Firebase Console → 프로젝트 설정 → 일반에서 확인할 수 있습니다.

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

#### 5.2. 이메일 발송 테스트

```bash
# 이메일 서비스 연결 테스트
node -e "
const emailService = require('./src/services/EmailService');
emailService.testConnection().then(result => {
  console.log('이메일 테스트:', result ? '성공' : '실패');
});
"
```

#### 5.3. API 테스트

```bash
# 회원가입
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "confirmPassword": "Test1234!",
    "name": "Test User"
  }'

# 비밀번호 재설정 요청
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

#### 5.4. Extension 테스트

1. Chrome Extension 아이콘 클릭
2. "회원가입" 또는 "로그인"
3. 이메일 인증 링크 확인 (Gmail)
4. 웹페이지에서 요약 기능 테스트
5. 서버 로그 확인

```bash
# 서버 로그에서 확인할 것
[Auth Signup] 회원가입 시도: test@example.com
✅ Firebase Auth 사용자 생성: abc123uid
✅ Firestore 프로필 생성: abc123uid
✅ 이메일 발송 성공: test@example.com - 이메일 인증을 완료해주세요
✅ [Auth Signup] 회원가입 성공: test@example.com (UID: abc123uid)
```

## 📁 프로젝트 구조

```
summarygenie/
├── extension/                   # Chrome Extension
│   ├── manifest.json           # Extension 매니페스트 (v3)
│   ├── config.js               # 중앙 설정 파일
│   ├── auth.html               # 인증 페이지
│   ├── auth.js                 # 인증 로직
│   ├── firebase-app.js         # Firebase App SDK (v10.8.0)
│   ├── firebase-auth.js        # Firebase Auth SDK (v10.8.0)
│   ├── popup/                  # 팝업 UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── sidepanel/              # Side Panel UI
│   ├── background/             # Background Service Worker
│   │   └── background.js
│   ├── content/                # Content Scripts
│   │   └── content.js
│   ├── modules/                # 핵심 모듈
│   │   ├── api-service.js     # API 호출 (v6.2.0)
│   │   ├── auth-manager.js    # 인증 관리 (v4.0.0)
│   │   ├── i18n-manager.js    # 다국어 (v6.0.0)
│   │   └── ...
│   ├── _locales/               # 다국어 리소스
│   │   ├── ko/
│   │   ├── en/
│   │   ├── ja/
│   │   └── zh/
│   └── lib/                    # 라이브러리
│       └── pdf.mjs             # PDF.js
│
├── server/                     # Node.js Proxy Server
│   ├── .gitignore             # Git 제외 파일 목록 (보안 중요!) 🆕
│   ├── docker-compose.yml     # Docker Compose 설정 🆕
│   ├── Dockerfile             # Docker 이미지 빌드 설정 🆕
│   ├── .dockerignore          # Docker 제외 파일 목록 🆕
│   ├── src/
│   │   ├── server.js          # 메인 서버 파일 (Cloud Run 최적화)
│   │   ├── app.js             # Express 앱 설정
│   │   ├── config/
│   │   │   └── firebase.js    # Firebase Admin 초기화
│   │   ├── constants/
│   │   │   └── index.js       # 전역 상수 정의
│   │   ├── routes/
│   │   │   ├── index.js       # 메인 라우터
│   │   │   └── api/
│   │   │       ├── auth.js    # 인증 API (v3.0.0)
│   │   │       ├── chat.js    # 채팅/요약 API
│   │   │       ├── usage.js   # 사용량 조회 API
│   │   │       └── history.js # 히스토리 관리 API
│   │   ├── controllers/       # 비즈니스 로직
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT 인증 미들웨어 (v3.0.0)
│   │   │   ├── errorHandler.js # 에러 핸들러 (v2.0.0)
│   │   │   ├── rateLimiter.js  # Rate Limiting (v1.0.0)
│   │   │   └── validator.js    # 입력 검증 (v2.2.0)
│   │   ├── services/
│   │   │   ├── AuthService.js      # Firebase Auth 서비스 (v3.0.0)
│   │   │   ├── EmailService.js     # 이메일 발송 서비스 🆕
│   │   │   ├── TokenService.js     # 토큰 관리 서비스 🆕
│   │   │   ├── UsageService.js     # 사용량 추적 (v2.1.0)
│   │   │   └── HistoryService.js   # 히스토리 관리
│   │   ├── utils/             # 유틸리티
│   │   │   ├── jwt.js         # JWT 토큰 유틸리티 🆕
│   │   │   ├── password.js    # 비밀번호 해싱 유틸리티 🆕
│   │   │   └── tokenUtils.js  # 토큰 생성 유틸리티 🆕
│   │   └── tests/             # 테스트 코드
│   │       └── password.test.js # 비밀번호 테스트 🆕
│   ├── scripts/
│   │   └── firebase-init.js   # Firebase 초기화 스크립트
│   ├── serviceAccountKey.json # Firebase 서비스 계정 키 (보안!)
│   ├── package.json
│   ├── firebase.json          # Firebase 설정
│   ├── firestore.rules        # Firestore 보안 규칙
│   ├── firestore.indexes.json # Firestore 인덱스
│   └── .env                   # 환경 변수 (보안!)
│
└── docs/                       # 문서
    ├── 기획서.md
    ├── 로드맵.md
    ├── firebase-setup.md
    ├── password-README.md     # 비밀번호 유틸리티 문서 🆕
    ├── SECURITY.md            # 보안 가이드 🆕
    └── api.md
```

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
POST   /api/auth/forgot-password     - 비밀번호 재설정 요청 (이메일 발송) 🆕
POST   /api/auth/reset-password      - 비밀번호 재설정 완료 🆕
POST   /api/auth/verify-email        - 이메일 인증 확인
POST   /api/auth/resend-verification - 인증 이메일 재발송
POST   /api/auth/google-signin       - Google OAuth 로그인
DELETE /api/auth/account             - 계정 삭제
```

**비밀번호 재설정 플로우 예시:**

```bash
# 1. 비밀번호 재설정 요청
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'

# 응답:
{
  "success": true,
  "message": "비밀번호 재설정 링크를 이메일로 전송했습니다"
}

# 2. 이메일에서 받은 토큰으로 비밀번호 재설정
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123token456",
    "newPassword": "NewP@ss123",
    "confirmPassword": "NewP@ss123"
  }'

# 응답:
{
  "success": true,
  "message": "비밀번호가 성공적으로 변경되었습니다"
}
```

### 채팅/요약 API (`/api/chat`)

```
POST /api/chat                  - 채팅/요약 요청 (OpenAI API)
GET  /api/chat/circuit-breaker  - Circuit Breaker 상태 조회
```

**요청 예시:**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "이 기사를 요약해주세요: [기사 내용...]"
      }
    ],
    "title": "뉴스 기사 제목",
    "url": "https://example.com/article",
    "language": "ko",
    "saveHistory": true,
    "isPDF": false
  }'
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

## 🔧 핵심 모듈 및 서비스

### 1. AuthService (`src/services/AuthService.js`) 🆕

Firebase Authentication 기반 인증 서비스

```javascript
const authService = require('./services/AuthService');

// 회원가입 (Firebase Auth + 이메일 발송)
const result = await authService.signup(
  'user@example.com',
  'SecureP@ss123',
  'John Doe'
);

// Firebase ID Token 검증
const decodedToken = await authService.verifyIdToken(idToken);

// 사용자 조회
const user = await authService.getUserById('user123');

// 프로필 업데이트
const updatedUser = await authService.updateProfile('user123', {
  name: 'Jane Doe',
  isPremium: true
});
```

### 2. EmailService (`src/services/EmailService.js`) 🆕

Nodemailer 기반 이메일 발송 서비스

```javascript
const emailService = require('./services/EmailService');

// 회원가입 환영 이메일
await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

// 이메일 인증 링크 발송
await emailService.sendVerificationEmail(
  'user@example.com',
  'John Doe',
  'abc123token'
);

// 비밀번호 재설정 링크 발송
await emailService.sendPasswordResetEmail(
  'user@example.com',
  'John Doe',
  'xyz789token'
);
```

### 3. TokenService (`src/services/TokenService.js`) 🆕

Firestore 기반 토큰 관리 서비스

```javascript
const { tokenService, TOKEN_TYPES } = require('./services/TokenService');

// 토큰 저장
const tokenId = await tokenService.saveToken(
  'user123',
  'hashed_token_abc123',
  TOKEN_TYPES.PASSWORD_RESET,
  15 * 60 * 1000  // 15분
);

// 토큰 검증
const token = await tokenService.verifyAndGetToken(
  'user123',
  'hashed_token_abc123',
  TOKEN_TYPES.PASSWORD_RESET
);
```

### 4. Password Utility (`src/utils/password.js`) 🆕

bcrypt 기반 비밀번호 해싱 및 검증

```javascript
const {
  hashPassword,
  comparePassword,
  validatePasswordStrength
} = require('./utils/password');

// 비밀번호 해싱
const hashedPassword = await hashPassword('MySecureP@ss123');

// 비밀번호 비교
const isMatch = await comparePassword('MySecureP@ss123', hashedPassword);

// 비밀번호 강도 검증
const result = validatePasswordStrength('MyP@ss123');
```

## 👨‍💻 개발 가이드

### 코드 스타일

- **변수명**: camelCase (`userId`, `isPremium`)
- **상수명**: UPPER_SNAKE_CASE (`FREE_USER_DAILY_LIMIT`)
- **클래스명**: PascalCase (`CircuitBreaker`, `UsageService`)
- **파일명**: kebab-case (`auth-service.js`) 또는 PascalCase (`AuthService.js`)

### Firestore 데이터 작업

#### 데이터 생성

```javascript
const db = getFirestore();

// 단일 문서 생성
await db.collection('users').doc(userId).set({
  email: 'user@example.com',
  name: 'John Doe',
  isPremium: false,
  createdAt: admin.firestore.FieldValue.serverTimestamp()
});

// 배치 작업 (원자성 보장)
const batch = db.batch();
const userRef = db.collection('users').doc(userId);
batch.set(userRef, userData);
await batch.commit();
```

#### 트랜잭션

```javascript
await db.runTransaction(async (transaction) => {
  const subscriptionRef = db.collection('subscriptions').doc(userId);
  const subscriptionDoc = await transaction.get(subscriptionRef);
  
  const newCount = subscriptionDoc.data().usage.summaries + 1;
  
  transaction.update(subscriptionRef, {
    'usage.summaries': newCount,
    'updatedAt': admin.firestore.FieldValue.serverTimestamp()
  });
});
```

## 🚀 배포

### Docker Compose 배포 (권장 - 로컬/개발) 🆕

#### 1. Docker Compose 설정 확인

프로젝트에 포함된 `docker-compose.yml` 파일을 사용합니다:

```yaml
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

`.env` 파일이 준비되었는지 확인:

```bash
# .env.example을 복사
cp .env.example .env

# 필수 환경변수 설정
nano .env  # 또는 원하는 편집기 사용
```

#### 3. Docker Compose 실행

```bash
# 서비스 빌드 및 시작 (백그라운드)
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 환경변수 확인
docker-compose exec app env | grep FREE_USER_DAILY_LIMIT

# 헬스체크 확인
curl http://localhost:3000/health

# 서비스 중지
docker-compose down

# 볼륨까지 모두 제거
docker-compose down -v
```

#### 4. 트러블슈팅

```bash
# 컨테이너 내부 접속
docker-compose exec app sh

# 로그 파일 확인
docker-compose exec app tail -f /app/logs/combined.log

# 서비스 재시작
docker-compose restart

# 특정 서비스만 재빌드
docker-compose up -d --build app
```

### Cloud Run 배포 (프로덕션)

#### 1. Google Cloud 프로젝트 설정

```bash
# Google Cloud SDK 설치
# https://cloud.google.com/sdk/docs/install

# 프로젝트 설정
gcloud config set project your-project-id
gcloud config set run/region asia-northeast3
```

#### 2. Docker 이미지 빌드

```bash
cd server

# 이미지 빌드
docker build -t gcr.io/your-project-id/summarygenie-server:v2.5.0 .

# Container Registry에 푸시
docker push gcr.io/your-project-id/summarygenie-server:v2.5.0
```

#### 3. Cloud Run 배포

```bash
gcloud run deploy summarygenie-server \
  --image gcr.io/your-project-id/summarygenie-server:v2.5.0 \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,FREE_USER_DAILY_LIMIT=3,PORT=3000" \
  --set-secrets "OPENAI_API_KEY=openai-api-key:latest,JWT_SECRET=jwt-secret:latest,EMAIL_PASSWORD=email-password:latest"
```

#### 4. Secret Manager 설정

```bash
# 시크릿 생성
echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-gmail-app-password" | gcloud secrets create email-password --data-file=-

# Cloud Run 서비스에 권한 부여
PROJECT_NUMBER=$(gcloud projects describe your-project-id --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Vercel 배포 (대안)

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 배포
cd server
vercel

# 환경 변수 설정
vercel env add OPENAI_API_KEY
vercel env add JWT_SECRET
vercel env add FIREBASE_PROJECT_ID
# ... 기타 환경 변수

# 프로덕션 배포
vercel --prod
```

## 🔐 보안 및 인증

⚠️ **중요**: 상세한 보안 가이드는 [`SECURITY.md`](docs/SECURITY.md) 파일을 참조하세요.

### 보안 체크리스트

#### 개발 단계
- [x] `.env` 파일이 `.gitignore`에 포함됨
- [x] `.env.example` 파일에 실제 키가 없음
- [x] 모든 시크릿이 강력한 랜덤 값임
- [x] 코드에 하드코딩된 시크릿이 없음
- [x] Git 히스토리에 시크릿이 없음
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

### 비밀번호 보안

#### bcrypt 설정

```javascript
// constants/index.js
PASSWORD: {
  SALT_ROUNDS: 10,        // Salt rounds (기본값)
  MIN_LENGTH: 8,          // 최소 길이
  MAX_LENGTH: 128,        // 최대 길이
  HASH_COST: 10           // bcrypt 비용 (= SALT_ROUNDS)
}
```

#### 비밀번호 정책

**필수 요구사항:**
- ✅ 최소 8자 이상
- ✅ 대문자 포함
- ✅ 소문자 포함
- ✅ 숫자 포함

**권장사항:**
- 💡 특수문자 포함
- 💡 12자 이상

### .gitignore 설정 🆕

프로젝트의 `.gitignore` 파일에는 다음 항목들이 포함되어 있습니다:

```gitignore
# 환경변수 및 민감 정보
.env
.env.local
.env.*.local
serviceAccountKey.json
*-serviceAccountKey.json
firebase-adminsdk-*.json

# Node.js
node_modules/
npm-debug.log*

# 로그 파일
*.log
logs/

# 운영체제
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

⚠️ **민감 정보가 Git에 커밋되지 않도록 주의하세요!**

### 환경 변수 보안

```bash
# 강력한 랜덤 키 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 환경 변수 권한 설정 (Unix/Linux/Mac)
chmod 600 .env
```

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
| `PASSWORD_TOO_SHORT` | 비밀번호가 너무 짧습니다 | 400 |

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
- [x] PDF 추출 기능

### Phase 2: 서버 인프라 (완료 ✅)
- [x] Firebase Firestore 연동
- [x] Firebase Authentication
- [x] 클라우드 동기화
- [x] PDF 요약 (프리미엄 전용)
- [x] Circuit Breaker 구현

### Phase 3: 사용자 시스템 (완료 ✅)
- [x] 인증 시스템 (Firebase Auth)
- [x] 사용자 대시보드
- [x] 무료 티어 (일 3회)
- [x] 이메일 발송 서비스 🆕
- [x] 비밀번호 재설정 🆕
- [x] 비밀번호 보안 강화 🆕
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

## 🆕 최신 업데이트 (v2.5.0)

### Firebase & 보안 강화
- ✨ **AuthService**: Firebase Auth 완전 전환
- ✨ **EmailService**: Nodemailer 기반 이메일 발송
- ✨ **TokenService**: Firestore 토큰 관리
- ✨ **Password Utility**: bcrypt 해싱 및 검증
- ✨ **JWT Utility**: 토큰 생성 및 검증

### 이메일 기능
- ✨ 회원가입 환영 이메일
- ✨ 이메일 인증 링크
- ✨ 비밀번호 재설정
- ✨ 보안 알림

### Docker & 배포
- ✨ **Docker Compose**: 로컬 개발 환경 구성 🆕
- ✨ **Dockerfile**: 프로덕션 최적화 🆕
- ✨ **Cloud Run**: GCP 배포 가이드
- ✨ **.gitignore**: 보안 파일 제외 설정 🆕

### 보안 강화
- ✨ **SECURITY.md**: 상세한 보안 가이드 추가 🆕
- ✨ **환경변수 관리**: Secret Manager 통합
- ✨ **비밀번호 정책**: 강도 검증 및 해싱

## 🐛 알려진 이슈

### v2.5.0
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

- 프로젝트 링크: [https://github.com/yourusername/summarygenie](https://github.com/yourusername/summarygenie)
- 이메일: support@summarygenie.com
- Discord: [SummaryGenie Community](https://discord.gg/summarygenie)

## 🙏 감사의 말

- **OpenAI** - GPT-4o-mini API
- **Google Firebase** - Firestore, Auth
- **Chrome Extensions** - 플랫폼
- **Mozilla PDF.js** - PDF 처리
- **Material Design** - UI 디자인
- **Stripe** - 결제 인프라
- **Nodemailer** - 이메일 발송
- **bcryptjs** - 비밀번호 해싱
- **Express.js** - 백엔드 프레임워크

## 📚 추가 자료

- [개발 로드맵](docs/로드맵.md)
- [기획서](docs/기획서.md)
- [Firebase 설정 가이드](docs/firebase-setup.md)
- [**보안 가이드**](docs/SECURITY.md) 🆕
- [비밀번호 유틸리티 가이드](docs/password-README.md)
- [API 문서](docs/api.md)
- [에러 처리 가이드](docs/error-handling.md)
- [배포 가이드](docs/deployment.md)

---

**Made with ❤️ by SummaryGenie Team**

**Version**: 2.5.0 | **Last Updated**: 2025-01-10