const notifyToSlack = (_text) => {
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
