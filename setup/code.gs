/**
 * =====================================================
 * 장기재직자 휴가 캘린더 — Google Apps Script 백엔드
 * =====================================================
 *
 * [설정 순서]
 * 1. Google 스프레드시트 새로 만들기
 * 2. 상단 메뉴 → 확장 프로그램 → Apps Script
 * 3. 열린 편집창에서 기존 코드 모두 지우고, 이 파일 내용 전체 붙여넣기
 * 4. Ctrl+S 로 저장
 * 5. 상단 [배포] 버튼 → [새 배포]
 *      유형 선택: 웹 앱
 *      다음 사용자로 실행: 나(본인)
 *      액세스 권한: 모든 사용자
 *    → [배포] 클릭 → 권한 허용
 * 6. 표시된 "웹 앱 URL" 복사
 * 7. 그 URL 을 나(Claude)에게 알려주면 index.html 에 자동 반영
 * =====================================================
 */

// 스프레드시트 시트 이름 (수정 불필요)
var SHEET_VAC     = 'vacations';
var SHEET_BLOCKED = 'blocked';

// ── 진입점 ────────────────────────────────────────────────
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'list';

    if      (action === 'list')   return listAll();
    else if (action === 'add')    return addVacation(e.parameter);
    else if (action === 'delete') return delVacation(e.parameter.id);
    else                          return out({ status: 'error', message: '알 수 없는 action' });

  } catch (err) {
    return out({ status: 'error', message: err.message });
  }
}

// ── 시트 초기화 ───────────────────────────────────────────
function getSheet(name) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_VAC) {
      sheet.appendRow(['id', 'name', 'start', 'end', 'memo', 'ts']);
      sheet.setFrozenRows(1);
    } else if (name === SHEET_BLOCKED) {
      sheet.appendRow(['date', 'reason']);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ── 전체 조회 ─────────────────────────────────────────────
function listAll() {
  var sheet = getSheet(SHEET_VAC);
  var rows  = sheet.getDataRange().getValues();

  var vacations = rows.slice(1)
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) {
      return { id: String(r[0]), name: r[1], start: r[2], end: r[3], memo: r[4] || '', ts: r[5] || '' };
    });

  var blocked = [];
  try {
    var bSheet = getSheet(SHEET_BLOCKED);
    var bRows  = bSheet.getDataRange().getValues();
    blocked = bRows.slice(1).map(function(r) { return r[0]; }).filter(function(d) { return d; });
  } catch (e) {}

  return out({ status: 'ok', vacations: vacations, blocked: blocked });
}

// ── 휴가 추가 ─────────────────────────────────────────────
function addVacation(p) {
  if (!p.name || !p.start || !p.end) return out({ status: 'error', message: '필수 항목 누락' });

  var sheet = getSheet(SHEET_VAC);
  var id    = new Date().getTime();
  var ts    = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');

  sheet.appendRow([id, p.name, p.start, p.end, p.memo || '', ts]);
  return out({ status: 'ok', id: String(id) });
}

// ── 휴가 삭제 ─────────────────────────────────────────────
function delVacation(id) {
  var sheet = getSheet(SHEET_VAC);
  var rows  = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return out({ status: 'ok' });
    }
  }
  return out({ status: 'not_found' });
}

// ── 차단 날짜 추가 (관리자용) ─────────────────────────────
function addBlocked(date, reason) {
  var sheet = getSheet(SHEET_BLOCKED);
  sheet.appendRow([date, reason || '']);
}

// ── 응답 헬퍼 ─────────────────────────────────────────────
function out(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
