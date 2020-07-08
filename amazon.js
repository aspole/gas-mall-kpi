const getNowTimestamp = () => {
  let now = new Date()
  let isoString = now.toISOString()
  let formattedIsoString = isoString.slice(0, 19) + "Z"
  let timeStamp = encodeURIComponent(formattedIsoString)

  return timeStamp
}

const getMwsListOrdersParams = (_year, _month, _day) => {
  let timeStamp = getNowTimestamp()
  let createdAfterTimeStamp = new Date(_year, _month - 1, _day)
  let isoString = createdAfterTimeStamp.toISOString()
  let formattedIsoString = isoString.slice(0, 19) + "Z"
  let createdAfter = encodeURIComponent(formattedIsoString)

  let params = {
    "AWSAccessKeyId": "AKIAIMXVXSH3DZ6DW4NQ",
    "Action": "ListOrders",
    "CreatedAfter": createdAfter,
    "MarketplaceId.Id.1": "A1VC38T7YXB528",
    "SellerId": "AJY991MQ0IEWZ",
    "SignatureMethod": "HmacSHA256",
    "SignatureVersion": 2,
    "Timestamp": timeStamp,
    "Version": "2013-09-01"
  }

  return params
}

const getMwsListOrdersByNextTokenParams = (_nextToken) => {
  let timeStamp = getNowTimestamp()

  let params = {
    "AWSAccessKeyId": "AKIAIMXVXSH3DZ6DW4NQ",
    "Action": "ListOrdersByNextToken",
    "NextToken": encodeURIComponent(_nextToken),
    "SellerId": "AJY991MQ0IEWZ",
    "SignatureMethod": "HmacSHA256",
    "SignatureVersion": 2,
    "Timestamp": timeStamp,
    "Version": "2013-09-01"
  }

  return params
}

const convertParamsToQueryString = (_params) => {
  let queryString = ""
  for (let property in _params) {
    queryString += `${property}=${_params[property]}&`
  }

  return queryString.slice(0, -1)
}

const calculateSignature = (_params) => {
  let httpVerb = "POST"
  let hostHeader = "mws.amazonservices.jp"
  let httpRequestUrl = "/Orders/2013-09-01"
  let queryString = convertParamsToQueryString(_params)

  let stringToSign =
    httpVerb + "\n" +
    hostHeader + "\n" +
    httpRequestUrl + "\n" +
    queryString
  let secretKey = "/W2pGsWpQ0qei98mOG4W2LQkJUabmeLC/nD/hg/+"

  let sha256Hmac = Utilities.computeHmacSha256Signature(stringToSign, secretKey)
  let base64Hmac = Utilities.base64Encode(sha256Hmac)

  return base64Hmac
}

const signatureAndPost = (_params) => {
  let signature = calculateSignature(_params)
  _params["Signature"] = encodeURIComponent(signature)
  let queryString = convertParamsToQueryString(_params)

  let postUrl = "https://mws.amazonservices.jp/Orders/2013-09-01?" + queryString

  let headers = {
    "Content-Type": "text/xml",
  }

  let options = {
    "method": "POST",
    "headers": headers,
    "muteHttpExceptions": true
  }

  let response = UrlFetchApp.fetch(postUrl, options)

  let json = xml2json.parser(response.toString())

  return json
}

const mwsListOrders = (_year, _month, _day = 1) => {
  let params = getMwsListOrdersParams(_year, _month, _day)
  let json = signatureAndPost(params)

  return json
}

const mwsListOrdersByNextToken = (_nextToken) => {
  let params = getMwsListOrdersByNextTokenParams(_nextToken)
  let json = signatureAndPost(params)

  return json
}

const ordersAmazonCollectionPath = "tential-db/orders/amazon"

const repeatMwsListOrdersByNextToken = (_nextToken) => {
  let properties = PropertiesService.getScriptProperties();
  let nextToken = ""
  if (typeof _nextToken === "string") {
    nextToken = _nextToken
  } else if (properties.getProperty("nextToken")) {
    nextToken = properties.getProperty("nextToken")
  }

  while (nextToken) {
    let res = mwsListOrdersByNextToken(nextToken)

    if (res.listordersbynexttokenresponse &&
        res.listordersbynexttokenresponse.listordersbynexttokenresult) {

      nextToken = res.listordersbynexttokenresponse.listordersbynexttokenresult.nexttoken
      let orders = res.listordersbynexttokenresponse.listordersbynexttokenresult.orders.order
      orders.forEach(_document => firestore.createDocument(ordersAmazonCollectionPath, _document))
      notifyToSlack(`Amazon: ${orders.length}件の注文情報を書き込みました`)
      if(!nextToken) break

    } else if (res.errorresponse.error.code === "RequestThrottled"){

      properties.setProperty("nextToken", nextToken)
      ScriptApp.newTrigger("repeatMwsListOrdersByNextToken").timeBased().after(60 * 1000).create()
      return

    } else {
      if (res.errorresponse) {
        notifyToSlack(`エラーが発生しました\n${res.errorresponse.error.code}\n${res.errorresponse.error.message}`)
      } else {
        notifyToSlack("Amazonの注文取得に失敗しました")
      }
      break
    }
  }
  notifyToSlack("Amazonの注文情報の書き込みが終了しました")
  properties.setProperty("nextToken", "");
  delete_specific_triggers("repeatMwsListOrdersByNextToken");
  return;
}

const delete_specific_triggers = (name_function) => {
  var all_triggers = ScriptApp.getProjectTriggers();

  for (var i = 0; i < all_triggers.length; ++i) {
    if (all_triggers[i].getHandlerFunction() == name_function)
      ScriptApp.deleteTrigger(all_triggers[i]);
  }
}

const createDocumentsAmazonAllOrders = () => {
  const firstOrderDate = {
    year: 2019,
    month: 10,
    day: 6
  }

  let res = mwsListOrders(
    firstOrderDate.year,
    firstOrderDate.month,
    firstOrderDate.day
  )

  let orders = res.listordersresponse.listordersresult.orders.order
  let nextToken = res.listordersresponse.listordersresult.nexttoken

  orders.forEach(_document => firestore.createDocument(ordersAmazonCollectionPath, _document))
  notifyToSlack(`Amazon: ${orders.length}件の注文情報を書き込みました`)

  repeatMwsListOrdersByNextToken(nextToken)
}

//ここからお願いします

const createDocumentsAmazonOrders = () => {
  const firstOrderDate = {
    year: 2019,
    month: 10,
    day: 6
  }

  let res = mwsListOrders(
    firstOrderDate.year,
    firstOrderDate.month,
    firstOrderDate.day
  )

  let orders = res.listordersresponse.listordersresult.orders.order
  let nextToken = res.listordersresponse.listordersresult.nexttoken
  
  console.log(orders)

  orders.forEach(_document => firestore.createDocument("amazon_test", _document))
  notifyToSlack(`Amazon: ${orders.length}件の注文情報を書き込みました`)
}