// =============================================================
// NRB 2026 LEAD CAPTURE — Google Apps Script
// =============================================================
//
// SETUP INSTRUCTIONS:
//
// 1. Create a new Google Sheet (or use an existing one)
//    Name it: "NRB 2026 Lead Tracker"
//
// 2. Rename the first tab to: "Leads"
//    Add these headers in Row 1 (A1 through AE1):
//
//    A1: Timestamp
//    B1: AE Owner
//    C1: First Name
//    D1: Last Name
//    E1: Title
//    F1: Company
//    G1: Website
//    H1: Email
//    I1: Phone
//    J1: Products Discussed
//    K1: Demo Given
//    L1: Meeting Quality (1-5)
//    M1: Conversation Summary
//    N1: Pain Points
//    O1: Next Steps
//    P1: Capture Method
//    Q1: Intent Level
//    R1: Scenario
//    S1: Lifecycle Stage
//    T1: Previous PRAY.COM Interactions
//    U1: Organization Description
//    V1: NRB Role
//    W1: Estimated Revenue Range
//    X1: NRB Exhibitor Booth
//    Y1: Distribution Channels
//    Z1: Competitor Signals
//    AA1: Donation Tools in Use
//    AB1: Podcast Link
//    AC1: NRB Speaking Sessions
//    AD1: Card Photo Link
//    AE1: Badge Photo Link
//
// 3. Open Apps Script:
//    - In Google Sheets, go to Extensions > Apps Script
//    - Delete any existing code in Code.gs
//    - Paste ALL the code below into Code.gs
//    - Click Save (Ctrl+S)
//
// 4. *** CRITICAL: Fix the manifest for Drive access ***
//    - In the Apps Script editor, click the gear icon (Project Settings)
//      on the left sidebar
//    - Check the box: "Show 'appsscript.json' manifest file in editor"
//    - Go back to the Editor (< > icon on left sidebar)
//    - Click on "appsscript.json" in the file list
//    - Replace its ENTIRE contents with:
//
//      {
//        "timeZone": "America/Chicago",
//        "dependencies": {},
//        "exceptionLogging": "STACKDRIVER",
//        "runtimeVersion": "V8",
//        "oauthScopes": [
//          "https://www.googleapis.com/auth/spreadsheets",
//          "https://www.googleapis.com/auth/drive",
//          "https://www.googleapis.com/auth/script.external_request"
//        ],
//        "webapp": {
//          "executeAs": "USER_DEPLOYING",
//          "access": "ANYONE_ANONYMOUS"
//        }
//      }
//
//    - Click Save (Ctrl+S)
//
// 5. Authorize all permissions:
//    - Select "authorizeScript" from the function dropdown
//    - Click "Run"
//    - A permissions popup will appear — click "Review Permissions"
//    - Select your Google account
//    - Click "Advanced" > "Go to NRB 2026 Lead Capture (unsafe)"
//    - Click "Allow"
//    - This grants BOTH Spreadsheet AND Google Drive permissions
//
// 6. Deploy as Web App:
//    - Click "Deploy" > "New deployment"
//    - Click the gear icon next to "Select type" > choose "Web app"
//    - Set "Execute as" to: Me
//    - Set "Who has access" to: Anyone
//    - Click "Deploy"
//    - COPY the Web App URL that appears
//
//    *** If you already deployed before and are updating: ***
//    - Click "Deploy" > "Manage deployments"
//    - Click the pencil icon on your existing deployment
//    - Set "Version" to: New version
//    - Click "Deploy"
//    - This keeps the same URL so you don't need to update the tool
//
// 7. Paste the Web App URL into booth-audio-capture.html:
//    Find this line near the top of the <script>:
//      var GOOGLE_SHEETS_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
//    Replace the placeholder with your URL.
//
// 8. Test it! Open booth-audio-capture.html, fill in some data, and submit.
//    The row should appear in your Google Sheet within seconds.
//
// NOTES:
// - Photos are saved to a "NRB 2026 Photos" folder in your Google Drive
// - Each photo is linked from the spreadsheet so you can click to view
// - If you redeploy the script, use "Manage deployments" > edit the
//   existing deployment (don't create a new one) to keep the same URL
//
// FIXING "Access denied: DriveApp" or "NEEDS_AUTH" ERROR:
// - Go to Project Settings (gear icon) > check "Show appsscript.json"
// - Edit appsscript.json and add the oauthScopes shown in step 4 above
// - Save, then select "authorizeScript" > Run > Approve permissions
// - Deploy > Manage deployments > edit > New version > Deploy
// =============================================================


// ----- Run this ONCE from the editor to authorize all permissions -----
function authorizeScript() {
  // This function triggers the OAuth consent screen for ALL scopes.
  // It doesn't do anything else — just forces Google to ask for permissions.

  // Touch SpreadsheetApp (Sheets permission)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Spreadsheet access OK: ' + ss.getName());

  // Touch DriveApp (Drive permission — needed for saving photos)
  var root = DriveApp.getRootFolder();
  Logger.log('Drive access OK: ' + root.getName());

  // Touch Utilities (already included, but just in case)
  var encoded = Utilities.base64Encode('test');
  Logger.log('Utilities OK');

  Logger.log('All permissions authorized! You can now deploy or re-deploy the web app.');
}

