# WePet

[한국어](#한국어) | [English](#english) | [中文](#中文)

---

## 한국어

반려동물을 위한 소셜 네트워크 서비스입니다. 사용자는 반려동물 프로필을 만들고, 주변 펫과 매칭하며, 채팅하고, 이벤트에 참여하고, AI 펫 닥터를 통해 초기 건강 상담을 받을 수 있습니다.

현재 대학교 캡스톤 디자인 프로젝트로 진행 중이며, 지속적으로 개선하고 있습니다.

---

### 프로젝트 개요

WePet은 반려동물을 키우는 사람들이 서로 연결될 수 있도록 돕는 플랫폼입니다. 사용자는 자신의 반려동물 정보(품종, 나이, 성격, 관심사)를 기반으로 다른 펫과 매칭될 수 있습니다. 매칭 알고리즘은 규칙 기반 점수 시스템을 사용하며, AI는 펫 닥터와 채팅 어시스턴트 기능에만 활용됩니다.

프로젝트는 두 계층으로 배포됩니다. 프론트엔드는 Next.js로 Vercel에, 백엔드는 Express로 Render에 배포됩니다. 데이터베이스는 Supabase(PostgreSQL)를 사용합니다. Android 앱은 Capacitor로 빌드하여 APK 설치가 가능합니다.

---

### 주요 기능

- **펫 매칭** — 품종 호환성, 나이대, 성격 태그, 관심사, 거리를 기반으로 한 규칙 기반 매칭 시스템. 하루 3회 무료 좋아요, 멤버십 가입 시 무제한
- **프로필 좋아요** — 매칭 시스템과 별개로 사용자 프로필에 좋아요를 남길 수 있는 기능
- **채팅** — 양방향 매칭 후 채팅 가능. 이벤트 단체 채팅 및 Firebase Cloud Messaging 푸시 알림 지원
- **AI 닥터** — 반려동물 사진과 증상을 업로드하면 OpenAI 비전 모델이 초기 건강 관찰 및 조언 제공 (진단 아님)
- **AI 채팅 어시스턴트** — 반려동물 관련 질문이나 일반 질문에 답변하는 AI 챗봇
- **탐색 / 이벤트** — 지도에서 반려동물 친화적인 장소(공원, 카페) 탐색, 이벤트 목록, 참여 및 단체 채팅
- **멤버십** — 정기 구독을 통해 무제한 좋아요 등 혜택 제공
- **다국어 지원** — English / 한국어 / 中文 세 가지 언어로 UI 제공
- **Android APK** — Capacitor로 빌드, Firebase 푸시 알림 지원

---

### 기술 스택

| 계층 | 기술 |
|------|------|
| 프론트엔드 | Next.js (App Router), React, TypeScript, TailwindCSS |
| 백엔드 API | Express (Render에 배포) |
| 데이터베이스 | Supabase (PostgreSQL) |
| AI | OpenAI API (GPT-4o-mini / GPT-5.2) |
| 푸시 알림 | Firebase Cloud Messaging |
| 지도 | Google Maps API |
| 모바일 | Capacitor Android |
| 이메일 | Resend |
| AI 추천 서비스 | Python FastAPI (별도 서비스, Docker) |

---

### 프로젝트 구조

```
wepet/
├── web/                          # Next.js 프론트엔드
│   ├── app/
│   │   ├── (main)/               # 인증된 사용자 라우트
│   │   │   ├── match/            # 펫 매칭 (스와이프 UI)
│   │   │   ├── chat/             # 채팅
│   │   │   ├── explore/          # 이벤트 및 지도 탐색
│   │   │   ├── doctor/           # AI 펫 닥터
│   │   │   ├── profile/          # 사용자 프로필
│   │   │   ├── settings/         # 계정 및 언어 설정
│   │   │   └── membership/       # 멤버십 및 결제
│   │   ├── api/                  # Next.js API 라우트
│   │   │   ├── ai/               # OpenAI 채팅 및 닥터 엔드포인트
│   │   │   ├── auth/             # 로그인, 회원가입, 프로필
│   │   │   ├── match/            # 좋아요 및 추천 엔드포인트
│   │   │   ├── chat/             # 대화 및 메시지
│   │   │   ├── membership/       # 결제
│   │   │   └── profile/          # 통계
│   │   ├── landing/              # 랜딩 페이지
│   │   └── lib/i18n/             # 다국어 번역
│   ├── components/               # UI 컴포넌트 (shadcn/ui)
│   └── public/                   # 정적 파일
├── server.js                     # Express 백엔드 (Render)
├── render-api/                   # 대체 Render API (레거시)
├── ai-service/                   # Python 추천 서비스
│   ├── Dockerfile
│   ├── recommend_service.py
│   └── requirements.txt
├── android/                      # Capacitor Android 프로젝트
├── scripts/                      # DB 마이그레이션 스크립트
├── middleware/                    # Express 인증 미들웨어
└── capacitor.config.ts
```

---

### 로컬 개발 환경

#### 필수 조건

- Node.js >= 18
- pnpm (web/ 디렉토리)
- Supabase 프로젝트
- OpenAI API 키 (AI 기능)
- Google Maps API 키 (지도 기능)
- Firebase 프로젝트 (푸시 알림, 선택 사항)

#### 설정

```bash
# 1. Express 백엔드 의존성 설치
npm install

# 2. Next.js 프론트엔드 의존성 설치
cd web
pnpm install
cd ..

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 값 입력
```

#### 실행

```bash
# 터미널 1: Express 백엔드
npm start

# 터미널 2: Next.js 프론트엔드
cd web
pnpm dev
```

프론트엔드는 기본적으로 `http://localhost:3000`에서 실행됩니다. Express 백엔드도 기본적으로 3000번 포트를 사용하므로, 로컬에서 동시에 실행할 때는 Express 서버에 `PORT=3001`을 설정하세요.

#### Android APK

```bash
# 웹 앱 빌드
cd web
pnpm build

# Capacitor 동기화
cd ..
npx cap sync android

# Android Studio에서 열기
npx cap open android
```

---

### 환경 변수

```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# JWT
JWT_SECRET=

# CORS
CORS_ORIGIN=http://localhost:3000

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Resend (이메일 인증)
RESEND_API_KEY=

# Firebase Admin (푸시 알림)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Next.js 공개 환경 변수 (web/.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

---

### 배포

#### 프론트엔드 — Vercel

Next.js 앱(`web/`)을 Vercel에 배포합니다. 위 환경 변수들을 Vercel 프로젝트 대시보드에서 설정하세요.

#### 백엔드 — Render

Express 서버(`server.js`)를 Render Web Service로 배포합니다. 루트 `package.json`에 시작 스크립트가 포함되어 있습니다. 환경 변수는 Render 대시보드에서 설정하세요.

#### 데이터베이스 — Supabase

모든 데이터는 Supabase PostgreSQL에 저장됩니다. 테이블은 `users`, `likes`, `profile_likes`, `conversations`, `messages`, `conversation_members`, `events`, `event_participants`, `memberships`, `push_tokens`, `chat_settings`, `email_verification_codes`, `sessions`, `contact_deletions` 등이 있습니다.

마이그레이션 스크립트는 `scripts/` 디렉토리에 있습니다.

---

### 현재 상태

캡스톤 프로젝트로, 현재도 계속 기능을 추가하고 개선 중입니다. 테스트 피드백을 바탕으로 기능을 보완하고 있으며, 데모 및 테스트 용도로 사용할 수 있습니다.

---

### 알려진 한계점

- **매칭 알고리즘**은 규칙 기반(품종 호환성 매트릭스, 나이대, 성격 태그 매칭, 거리 점수)입니다. ML 기반이 아닙니다. Python AI 서비스는 존재하지만 아직 메인 매칭 플로우에 통합되지 않았습니다
- **채팅은 실시간이 아닙니다** — WebSocket 미사용. REST API 폴링으로 메시지를 가져옵니다. 푸시 알림이 일부 보완합니다
- **이벤트**는 정적 시드 데이터와 DB 기반 이벤트가 혼합되어 있습니다. 이벤트 테이블 스키마가 나중에 추가되어 정적 폴백이 존재합니다
- **멤버십 결제** 플로우는 구성되어 있지만 간소화된 체크아웃을 사용합니다 (실제 결제 게이트웨이 미연동)
- **위치**는 기본적으로 도시 수준 좌표를 사용합니다. 실시간 GPS는 지원하지만 선택 사항입니다
- **AI 닥터**는 초기 관찰만 제공합니다 — 수의학 진단 도구가 아닙니다. 중증 증상 감지는 프롬프트에 의존하며, 훈련된 의료 모델이 아닙니다
- **Android APK**는 Capacitor로 빌드됩니다. 네이티브 플러그인 지원은 푸시 알림과 위치 정보로 제한됩니다
- **에러 처리** — 일부 엣지 케이스(예: DB 테이블 누락)에서 인메모리 상태로 폴백하며, 서버 재시작 시 초기화됩니다
- **테스트** — 아직 자동화된 테스트 스위트가 없습니다

---

## English

A pet social network. Users can create pet profiles, match with nearby pets, chat, join events, and use the AI pet doctor for preliminary health observations.

This is a university capstone project, still under active development.

---

### Project Overview

WePet helps pet owners connect based on their pets' information (breed, age, personality, interests). The matching system uses a rule-based scoring algorithm — AI is only used in the pet doctor and chat assistant features.

The project is deployed in two layers: the Next.js frontend on Vercel, and the Express backend on Render. The database is Supabase (PostgreSQL). Android builds are handled via Capacitor for APK installation.

---

### Main Features

- **Pet Matching** — Rule-based matching using breed compatibility, age group, personality tags, interests, and distance. 3 free likes per day, unlimited with membership
- **Profile Likes** — Like user profiles independently from the matching system
- **Chat** — Messaging after mutual match. Supports event group chats and Firebase Cloud Messaging push notifications
- **AI Doctor** — Upload pet photos with symptoms; OpenAI vision model provides preliminary health observations (not a diagnosis)
- **AI Chat Assistant** — General-purpose AI assistant for pet-related or other questions
- **Explore / Events** — Map-based discovery of pet-friendly places (parks, cafes), event listings, participation, and group chat
- **Membership** — Subscription plan unlocking unlimited likes and other benefits
- **Multilingual** — UI available in English / 한국어 / 中文
- **Android APK** — Capacitor build with Firebase push notifications

---

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), React, TypeScript, TailwindCSS |
| Backend API | Express (deployed on Render) |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI API (GPT-4o-mini / GPT-5.2) |
| Push Notifications | Firebase Cloud Messaging |
| Maps | Google Maps API |
| Mobile | Capacitor Android |
| Email | Resend |
| AI Recommendation Service | Python FastAPI (separate service, Docker) |

---

### Local Setup

**Prerequisites:** Node.js >= 18, pnpm, a Supabase project, OpenAI API key, Google Maps API key.

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd web && pnpm install && cd ..

# Set up environment variables
cp .env.example .env
```

**Run locally:**

```bash
# Terminal 1: Express backend
npm start

# Terminal 2: Next.js frontend
cd web && pnpm dev
```

Frontend runs on `http://localhost:3000`. Set `PORT=3001` for Express when running both locally.

---

### Current Status

Capstone project, actively iterating. Functional for demo and testing. See the Korean section above for a full list of known limitations.

---

## 中文

宠物社交网络。用户可以创建宠物档案、匹配附近的宠物、聊天、参加活动，以及使用 AI 宠物医生进行初步健康咨询。

目前是大学毕设项目，还在持续迭代中。

---

### 项目简介

WePet 帮助养宠人士根据宠物信息（品种、年龄、性格、兴趣）互相发现和连接。匹配机制基于规则评分，AI 只用在宠物医生和聊天助手两个功能上。

项目分两层部署：前端 Next.js 部署在 Vercel，后端 Express 部署在 Render。数据库使用 Supabase（PostgreSQL）。Android 端通过 Capacitor 打包，支持 APK 安装。

---

### 核心功能

- **宠物匹配** — 基于品种兼容性、年龄阶段、性格标签、兴趣和距离的规则匹配系统。每天免费 3 次喜欢，会员不限次数
- **主页点赞** — 用户主页点赞，独立于匹配系统，单独计数
- **聊天** — 双向匹配后可聊天。支持活动群聊和 Firebase 推送通知
- **AI 医生** — 上传宠物照片和症状描述，OpenAI 视觉模型给出初步健康观察和建议（非诊断）
- **AI 聊天助手** — 通用 AI 助手，回答宠物相关或其他问题
- **探索 / 活动** — 地图浏览宠物友好地点（公园、咖啡馆），活动列表，参与活动和群聊
- **会员** — 订阅会员解锁无限喜欢等权益
- **多语言** — 界面支持 English / 한국어 / 中文
- **Android APK** — Capacitor 打包，支持 Firebase 推送通知

---

### 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js (App Router), React, TypeScript, TailwindCSS |
| 后端 API | Express (部署在 Render) |
| 数据库 | Supabase (PostgreSQL) |
| AI | OpenAI API (GPT-4o-mini / GPT-5.2) |
| 推送通知 | Firebase Cloud Messaging |
| 地图 | Google Maps API |
| 移动端 | Capacitor Android |
| 邮件 | Resend |
| AI 推荐服务 | Python FastAPI (独立服务, Docker) |

---

### 本地运行

**环境要求：** Node.js >= 18, pnpm, Supabase 项目, OpenAI API 密钥, Google Maps API 密钥。

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd web && pnpm install && cd ..

# 配置环境变量
cp .env.example .env
```

**本地启动：**

```bash
# 终端 1：Express 后端
npm start

# 终端 2：Next.js 前端
cd web && pnpm dev
```

前端默认运行在 `http://localhost:3000`。本地同时运行时，Express 需设置 `PORT=3001`。

---

### 当前状态

毕设项目，仍在积极开发中。可用于演示和测试。完整的功能限制列表请参考上方韩文版。
