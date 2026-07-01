# 근무표 캘린더 (iPhone Web App)

Excel 근무표를 업로드하면 **일요일 시작 주간 캘린더**로 표시하는 iPhone 친화형 웹앱입니다.

## 기능

- Excel(.xlsx/.xls) 근무표 파싱 (박종규 등 대상자 지정)
- C/A/당/休 색상, 👍 리더, 동료 근무자 표시
- **2026년 1월 ~ 2029년 3월** 월별 저장 (localStorage)
- PDF 저장, Google Calendar 연동
- PWA: iPhone 홈 화면에 추가 가능

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000

## iPhone에서 사용

1. Safari로 Vercel URL 접속
2. 공유 → **홈 화면에 추가**

## 배포

GitHub push 후 Vercel에서 Import:

- Framework: Next.js
- Root: `excel-schedule-calendar`

## Google Calendar (선택)

`.env.local`:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/google-calendar/callback
```