// ----- Run this to test Drive photo saving works -----
function testDriveAccess() {
  try {
    var folderName = 'NRB 2026 Photos';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
      Logger.log('Found existing folder: ' + folder.getName());
    } else {
      folder = DriveApp.createFolder(folderName);
      Logger.log('Created new folder: ' + folder.getName());
    }

    // Create a tiny test file
    var blob = Utilities.newBlob('test', 'text/plain', 'drive-test.txt');
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    Logger.log('Test file created: ' + file.getUrl());

    // Clean up
    file.setTrashed(true);
    Logger.log('Test file deleted. Drive access is working!');
    Logger.log('You can now redeploy: Deploy > Manage deployments > pencil icon > New version > Deploy');
  } catch (error) {
    Logger.log('DRIVE ERROR: ' + error.toString());
    Logger.log('Fix: Go to Project Settings > check "Show appsscript.json" > add Drive scope > Save > re-run authorizeScript');
  }
}


// ----- Main handler: receives POST from the capture tool -----
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');

    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    }

    // Handle meeting status update (from Pre-Booked panel)
    if (data.action === 'update_meeting') {
      return updateMeetingStatus_(sheet, data);
    }

    // Save photos to Google Drive and get shareable links
    var cardPhotoUrl = '';
    var badgePhotoUrl = '';

    if (data.business_card_photo && data.business_card_photo.length > 100) {
      cardPhotoUrl = savePhotoToDrive(data.business_card_photo, data.first_name, data.last_name, 'card');
    }

    if (data.badge_photo && data.badge_photo.length > 100) {
      badgePhotoUrl = savePhotoToDrive(data.badge_photo, data.first_name, data.last_name, 'badge');
    }

    // Append row to sheet (columns A through AI)
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),   // A: Timestamp
      data.ae_owner || '',                           // B: AE Owner
      data.first_name || '',                         // C: First Name
      data.last_name || '',                          // D: Last Name
      data.title || '',                              // E: Title
      data.company || '',                            // F: Company
      data.website || '',                            // G: Website
      data.email || '',                              // H: Email
      data.phone || '',                              // I: Phone
      data.products_discussed || '',                 // J: Products Discussed
      data.demo_given || '',                         // K: Demo Given
      data.meeting_quality || '',                    // L: Meeting Quality (1-5)
      data.conversation_summary || '',               // M: Conversation Summary
      data.pain_points || '',                        // N: Pain Points
      data.next_steps || '',                         // O: Next Steps
      data.capture_method || '',                     // P: Capture Method
      data.intent_level || '',                       // Q: Intent Level
      data.scenario || '',                           // R: Scenario
      data.lifecycle_stage || '',                    // S: Lifecycle Stage
      data.previous_interactions || '',              // T: Previous PRAY.COM Interactions
      data.org_description || '',                    // U: Organization Description
      data.nrb_role || '',                           // V: NRB Role
      data.revenue_range || '',                      // W: Estimated Revenue Range
      data.nrb_booth || '',                          // X: NRB Exhibitor Booth
      data.distribution_channels || '',              // Y: Distribution Channels
      data.competitor_signals || '',                 // Z: Competitor Signals
      data.donation_tools || '',                     // AA: Donation Tools in Use
      data.podcast_link || '',                       // AB: Podcast Link
      data.nrb_sessions || '',                       // AC: NRB Speaking Sessions
      cardPhotoUrl,                                  // AD: Card Photo Link
      badgePhotoUrl                                  // AE: Badge Photo Link
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', row: sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----- Handle GET requests: search and status check -----
function doGet(e) {
  var params = e ? e.parameter : {};

  // Search action: find leads by name or email
  if (params.action === 'search' && params.q) {
    return searchLeads_(params.q);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'NRB 2026 Lead Capture endpoint is live. Use POST to submit leads.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----- Search leads in the sheet by name or email -----
function searchLeads_(query) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');
    if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    var data = sheet.getDataRange().getValues();
    var results = [];
    var q = query.toLowerCase();

    // Skip header row (row 0), search columns C (first name), D (last name), H (email), F (company)
    for (var i = 1; i < data.length; i++) {
      var firstName = String(data[i][2] || '');  // C
      var lastName = String(data[i][3] || '');   // D
      var email = String(data[i][7] || '');      // H
      var company = String(data[i][5] || '');    // F
      var fullName = firstName + ' ' + lastName;

      if (fullName.toLowerCase().indexOf(q) !== -1 ||
          firstName.toLowerCase().indexOf(q) !== -1 ||
          lastName.toLowerCase().indexOf(q) !== -1 ||
          email.toLowerCase().indexOf(q) !== -1 ||
          company.toLowerCase().indexOf(q) !== -1) {
        results.push({
          row_number: i + 1,  // 1-indexed sheet row
          first_name: firstName,
          last_name: lastName,
          title: String(data[i][4] || ''),          // E
          company: company,
          email: email,
          products: String(data[i][9] || ''),        // J
          intent_level: String(data[i][16] || ''),   // Q
          distribution_channels: String(data[i][24] || '')  // Y
        });
      }
      if (results.length >= 10) break; // Max 10 results
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', results: results }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString(), results: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----- Update meeting status on an existing row -----
function updateMeetingStatus_(sheet, data) {
  try {
    var row = parseInt(data.row_number);
    if (!row || row < 2) throw new Error('Invalid row number');

    // Update Conversation Summary (col M = 13) — append meeting notes
    var existingSummary = sheet.getRange(row, 13).getValue() || '';
    var newNotes = data.meeting_notes || '';
    var statusLabel = data.meeting_status === 'completed' ? 'SHOWED' :
                      data.meeting_status === 'no_show' ? 'NO-SHOW' : 'RESCHEDULED';
    var updateNote = '[Meeting ' + statusLabel + ' — ' + data.update_timestamp + ']';
    if (newNotes) updateNote += ' ' + newNotes;
    var combinedSummary = existingSummary ? existingSummary + '\n' + updateNote : updateNote;
    sheet.getRange(row, 13).setValue(combinedSummary);

    // Update Meeting Quality / Deal Potential (col L = 12)
    if (data.deal_potential) {
      sheet.getRange(row, 12).setValue(data.deal_potential);
    }

    // Update Next Steps (col O = 15) — append status
    var existingSteps = sheet.getRange(row, 15).getValue() || '';
    var statusNote = 'Meeting status: ' + statusLabel + ' (updated by ' + (data.updated_by || 'unknown') + ')';
    sheet.getRange(row, 15).setValue(existingSteps ? existingSteps + '; ' + statusNote : statusNote);

    // Update Scenario (col R = 18) to reflect prebooked
    sheet.getRange(row, 18).setValue('Pre-Booked Meeting');

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', row: row, meeting_status: data.meeting_status }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----- Save a base64 photo to Google Drive using REST API -----
// Uses UrlFetchApp + Drive REST API instead of DriveApp to avoid permission issues
function savePhotoToDrive(base64Data, firstName, lastName, photoType) {
  try {
    var token = ScriptApp.getOAuthToken();

    // Parse the base64 data URI (format: data:image/jpeg;base64,/9j/4AAQ...)
    var parts = base64Data.split(',');
    var mimeMatch = parts[0].match(/data:(.*?);/);
    var mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var extension = mimeType.split('/')[1] || 'jpg';
    if (extension === 'jpeg') extension = 'jpg';

    // Build filename: LastName_FirstName_card_2026-02-18T14-30.jpg
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var safeName = (lastName || 'Unknown') + '_' + (firstName || 'Lead');
    safeName = safeName.replace(/[^a-zA-Z0-9_-]/g, '');
    var fileName = safeName + '_' + photoType + '_' + timestamp + '.' + extension;

    // Find or create "NRB 2026 Photos" folder
    var folderId = getOrCreateFolder_('NRB 2026 Photos', token);

    // Upload file to Drive via REST API
    var decoded = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);

    var metadata = {
      name: fileName,
      parents: [folderId]
    };

    var boundary = 'nrb2026boundary';
    var requestBody =
      '--' + boundary + '\r\n' +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      parts[1] + '\r\n' +
      '--' + boundary + '--';

    var uploadResponse = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      contentType: 'multipart/related; boundary=' + boundary,
      payload: requestBody,
      muteHttpExceptions: true
    });

    var uploadResult = JSON.parse(uploadResponse.getContentText());
    if (!uploadResult.id) {
      Logger.log('Upload failed: ' + uploadResponse.getContentText());
      return 'UPLOAD_ERROR: ' + uploadResponse.getContentText();
    }

    var fileId = uploadResult.id;

    // Make file viewable by anyone with the link
    UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '/permissions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      contentType: 'application/json',
      payload: JSON.stringify({ role: 'reader', type: 'anyone' }),
      muteHttpExceptions: true
    });

    return 'https://drive.google.com/file/d/' + fileId + '/view';

  } catch (error) {
    Logger.log('Photo save error: ' + error.toString());
    return 'PHOTO_ERROR: ' + error.toString();
  }
}

// ----- Helper: find or create a folder by name via Drive REST API -----
function getOrCreateFolder_(folderName, token) {
  // Search for existing folder
  var query = "name='" + folderName + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
  var searchResponse = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query), {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });
  var searchResult = JSON.parse(searchResponse.getContentText());

  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Create new folder
  var createResponse = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    contentType: 'application/json',
    payload: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    }),
    muteHttpExceptions: true
  });

  var createResult = JSON.parse(createResponse.getContentText());
  return createResult.id;
}
