const rakutenOrdersCollectionPath = "rakuten_orders"
const rakutenUsersCollectionPath = "rakuten_users"
const serviceSecret = "SP375474_fcLsqwX2OcVfcsyK"
const licenseKey = "SL375474_T1MoSQUzuBn8T73X"
const requestRecordsAmountLimit = 100

// // rakuten_ordersとrakuten_usersを0から作る関数
// const createRakutenCollections = () => {
//   createRakutenOrdersAndUsers()
//   return
// }

// rakuten_ordersとrakuten_usersの新規レコードを作成する関数
const addRakutenDocuments = () => {
  addRakutenOrdersAndUsers()
  return
}

/**
 * 以下は関数化して整理してるだけなので基本触らない
 */
const postRequestRakutenOrderApi = (_action, _data) => {
  let auth = Utilities.base64Encode(`${serviceSecret}:${licenseKey}`)
  let header = {
    "Authorization": `ESA ${auth}`,
    "Content-Type": "application/json; charset=utf-8"
  }

  let options = {
    "method": "POST",
    "headers": header,
    "payload": JSON.stringify(_data),
    "muteHttpExceptions": true
  };

  let path = `https://api.rms.rakuten.co.jp/es/2.0/order/${_action}/`

  console.log(options)

  let res = UrlFetchApp.fetch(path, options)

  console.log(JSON.parse(res))

  return JSON.parse(res)
}

const getOrder = (_orderNumberList) => {
  // let limitArrayLength = 100
  // let arrayList = []
  // while (_orderNumberList.length > 0) {
  //   arrayList.push(_orderNumberList.splice(0, limitArrayLength))
  // }

  // let orders = []
  // for (let i = 0; i < arrayList.length; i++) {
  let data = {
    "orderNumberList": _orderNumberList
  }

  let { OrderModelList } = postRequestRakutenOrderApi("getOrder", data)
  // }

  return OrderModelList
}

const searchOrderByMonth = (_year, _month, _request_page) => {
  let startMonth, endMonth,
    startYear = _year,
    endYear = _year

  if (_month <= 8) {
    startMonth = `0${_month}`
    endMonth = `0${_month + 1}`
  } else if (_month === 9) {
    startMonth = "09"
    endMonth = "10"
  } else if (_month === 12) {
    startMonth = _month
    endMonth = 1
    endYear = _year + 1
  } else {
    startMonth = _month
    endMonth = _month + 1
  }

  let options = {
    "dateType": 1,
    "startDatetime": `20${startYear}-${startMonth}-01T00:00:01+0900`,
    "endDatetime": `20${endYear}-${endMonth}-01T00:00:00+0900`,
    "PaginationRequestModel": {
      "requestRecordsAmount": requestRecordsAmountLimit,
      "requestPage": _request_page
    }
  }

  let res = postRequestRakutenOrderApi("searchOrder", options)

  return res
}

const getOrderByMonth = (_year, _month) => {
  let orders = []
  let requestPage = 1
  do {
    var { orderNumberList } = searchOrderByMonth(_year, _month, requestPage)
    requestPage ++
    getOrders = getOrder(orderNumberList)
    orders.concat(orderNumberList)
  } while( orderNumberList.length === requestRecordsAmountLimit);

  return orders
}

// const createRakutenOrders = () => {
//   let firstMonth = {
//     year: 19,
//     month: 9
//   }

//   // 今までの月の配列作成
//   let today = new Date()
//   let thisYear = today.getFullYear() - 2000
//   let thisMonth = today.getMonth()

//   let months = [firstMonth]

//   let {
//     year,
//     month
//   } = firstMonth

//   while (year < thisYear || month <= thisMonth) {
//     if (month === 12) {
//       year += 1
//       month = 1
//       months.push({
//         year: year,
//         month: 1
//       })
//     } else {
//       month += 1
//       months.push({
//         year,
//         month
//       })
//     }
//   }

//   let ordersCount = 0
//   // 月ごとにデータ取得してfirestoreに反映
//   months.forEach(_month => {
//     let orders = getOrderByMonth(_month.year, _month.month)

//     orders.forEach(_order => firestore.createDocument(rakutenOrdersCollectionPath, _order))
//     ordersCount += orders.length
//     notifyToSlack(`楽天: ${ordersCount}件の注文情報を書き込みました`)
//   })
//   notifyToSlack("楽天の注文情報の書き込みが終了しました")
// }

// const createRakutenUsers = () => {
//   notifyToSlack("楽天のユーザー情報の書き込みを開始します")
//   let firstMonth = {
//     year: 19,
//     month: 9
//   }

//   // 今までの月の配列作成
//   let today = new Date()
//   let thisYear = today.getFullYear() - 2000
//   let thisMonth = today.getMonth()

//   let months = [firstMonth]

