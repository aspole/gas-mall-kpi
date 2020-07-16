const notifyToSlack = (_text) => {
  return
  let postUrl = "https://hooks.slack.com/services/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"

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
