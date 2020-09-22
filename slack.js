const notifyToSlack = (_text) => {
  console.log(_text)
  
  let postUrl = slackPostUrl

  let json = {
    "text": _text
  };

  let options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(json)
  };

  UrlFetchApp.fetch(postUrl, options);
}
