import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export default function DataDeletion() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1>데이터 삭제 안내</h1>

          <section className={styles.section}>
            <p className={styles.intro}>
              Granite는 이용자의 개인정보 보호를 중요하게 생각하며,
              개인정보보호법에 따라 이용자의 개인정보 삭제 요청권을 보장합니다.
              본 페이지에서는 개인정보 삭제 절차 및 방법에 대해 안내합니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2>1. 삭제 가능한 데이터</h2>
            <p>다음의 개인정보 및 데이터를 삭제 요청하실 수 있습니다:</p>
            <ul>
              <li><strong>계정 정보:</strong> 이메일 주소, 이름(닉네임), 프로필 사진</li>
              <li><strong>활동 기록:</strong> 서비스 이용 기록, 접속 로그, 검색 기록</li>
              <li><strong>작성 콘텐츠:</strong> 게시글, 댓글, 리뷰 등 사용자가 생성한 모든 콘텐츠</li>
              <li><strong>설정 정보:</strong> 개인 설정, 환경 설정 등</li>
            </ul>
            <div className={styles.notice}>
              <p><strong>참고:</strong> 법령에 따라 보관이 의무화된 정보는 해당 기간 동안 안전하게 보관되며,
              기간 만료 후 자동으로 파기됩니다.</p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>2. 삭제 요청 방법</h2>

            <h3>방법 1: 회원 탈퇴를 통한 일괄 삭제</h3>
            <p>회원 탈퇴 시 모든 개인정보가 즉시 삭제됩니다:</p>
            <ol className={styles.steps}>
              <li>서비스 로그인 후 마이페이지 접속</li>
              <li>설정 메뉴에서 '회원 탈퇴' 선택</li>
              <li>탈퇴 사유 선택 및 확인</li>
              <li>최종 확인 후 탈퇴 완료</li>
            </ol>

            <h3>방법 2: 이메일을 통한 삭제 요청</h3>
            <p>특정 개인정보만 삭제를 원하시는 경우 아래 이메일로 요청하실 수 있습니다:</p>
            <div className={styles.emailBox}>
              <p><strong>이메일 주소:</strong> privacy@granite.com</p>
              <p><strong>제목:</strong> 개인정보 삭제 요청</p>
              <p><strong>필수 기재 사항:</strong></p>
              <ul>
                <li>이름 또는 닉네임</li>
                <li>가입 시 사용한 이메일 주소</li>
                <li>삭제를 원하는 정보의 구체적인 내용</li>
                <li>본인 확인을 위한 추가 정보 (필요 시)</li>
              </ul>
            </div>

            <h3>방법 3: 고객센터 문의</h3>
            <p>
              온라인 문의 양식이나 고객센터를 통해 삭제를 요청하실 수도 있습니다.
              고객센터 담당자가 본인 확인 후 처리해 드립니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. 처리 절차 및 기간</h2>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineLabel}>1일차</div>
                <div className={styles.timelineContent}>
                  <strong>요청 접수 및 본인 확인</strong>
                  <p>삭제 요청을 접수하고 본인 확인 절차를 진행합니다.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineLabel}>1-3일차</div>
                <div className={styles.timelineContent}>
                  <strong>삭제 대상 확인 및 검토</strong>
                  <p>삭제 가능 여부를 확인하고, 법령상 보관 의무가 있는 정보를 검토합니다.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineLabel}>3-5일차</div>
                <div className={styles.timelineContent}>
                  <strong>데이터 삭제 실행</strong>
                  <p>데이터베이스 및 백업 시스템에서 해당 정보를 완전히 삭제합니다.</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineLabel}>7일차</div>
                <div className={styles.timelineContent}>
                  <strong>처리 완료 통보</strong>
                  <p>삭제 처리 완료를 이메일로 안내해 드립니다.</p>
                </div>
              </div>
            </div>
            <p className={styles.timelineNote}>
              <strong>※</strong> 일반적인 처리 기간은 7일 이내이며, 특별한 사유가 있는 경우 최대 30일까지 소요될 수 있습니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. 삭제 제한 사항</h2>
            <p>다음의 경우 개인정보 삭제가 제한될 수 있습니다:</p>
            <ul>
              <li><strong>법령에 따른 보관 의무:</strong> 전자상거래법, 통신비밀보호법 등 관련 법령에 따라
                  일정 기간 보관해야 하는 정보</li>
              <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년</li>
              <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년</li>
              <li><strong>소비자의 불만 또는 분쟁처리에 관한 기록:</strong> 3년</li>
              <li><strong>서비스 이용 기록:</strong> 3개월</li>
              <li><strong>진행 중인 법적 분쟁:</strong> 분쟁이 해결될 때까지 관련 정보 보관</li>
            </ul>
            <p>
              위와 같이 보관이 필요한 정보는 별도의 데이터베이스에 안전하게 보관되며,
              보관 기간 만료 후 즉시 파기됩니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2>5. 삭제 후 유의사항</h2>
            <div className={styles.warningBox}>
              <h3>⚠️ 중요 안내</h3>
              <ul>
                <li>삭제된 데이터는 <strong>복구가 불가능</strong>합니다.</li>
                <li>회원 탈퇴 후 동일한 계정으로 재가입이 <strong>제한될 수 있습니다</strong>.</li>
                <li>삭제 전에 필요한 데이터는 반드시 <strong>백업</strong>하시기 바랍니다.</li>
                <li>다른 사용자의 게시물에 작성한 댓글 등은 개인정보가 삭제되더라도
                    <strong>'알 수 없음'</strong> 등으로 표시되어 남을 수 있습니다.</li>
              </ul>
            </div>
          </section>

          <section className={styles.section}>
            <h2>6. 문의 및 지원</h2>
            <p>
              개인정보 삭제와 관련하여 궁금하신 사항이 있으시면
              언제든지 아래 연락처로 문의해 주시기 바랍니다.
            </p>
            <div className={styles.contactBox}>
              <div className={styles.contactItem}>
                <strong>개인정보 보호책임자</strong>
                <p>이메일: privacy@granite.com</p>
              </div>
              <div className={styles.contactItem}>
                <strong>고객지원</strong>
                <p>이메일: support@granite.com</p>
              </div>
              <div className={styles.contactItem}>
                <strong>운영 시간</strong>
                <p>평일 09:00 - 18:00 (주말 및 공휴일 제외)</p>
                <p className={styles.smallText}>이메일 문의는 24시간 접수 가능하며, 영업일 기준 1-2일 내 답변드립니다.</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>7. 관련 법령</h2>
            <p>본 데이터 삭제 정책은 다음 법령에 근거하여 운영됩니다:</p>
            <ul>
              <li>개인정보보호법 제36조 (개인정보의 정정·삭제)</li>
              <li>개인정보보호법 제37조 (개인정보의 처리정지 등)</li>
              <li>정보통신망 이용촉진 및 정보보호 등에 관한 법률</li>
              <li>전자상거래 등에서의 소비자보호에 관한 법률</li>
            </ul>
          </section>

          <section className={styles.section}>
            <div className={styles.finalNote}>
              <p>
                Granite는 이용자의 개인정보 자기결정권을 존중하며,
                투명하고 신속한 개인정보 삭제 절차를 제공하기 위해 최선을 다하고 있습니다.
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
