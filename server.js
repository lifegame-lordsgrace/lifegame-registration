const bodyParser = require("body-parser");
const express = require("express");
const multer = require("multer");

const app = express();
// for photo upload from frontend
const upload = multer();

let google = require('googleapis');
let privatekey = require("./gapi_cred.json");

// configure a JWT auth client
let jwtClient = new google.auth.JWT(
  privatekey.client_email,
  null,
  privatekey.private_key,
  ['https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets']
);

//authenticate request
jwtClient.authorize(function (err, tokens) {
  if (err) {
    console.log(err);
    return;
  } else {
    console.log("Successfully connected!");
  }
});

//Google Drive API
let drive = google.drive('v3');
//Google Sheets API
let sheets = google.sheets('v4');

app.set("port", process.env.PORT || 3001);
app.use(bodyParser.json());

// Express only serves static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

app.post("/api/form", (req, res) => {
  console.log(req.body);
  // This will print the following result:
  //{ chineseName: 'asdf',
  //  englishFirstName: '',
  //  englishLastName: '',
  //  gender: null,
  //  age: null,
  //  marriageStatus: null,
  //  religionStatus: null }
  // TODO: validate on the backend side and write to google sheet

  var resourceValues = {
    "majorDimension": "ROWS",
    values: [
      [
        req.body.chineseName,
        req.body.englishFirstName + ' ' + req.body.englishLastName,
        req.body.gender,
        req.body.age,
        req.body.marriageStatus,
        req.body.religionStatus
      ]
    ]
  };
  sheets.spreadsheets.values.append({
    // TODO: pass through env ID of the V2 registration spreadsheet.
    spreadsheetId: '1X1r0K361bimHJxLwudLj8VO6zf_soJGPV9_lbvjxTR8',
    // The A1 notation of a range to search for a logical table of data.
    // Values will be appended after the last row of the table.
    range: 'Sheet1!A1',
    // How the input data should be interpreted.
    valueInputOption: 'USER_ENTERED',
    // How the input data should be inserted.
    insertDataOption: 'INSERT_ROWS',
    auth: jwtClient,
    resource: resourceValues
  }, function(err, response) {
    if (err) {
      console.error(err);
      return;
    }

    console.log(JSON.stringify(response, null, 2));
  });

  // TODO upon successful submission, rename the file and move the image to private drive folder
  // TODO how do we propagate file id from the previous post
  /**
  val renameValue = {'title': req.body.englishFirstName + ' ' + req.body.englishLastName + '.jpeg'}
  drive.files.patch({
    fileId: fileId,
    resource: renameValue
  }, function (err, file) {
    if (err) {
      // Handle error
    } else {
      // File moved.
    }
  });
  drive.files.update({
      fileId: fileId,
      addParents: folderId,
      removeParents: ['19GNdcJOJxhKQZYJefNkNt0LiR95d_tN_'],
      fields: 'id, parents'
    }, function (err, file) {
      if (err) {
        // Handle error
      } else {
        // File moved.
      }
    });
  **/
});

app.post("/api/photo", upload.single("avatar"), (req, res) => {
  console.log(req.file);
  // This will print the following result:
  //{ fieldname: 'avatar',
  //  originalname: 'test.jpg',
  //  encoding: '7bit',
  //  mimetype: 'application/jpg',
  //  buffer: <Buffer 25 50 44 46 2d 31 2e 33 0a 25 c4 e5 f2 e5 eb a7 f3 a0 d0 c4 c6 0a 34 20 30 20 6f 62 6a 0a 3c 3c 20 2f 4c 65 6e 67 74 68 20 35 20 30 20 52 20 2f 46 69 ... >,
  //  size: 155923 }
  // TODO: validate on the backend, upload to google photo, and return the
  // public url or the tokens  to construct a url to frontend to render the
  // uploaded image.

  const fileMetadata = {
    name: req.file.originalname,
    // TODO pass through env ID of the Google Drive folder for all photo uploads
    parents: ['19GNdcJOJxhKQZYJefNkNt0LiR95d_tN_']
  };

  const media = {
    mimeType: 'image/jpeg',
    body: req.file.buffer
  };

  drive.files.create({
    auth: jwtClient,
    resource: fileMetadata,
    media,
    fields: 'id'
  }, (err, file) => {
    if (err) {
      console.log(err);
      return;
    }
    // Log the id of the new file on Drive
    console.log('Uploaded File Id: ', file.id);
    var previewurl = 'https://drive.google.com/uc?id=' + file.id;
    res.json({url: previewurl});
  });
});

app.listen(app.get("port"), () => {
  console.log(`Find the server at: http://localhost:${app.get("port")}/`); // eslint-disable-line no-console
});
