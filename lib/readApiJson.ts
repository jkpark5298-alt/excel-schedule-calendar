export async function readApiJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
      throw new Error(
        `서버 오류 (${res.status}). API가 HTML 오류 페이지를 반환했습니다. 잠시 후 다시 시도해 주세요.`,
      );
    }
    throw new Error(`서버 응답 형식 오류 (${res.status})`);
  }
}
