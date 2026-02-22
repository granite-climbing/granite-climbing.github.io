import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1>개인정보처리방침</h1>

          <section className={styles.section}>
            <p className={styles.effectiveDate}>시행일자: 2026년 2월 22일</p>
          </section>

          <section className={styles.section}>
            <h2>1. 개인정보의 처리 목적</h2>
            <p>
              Granite(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다.
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
              이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul>
              <li>서비스 제공 및 운영</li>
              <li>회원 관리 및 본인 확인</li>
              <li>문의사항 및 불만 처리</li>
              <li>서비스 개선 및 통계 분석</li>
              <li>법령 및 이용약관을 위반하는 회원에 대한 이용 제한 조치</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. 수집하는 개인정보의 항목</h2>
            <p>회사는 다음과 같은 개인정보를 수집하고 있습니다:</p>
            <ul>
              <li><strong>필수항목:</strong> 이메일 주소, 이름(닉네임)</li>
              <li><strong>선택항목:</strong> 프로필 사진, 클라이밍 선호도</li>
              <li><strong>자동 수집항목:</strong> IP 주소, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. 개인정보의 처리 및 보유기간</h2>
            <p>
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은
              개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul>
              <li><strong>회원 가입 및 관리:</strong> 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)</li>
              <li><strong>서비스 이용 기록:</strong> 통신비밀보호법에 따라 3개월</li>
              <li><strong>소비자 불만 또는 분쟁처리 기록:</strong> 전자상거래 등에서의 소비자보호에 관한 법률에 따라 3년</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4. 개인정보의 제3자 제공</h2>
            <p>
              회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며,
              정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만
              개인정보를 제3자에게 제공합니다.
            </p>
            <p>현재 회사는 개인정보를 제3자에게 제공하지 않습니다.</p>
          </section>

          <section className={styles.section}>
            <h2>5. 개인정보 처리의 위탁</h2>
            <p>
              회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
            </p>
            <ul>
              <li><strong>클라우드 서비스 제공:</strong> Vercel, AWS 등 (서버 호스팅 및 데이터 저장)</li>
              <li><strong>인증 서비스:</strong> 소셜 로그인 제공업체 (사용자 인증)</li>
            </ul>
            <p>
              회사는 위탁계약 체결 시 개인정보보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지,
              기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을
              계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. 정보주체의 권리·의무 및 행사방법</h2>
            <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
            <ul>
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
            </ul>
            <p>
              권리 행사는 회사에 대해 서면, 전화, 전자우편 등을 통하여 하실 수 있으며,
              회사는 이에 대해 지체없이 조치하겠습니다.
            </p>
            <p>
              정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는
              회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. 개인정보의 파기</h2>
            <p>
              회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
              지체없이 해당 개인정보를 파기합니다.
            </p>
            <p><strong>파기 절차:</strong></p>
            <p>
              이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져(종이의 경우 별도의 서류)
              내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다.
            </p>
            <p><strong>파기 방법:</strong></p>
            <ul>
              <li>전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다</li>
              <li>종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>8. 개인정보의 안전성 확보조치</h2>
            <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
            <ul>
              <li><strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
              <li><strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치,
                  고유식별정보 등의 암호화, 보안프로그램 설치</li>
              <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>9. 개인정보 보호책임자</h2>
            <p>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고,
              개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이
              개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className={styles.contact}>
              <p><strong>개인정보 보호책임자</strong></p>
              <p>이메일: privacy@granite.com</p>
              <p>
                정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의,
                불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
                회사는 정보주체의 문의에 대해 지체없이 답변 및 처리해드릴 것입니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>10. 개인정보 처리방침 변경</h2>
            <p>
              이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가,
              삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. 권익침해 구제방법</h2>
            <p>
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회,
              한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.
            </p>
            <ul>
              <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
              <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
              <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
              <li>경찰청: (국번없이) 182 (ecrm.cyber.go.kr)</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
