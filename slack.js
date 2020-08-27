const notifyToSlack = (_text) => {
  let postUrl = slackPostUrl

  let json = {
    "text": _text
  };

  let options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(json)
  };

  console.log(_text)
  UrlFetchApp.fetch(postUrl, options);
}
