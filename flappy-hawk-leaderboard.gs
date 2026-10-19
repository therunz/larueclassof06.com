/**
 * Flappy Hawk leaderboard (Google Apps Script)
 *
 * IMPORTANT: put this in a NEW, separate Google Sheet -- NOT the ticket/attendee sheet.
 * This web app is public (anyone with the link can read the top scores), so it must
 * live next to a sheet that contains nothing private.
 *
 * Setup:
 *  1. Create a new Google Sheet (name it "Flappy Hawk Scores").
 *  2. Extensions > Apps Script. Delete the default code and paste this whole file.
 *  3. Deploy > New deployment > type "Web app".
 *       Execute as: Me
 *       Who has access: Anyone
 *     Authorize when asked, then copy the Web app URL (ends in /exec).
 *  4. In flappy-hawk.html, paste that URL into LEADERBOARD_URL near the top of the script.
 *
 * Remember: after ANY later edit to this script, use Deploy > Manage deployments >
 * (pencil) > Version: New version > Deploy, or the live URL keeps running the old code.
 *
 * What it stores: a timestamp, three-letter initials, and a score. Nothing else.
 */

const SHEET_NAME = 'Scores';
const TOP_N = 10;
const MAX_SCORE = 600;   // anything above this is rejected as implausible (points run about 2 per gate)
const BLOCKED = ['ASS', 'SEX', 'FUK', 'FCK', 'SHT', 'DIK', 'DCK', 'TIT', 'CUM', 'FAG', 'NIG', 'KKK', 'NZI'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Timestamp', 'Initials', 'Score']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// The game calls this to draw the Hall of Fame.
function doGet() {
  return json_({ scores: topScores_() });
}

// The game calls this to post a score. Body arrives as text/plain JSON.
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const initials = String(d.initials || '').toUpperCase().replace(/[^A-Z]/g, '');
    const score = Number(d.score);

    if (initials.length !== 3 ||
        BLOCKED.indexOf(initials) !== -1 ||
        !Number.isInteger(score) || score < 1 || score > MAX_SCORE) {
      return json_({ error: 'rejected' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      getSheet_().appendRow([new Date(), initials, score]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ error: 'bad request' });
  }
}

function topScores_() {
  const rows = getSheet_().getDataRange().getValues().slice(1);
  return rows
    .filter(function (r) { return r[1] && Number.isInteger(Number(r[2])); })
    .map(function (r) { return { initials: String(r[1]), score: Number(r[2]), t: new Date(r[0]).getTime() }; })
    // highest score first; on a tie, whoever got there first ranks higher
    .sort(function (a, b) { return b.score - a.score || a.t - b.t; })
    .slice(0, TOP_N)
    .map(function (r) { return { initials: r.initials, score: r.score }; });
}
