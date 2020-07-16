// テスト段階ではamazon_ordersとamazon_usersに直接入れないように
const amazonOrdersCollectionPath = "amazon_orders_test"
const amazonUsersCollectionPath = "amazon_users_test"

const getNowTimestamp = () => {
  let now = new Date()
  let isoString = now.toISOString()
  let formattedIsoString = isoString.slice(0, 19) + "Z"
  let timeStamp = encodeURIComponent(formattedIsoString)

  return timeStamp
}

const getMwsListOrdersParams = (_created_after) => {
  let timeStamp = getNowTimestamp()

  let dateObject = ""
  if (_created_after) {
    dateObject = _created_after
  } else {
    dateObject = new Date(2019, 9, 6)
  }
  let isoString = dateObject.toISOString()
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

const mwsListOrders = (_created_after) => {
  let params = getMwsListOrdersParams(_created_after)
  let json = signatureAndPost(params)

  return json
}

const mwsListOrdersByNextToken = (_nextToken) => {
  let params = getMwsListOrdersByNextTokenParams(_nextToken)
  let json = signatureAndPost(params)

  return json
}

const createAmazonOrders = () => {
  let res = mwsListOrders()

  let orders = res.listordersresponse.listordersresult.orders.order
  let nextToken = res.listordersresponse.listordersresult.nexttoken

  let ordersCount = 0
  orders.forEach(_document => firestore.createDocument(amazonOrdersCollectionPath, _document))
  ordersCount += orders.length
  notifyToSlack(`Amazon: ${ordersCount}件の注文情報を書き込みました`)

  repeatMwsListOrdersByNextToken(nextToken, ordersCount)
}

const repeatMwsListOrdersByNextToken = (_nextToken, _ordersCount) => {
  let properties = PropertiesService.getScriptProperties();
  let nextToken = ""
  let ordersCount = 0

  if (_ordersCount && _ordersCount > 0) {
    ordersCount = _ordersCount
  } else if (properties.getProperty("ordersCount")) {
    ordersCount = properties.getProperty("ordersCount")
  }

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
      orders.forEach(_document => firestore.createDocument(amazonOrdersCollectionPath, _document))
      ordersCount += orders.length
      notifyToSlack(`Amazon: ${ordersCount}件の注文情報を書き込みました`)
      if (!nextToken) break

    } else if (res.errorresponse.error.code === "RequestThrottled") {

      properties.setProperty("nextToken", nextToken)
      properties.setProperty("ordersCount", ordersCount)
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
  properties.setProperty("nextToken", "")
  properties.setProperty("ordersCount", "")
  delete_specific_triggers("repeatMwsListOrdersByNextToken");
  return;
}

const createAmazonUsers = () => {
  // 最初のオーダーからの100件取得
  let res = mwsListOrders()

  let orders = res.listordersresponse.listordersresult.orders.order
  let nextToken = res.listordersresponse.listordersresult.nexttoken
  
  // ordersを繰り返し文でfirestoreのdocument作成
  orders.forEach( _document => {
    let partOfOrders = [
      'buyeremail', 'isprime', 'lastupdatedate', 'latestshipdate', 'ordertotal', 'ordertype',
      'paymentmethoddetails', 'paymentmethod', 'purchasedate', 'saleschannel', 'shippingaddress'
    ]
    let partOfOrdersDocument = new Object()
    partOfOrders.forEach( key => partOfOrdersDocument[key]=_document[key] )
    firestore.createDocument(amazonUsersCollectionPath, partOfOrdersDocument)
  })
  notifyToSlack(`Amazon: ${orders.length}件の顧客情報を書き込みました`)

  // nextTokenがある場合に処理
  if (nextToken) repeatMwsListUsersByNextToken(nextToken, ordersCount)
}

const repeatMwsListUsersByNextToken = (_nextToken, _ordersCount) => {
  let properties = PropertiesService.getScriptProperties();
  let nextToken = ""
  let ordersCount = 0

  // _ordersCountで引数指定されていた場合にそこから代入
  if (_ordersCount && _ordersCount > 0) {
    ordersCount = _ordersCount
  // トリガーから関数動いた場合は引数が渡されてないのでPropertiesServiceから取得
  } else if (properties.getProperty("ordersCount")) {
    ordersCount = properties.getProperty("ordersCount")
  }

  // _nextTokenで引数指定されていた場合にそこから代入
  if (typeof _nextToken === "string") {
    nextToken = _nextToken
  // トリガーから関数動いた場合は引数が渡されてないのでPropertiesServiceから取得
  } else if (properties.getProperty("nextToken")) {
    nextToken = properties.getProperty("nextToken")
  }

  while (nextToken) {
    // nextTokenを用いてorders取得
    let res = mwsListOrdersByNextToken(nextToken)

    if (res.listordersbynexttokenresponse &&
      res.listordersbynexttokenresponse.listordersbynexttokenresult) {

      nextToken = res.listordersbynexttokenresponse.listordersbynexttokenresult.nexttoken

      // ordersからfirestoreのdocument作成
      let orders = res.listordersbynexttokenresponse.listordersbynexttokenresult.orders.order
      orders.forEach(_document => {
        let partOfOrders = [
          'buyeremail', 'isprime', 'lastupdatedate', 'latestshipdate', 'ordertotal', 'ordertype',
          'paymentmethoddetails', 'paymentmethod', 'purchasedate', 'saleschannel', 'shippingaddress'
        ]
        let partOfOrdersDocument = new Object()
        partOfOrders.forEach(key => partOfOrdersDocument[key] = _document[key])
        firestore.createDocument(amazonUsersCollectionPath, partOfOrdersDocument)
      })

      // slack通知
      ordersCount += orders.length
      notifyToSlack(`Amazon: ${ordersCount}件の顧客情報を書き込みました`)

      // nextTokenが存在しない場合に繰り返し処理終了
      if (!nextToken) break

    } else if (res.errorresponse.error.code === "RequestThrottled") {

      // MWSは一定以上の連続のapi使用を受け付けない仕様になっているのでそのエラーが出た場合に一時処理中止
      // PropertiesServiceで変数保存
      properties.setProperty("nextToken", nextToken)
      properties.setProperty("ordersCount", ordersCount)
      // 1分後に関数のトリガー設定
      ScriptApp.newTrigger("repeatMwsListOrdersByNextToken").timeBased().after(60 * 1000).create()
      return

    } else {
      // 何かしらのエラーで繰り返し処理終了
      if (res.errorresponse) {
        notifyToSlack(`エラーが発生しました\n${res.errorresponse.error.code}\n${res.errorresponse.error.message}`)
      } else {
        notifyToSlack("Amazonの注文取得に失敗しました")
      }
      break
    }
  }
  notifyToSlack("Amazonの顧客情報の書き込みが終了しました")

  // PropertiesService初期化
  properties.setProperty("nextToken", "")
  properties.setProperty("ordersCount", "")
  // この関数のトリガー全て削除
  delete_specific_triggers("repeatMwsListOrdersByNextToken");
  return;
}

const addAmazonOrdersAndUsers = () => {
  // mwsListOrdersをdateオブジェクトを渡すとそれ以降のordersを取得するような関数に
  // したので、楽天と同様の処理を組んでfirestoreのamazon_ordersの最新ドキュメントを取得して
  // それをdateオブジェクトに変換する
  let createdAfter = 0
  let res = mwsListOrders(createdAfter)

  let orders = res.listordersresponse.listordersresult.orders.order
  let nextToken = res.listordersresponse.listordersresult.nexttoken

  // ordersを取得して繰り返し文でordersとusersを一緒に作る
  let ordersCount = 0
  orders.forEach(_document => {
    firestore.createDocument(amazonOrdersCollectionPath, _document)

    let partOfOrders = [
      'buyeremail', 'isprime', 'lastupdatedate', 'latestshipdate', 'ordertotal', 'ordertype',
      'paymentmethoddetails', 'paymentmethod', 'purchasedate', 'saleschannel', 'shippingaddress'
    ]
    let partOfOrdersDocument = new Object()
    partOfOrders.forEach(key => partOfOrdersDocument[key] = _document[key])
    firestore.createDocument(amazonUsersCollectionPath, partOfOrdersDocument)
  })
  ordersCount += orders.length
  notifyToSlack(`Amazon: ${ordersCount}件の注文情報と顧客情報を書き込みました`)

  // repeatMwsListOrdersAndUsersByNextToken(nextToken, ordersCount)
}

// const repeatMwsListOrdersAndUsersByNextToken = (_nextToken, _ordersCount) => {
//   let properties = PropertiesService.getScriptProperties();
//   let nextToken = ""
//   let ordersCount = 0

//   // _ordersCountで引数指定されていた場合にそこから代入
//   if (_ordersCount && _ordersCount > 0) {
//     ordersCount = _ordersCount
//     // トリガーから関数動いた場合は引数が渡されてないのでPropertiesServiceから取得
//   } else if (properties.getProperty("ordersCount")) {
//     ordersCount = properties.getProperty("ordersCount")
//   }

//   // _nextTokenで引数指定されていた場合にそこから代入
//   if (typeof _nextToken === "string") {
//     nextToken = _nextToken
//     // トリガーから関数動いた場合は引数が渡されてないのでPropertiesServiceから取得
//   } else if (properties.getProperty("nextToken")) {
//     nextToken = properties.getProperty("nextToken")
//   }

//   while (nextToken) {
//     // nextTokenを用いてorders取得
//     let res = mwsListOrdersByNextToken(nextToken)

//     if (res.listordersbynexttokenresponse &&
//       res.listordersbynexttokenresponse.listordersbynexttokenresult) {

//       nextToken = res.listordersbynexttokenresponse.listordersbynexttokenresult.nexttoken

//       // ordersからfirestoreのdocument作成
//       let orders = res.listordersbynexttokenresponse.listordersbynexttokenresult.orders.order
//       orders.forEach(_document => {
//         firestore.createDocument(amazonOrdersCollectionPath, _document)

//         let partOfOrders = [
//           'buyeremail', 'isprime', 'lastupdatedate', 'latestshipdate', 'ordertotal', 'ordertype',
//           'paymentmethoddetails', 'paymentmethod', 'purchasedate', 'saleschannel', 'shippingaddress'
//         ]
//         let partOfOrdersDocument = new Object()
//         partOfOrders.forEach(key => partOfOrdersDocument[key] = _document[key])
//         firestore.createDocument(amazonUsersCollectionPath, partOfOrdersDocument)
//       })

//       // slack通知
//       ordersCount += orders.length
//       notifyToSlack(`Amazon: ${ordersCount}件の顧客情報を書き込みました`)

//       // nextTokenが存在しない場合に繰り返し処理終了
//       if (!nextToken) break

//     } else if (res.errorresponse.error.code === "RequestThrottled") {

//       // MWSは一定以上の連続のapi使用を受け付けない仕様になっているのでそのエラーが出た場合に一時処理中止
//       // PropertiesServiceで変数保存
//       properties.setProperty("nextToken", nextToken)
//       properties.setProperty("ordersCount", ordersCount)
//       // 1分後に関数のトリガー設定
//       ScriptApp.newTrigger("repeatMwsListOrdersByNextToken").timeBased().after(60 * 1000).create()
//       return

//     } else {
//       // 何かしらのエラーで繰り返し処理終了
//       if (res.errorresponse) {
//         notifyToSlack(`エラーが発生しました\n${res.errorresponse.error.code}\n${res.errorresponse.error.message}`)
//       } else {
//         notifyToSlack("Amazonの注文取得に失敗しました")
//       }
//       break
//     }
//   }
//   notifyToSlack("Amazonの顧客情報の書き込みが終了しました")

//   // PropertiesService初期化
//   properties.setProperty("nextToken", "")
//   properties.setProperty("ordersCount", "")
//   // この関数のトリガー全て削除
//   delete_specific_triggers("repeatMwsListOrdersByNextToken");
//   return;
// }