//   let {
//     year,
//     month
//   } = firstMonth

//   while (year < thisYear || month <= thisMonth) {
//     if (month === 12) {
//       year += 1
//       month = 1
//       months.push({
//         year: year,
//         month: 1
//       })
//     } else {
//       month += 1
//       months.push({
//         year,
//         month
//       })
//     }
//   }

//   // 月ごとにデータ取得してfirestoreに反映
//   months.forEach(_month => {
//     let orders = getOrderByMonth(_month.year, _month.month)
//     orders.forEach(_order => firestore.createDocument(rakutenUsersCollectionPath, _order['OrdererModel']))
//     notifyToSlack(`楽天: ${orders.length}件のユーザー情報を書き込みました`)
//   })
//   notifyToSlack("楽天のユーザー情報の書き込みが終了しました")
// }

// const createRakutenOrdersAndUsers = () => {
//   notifyToSlack("楽天の情報の書き込みを開始します")
//   let start_time = new Date()

//   let firstMonth = {
//     year: 20,
//     month: 10
//   }

//   // 今までの月の配列作成
//   let today = new Date()
//   let thisYear = today.getFullYear() - 2000
//   let thisMonth = today.getMonth()

//   let monthes = [firstMonth]

//   let {
//     year,
//     month
//   } = firstMonth

//   while (year < thisYear || month <= thisMonth) {
//     if (month === 12) {
//       year += 1
//       month = 1
//       monthes.push({
//         year: year,
//         month: 1
//       })
//     } else {
//       month += 1
//       monthes.push({
//         year,
//         month
//       })
//     }
//   }

//   let properties = PropertiesService.getScriptProperties()

//   let ordersCount = 0
//   let ordersCountProp = properties.getProperty("createRakutenOrdersAndUsers/ordersCount")
//   if (ordersCountProp) ordersCount = parseInt(ordersCountProp)

//   let monthesIndex = 0
//   let monthesIndexProp = properties.getProperty("createRakutenOrdersAndUsers/monthesIndex")
//   if (monthesIndexProp) monthesIndex = parseInt(monthesIndexProp)

//   let requestPage = 1
//   let requestPageProp = properties.getProperty("createRakutenOrdersAndUsers/requestPage")
//   if (requestPageProp) requestPage = parseInt(requestPageProp)

//   const sleep = (_start_time, _orders_count, _monthes_count, _request_page) => {
//     let currentTime = new Date()
//     let difference = parseInt((currentTime.getTime() - _start_time.getTime()) / (1000 * 60));
//     if (difference >= 4) {
//       properties.setProperty("createRakutenOrdersAndUsers/ordersCount", _orders_count);
//       properties.setProperty("createRakutenOrdersAndUsers/monthesIndex", _monthes_count);
//       properties.setProperty("createRakutenOrdersAndUsers/requestPage", _request_page);
//       ScriptApp.newTrigger("createRakutenOrdersAndUsers").timeBased().after(10 * 1000).create()
//       notifyToSlack(`楽天: ${_orders_count}件の注文情報と顧客情報を書き込みました`)
//       return true
//     } else {
//       return false
//     }
//   }

//   for (monthesIndex; monthesIndex < monthes.length; monthesIndex++) {
//     let isSleep = sleep(start_time, ordersCount, monthesIndex, 1)
//     if(isSleep) return

//     // 月ごとにデータ取得してfirestoreに反映
//     let _month = monthes[monthesIndex]

//     do {
//       isSleep = sleep(start_time, ordersCount, monthesIndex, requestPage)
//       if(isSleep) return

//       let { orderNumberList } = searchOrderByMonth(_month.year, _month.month, requestPage)
//       requestPage ++
//       var orders = getOrder(orderNumberList)
//       orders.forEach(_order => {
//         fsCreateOrUpdateDocument(`${rakutenOrdersCollectionPath}/${_order.orderNumber}`, _order)
//         fsCreateOrUpdateDocument(`${rakutenUsersCollectionPath}/${_order.OrdererModel.emailAddress}`, _order.OrdererModel)
//       })
//       ordersCount += orders.length
//     } while( orders.length === requestRecordsAmountLimit);

//     requestPage = 1

//     notifyToSlack(`楽天: ${_month.year}年${_month.month}月まで${ordersCount}件の注文情報と顧客情報を書き込みました`)
//   }
//   notifyToSlack("楽天の情報の書き込みが終了しました")

//   properties.setProperty("createRakutenOrdersAndUsers/ordersCount", "")
//   properties.setProperty("createRakutenOrdersAndUsers/monthesIndex", "")
//   delete_specific_triggers("createRakutenOrdersAndUsers")
// }

