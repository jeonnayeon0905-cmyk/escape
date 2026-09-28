import Hero from '../components/Hero';

/** 환경 변수가 설정되지 않았을 때 보여주는 안내 화면 */
export default function Setup() {
  return (
    <>
      <Hero title="설정 필요" subtitle="Supabase 연결 정보가 없어요" compact />
      <main className="page">
        <section className="card setup-card">
          <p>
            앱을 실행하려면 <code>VITE_SUPABASE_URL</code> 과 <code>VITE_SUPABASE_ANON_KEY</code> 환경 변수가 필요해요.
          </p>
          <ol>
            <li>로컬 개발: 프로젝트 루트에 <code>.env</code> 파일을 만들고 <code>.env.example</code> 의 값을 채워주세요.</li>
            <li>Netlify: Site configuration → Environment variables 에 두 값을 추가한 뒤 다시 배포해주세요.</li>
          </ol>
          <p className="muted">자세한 방법은 저장소의 README.md 를 참고하세요.</p>
        </section>
      </main>
    </>
  );
}
