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
//    Add these headers in Row 1 (A1 through T1):
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
//    T1: Card Photo Link
//    U1: Badge Photo Link
//
// 3. Open Apps Script:
//    - In Google Sheets, go to Extensions > Apps Script
//    - Delete any existing code in Code.gs
//    - Paste ALL the code below into Code.gs
//    - Click Save (Ctrl+S)
//
// 4. Deploy as Web App:
//    - Click "Deploy" > "New deployment"
//    - Click the gear icon next to "Select type" > choose "Web app"
//    - Set "Execute as" to: Me
//    - Set "Who has access" to: Anyone
//    - Click "Deploy"
//    - Authorize the app when prompted (click through the "unsafe" warning)
//    - COPY the Web App URL that appears
//
// 5. Paste the Web App URL into booth-audio-capture.html:
//    Find this line near the top of the <script>:
//      var GOOGLE_SHEETS_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
//    Replace the placeholder with your URL.
//
// 6. Test it! Open booth-audio-capture.html, fill in some data, and submit.
//    The row should appear in your Google Sheet within seconds.
//
// NOTES:
// - Photos are saved to a "NRB 2026 Photos" folder in your Google Drive
// - Each photo is linked from the spreadsheet so you can click to view
// - If you redeploy the script, use "Manage deployments" > edit the
//   existing deployment (don't create a new one) to keep the same URL
// =============================================================


// ----- Main handler: receives POST from the capture tool -----
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');

    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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

    // Append row to sheet (columns A through U)
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
      data.meeting_quality || '',                    // L: Meeting Quality
      data.conversation_summary || '',               // M: Conversation Summary
      data.pain_points || '',                        // N: Pain Points
      data.next_steps || '',                         // O: Next Steps
      data.capture_method || '',                     // P: Capture Method
      data.intent_level || '',                       // Q: Intent Level
      data.scenario || '',                           // R: Scenario
      data.lifecycle_stage || '',                    // S: Lifecycle Stage
      cardPhotoUrl,                                  // T: Card Photo Link
      badgePhotoUrl                                  // U: Badge Photo Link
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

// ----- Also handle GET requests (for testing the URL works) -----
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'NRB 2026 Lead Capture endpoint is live. Use POST to submit leads.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----- Save a base64 photo to Google Drive and return a view link -----
function savePhotoToDrive(base64Data, firstName, lastName, photoType) {
  try {
    // Get or create the photos folder
    var folderName = 'NRB 2026 Photos';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;

    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    // Parse the base64 data URI
    // Format: data:image/jpeg;base64,/9j/4AAQ...
    var parts = base64Data.split(',');
    var mimeMatch = parts[0].match(/data:(.*?);/);
    var mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var extension = mimeType.split('/')[1] || 'jpg';
    if (extension === 'jpeg') extension = 'jpg';

    var decoded = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(decoded, mimeType);

    // Create filename: LastName_FirstName_card_2026-02-18T14-30.jpg
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var safeName = (lastName || 'Unknown') + '_' + (firstName || 'Lead');
    safeName = safeName.replace(/[^a-zA-Z0-9_-]/g, '');
    var fileName = safeName + '_' + photoType + '_' + timestamp + '.' + extension;

    blob.setName(fileName);
    var file = folder.createFile(blob);

    // Make the file viewable by anyone with the link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();

  } catch (error) {
    Logger.log('Photo save error: ' + error.toString());
    return 'ERROR: ' + error.toString();
  }
}