const addRakutenOrdersAndUsers = () => {
  try {
    // firestoreからorderDatetimeの降順に1つドキュメント取得
    let documents = firestore.query("rakuten_orders").OrderBy("orderDatetime", "desc").Limit(1).Execute()
    let docData = documentData(documents[0])
    let JstDateTime = docData.orderDatetime.stringValue

    // 文字列から必要な時間情報だけ抽出
    let startYear = JstDateTime.slice(0, 4)
    let startMonth = JstDateTime.slice(5, 7)
    let startDate = JstDateTime.slice(8, 10)
    let startHour = JstDateTime.slice(11, 13)
    let startMinutes = JstDateTime.slice(14, 16)
    let startSeconds = JstDateTime.slice(17, 19)

    // 毎日0~1時のトリガーで発火する想定なので、当日0時までの期間を指定
    let now = new Date()
    let endYear = now.getFullYear()
    let endMonth = now.getMonth() + 1
    let endDate = now.getDate()

    options = {
      "dateType": 1,
      "startDatetime": `${startYear}-${startMonth}-${startDate}T${startHour}:${startMinutes}:${startSeconds}+0900`,
      "endDatetime": `${endYear}-${endMonth}-${endDate}T00:00:00+0900`,
      "PaginationRequestModel": {
        "requestRecordsAmount": requestRecordsAmountLimit,
        "requestPage": 1
      }
    }

    rakutenOrdersAndUsersDocuments({ options })
  } catch (e) {
    notifyToSlack(`addRakutenOrdersAndUsers: ${e.message}`)
    return
  }
}

const rakutenOrdersAndUsersDocuments = (_options) => {
  const startTime = new Date()
  const properties = PropertiesService.getScriptProperties()

  let ordersCount = 0
  let ordersCountProp = properties.getProperty("rakutenOrdersAndUsersDocuments/ordersCount")
  if (ordersCountProp) ordersCount = parseInt(ordersCountProp)

  let options = {}
  let optionsProp = properties.getProperty("rakutenOrdersAndUsersDocuments/options")
  if (_options.options) {
    options = _options.options
  } else if(optionsProp) {
    options = JSON.parse(optionsProp)
  } else {
    notifyToSlack("楽天: 更新処理を終了します")
    return
  }

  let requestPage = 0
  let totalPages = 0
  do {
    let currentTime = new Date()
    let difference = parseInt((currentTime.getTime() - startTime.getTime()) / (1000 * 60));

    if (difference >= 4) {
      properties.setProperty("rakutenOrdersAndUsersDocuments/options", JSON.stringify(options));
      properties.setProperty("rakutenOrdersAndUsersDocuments/ordersCount", ordersCount);
      delete_specific_triggers("rakutenOrdersAndUsersDocuments")
      ScriptApp.newTrigger("rakutenOrdersAndUsersDocuments").timeBased().after(10 * 1000).create()
      notifyToSlack(`楽天: ${ordersCount}件の注文情報と顧客情報を書き込みました`)
      return
    }

    // firestoreの最新のドキュメントから当日0時までの注文情報取得
    let res = postRequestRakutenOrderApi("searchOrder", options)
    
    if(res.Results && res.Results.errorCode === "ES01-01") {
      notifyToSlack("楽天: <!channel> lisenceKeyを更新して下さい\nhttps://www.notion.so/tential/RMS-API-licenseKey-ed371c8de3a3424784685738cc159d14")
      return
    }

    requestPage = res.PaginationResponseModel.requestPage
    totalPages = res.PaginationResponseModel.totalPages

    // startDatetimeの重複分の情報は必ず1つ返ってくるので配列が2つ以上の長さの時に処理
    if (res.orderNumberList && res.orderNumberList.length > 0) {
      // 元々firestoreに含まれていたレコードを削除
      let orders = getOrder(res.orderNumberList)

      orders.forEach(_order => {
        fsCreateOrUpdateDocument(`${rakutenOrdersCollectionPath}/${_order.orderNumber}`, _order)
        fsCreateOrUpdateDocument(`${rakutenUsersCollectionPath}/${_order.OrdererModel.emailAddress}`, _order.OrdererModel)
      })
      ordersCount += orders.length

      options.PaginationRequestModel.requestPage ++
    } else {
      properties.setProperty("rakutenOrdersAndUsersDocuments/ordersCount", 0)
      delete_specific_triggers("rakutenOrdersAndUsersDocuments")
      notifyToSlack("楽天: 新規注文はありませんでした")
      return
    }
  } while( requestPage < totalPages)

  notifyToSlack(`楽天: ${ordersCount}件の注文情報と顧客情報を書き込みました`)

  properties.setProperty("rakutenOrdersAndUsersDocuments/ordersCount", "")
  properties.setProperty("rakutenOrdersAndUsersDocuments/options", "")
  delete_specific_triggers("rakutenOrdersAndUsersDocuments")
}