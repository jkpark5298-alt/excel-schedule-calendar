# 근무표 캘린더 (iPhone Web App)

Excel 근무표를 업로드하면 **일요일 시작 주간 캘린더**로 표시하는 iPhone 친화형 웹앱입니다.

## 기능

- Excel(.xlsx/.xls) / PDF / 이미지(.png, .jpg 등) 근무표 파싱 (박종규 등 대상자 지정)
- C/A/당/休 색상, 👍 리더, 동료 근무자 표시
- **2026년 1월 ~ 2029년 3월** 월별 저장 (localStorage)
- PDF 저장, Google Calendar 연동
- PWA: iPhone 홈 화면에 추가 가능

### 이미지 업로드

- 근무표 사진/캡처 이미지를 업로드하면 Vision API로 인식합니다.  
- OpenAI 쿼터(결제) 부족 시 Tesseract OCR로 자동 재시도합니다.  
- Vercel 환경변수 `OPENAI_API_KEY`가 있으면 인식률이 더 높습니다.

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
