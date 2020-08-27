const rakutenOrdersCollectionPath = "rakuten_orders_test"
const rakutenUsersCollectionPath = "rakuten_users_test"

const postRequestRakutenOrderApi = (_action, _data) => {
  let serviceSecret = "SP375474_fcLsqwX2OcVfcsyK"
  let licenseKey = "SL375474_a3ntmwGeE5tNEIOZ"
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

  let res = UrlFetchApp.fetch(path, options)

  return JSON.parse(res)
}

const getOrder = (_orderNumberList) => {
  let limitArrayLength = 100
  let arrayList = []
  while (_orderNumberList.length > 0) {
    arrayList.push(_orderNumberList.splice(0, limitArrayLength))
  }

  let orders = []
  for (let i = 0; i < arrayList.length; i++) {
    let data = {
      "orderNumberList": arrayList[i]
    }

    let { OrderModelList } = postRequestRakutenOrderApi("getOrder", data)
    orders = [...orders, ...OrderModelList]
  }

  return orders
}

const searchOrderByMonth = (_year, _month) => {
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
      "requestRecordsAmount": 1000,
      "requestPage": 1
    }
  }

  let res = postRequestRakutenOrderApi("searchOrder", options)

  return res
}

const getOrderByMonth = (_year, _month) => {
  let { orderNumberList } = searchOrderByMonth(_year, _month)
  let orders = getOrder(orderNumberList)

  return orders
}

const createRakutenOrders = () => {
  let firstMonth = {
    year: 19,
    month: 9
  }

  // 今までの月の配列作成
  let today = new Date()
  let thisYear = today.getFullYear() - 2000
  let thisMonth = today.getMonth()

  let months = [firstMonth]

  let {
    year,
    month
  } = firstMonth

  while (year < thisYear || month <= thisMonth) {
    if (month === 12) {
      year += 1
      month = 1
      months.push({
        year: year,
        month: 1
      })
    } else {
      month += 1
      months.push({
        year,
        month
      })
    }
  }

  let ordersCount = 0
  // 月ごとにデータ取得してfirestoreに反映
  months.forEach(_month => {
    let orders = getOrderByMonth(_month.year, _month.month)

    orders.forEach(_order => firestore.createDocument(rakutenOrdersCollectionPath, _order))
    ordersCount += orders.length
    notifyToSlack(`楽天: ${ordersCount}件の注文情報を書き込みました`)
  })
  notifyToSlack("楽天の注文情報の書き込みが終了しました")
}

const createRakutenUsers = () => {
  notifyToSlack("楽天のユーザー情報の書き込みを開始します")
  let firstMonth = {
    year: 19,
    month: 9
  }

  // 今までの月の配列作成
  let today = new Date()
  let thisYear = today.getFullYear() - 2000
  let thisMonth = today.getMonth()

  let months = [firstMonth]

  let {
    year,
    month
  } = firstMonth

  while (year < thisYear || month <= thisMonth) {
    if (month === 12) {
      year += 1
      month = 1
      months.push({
        year: year,
        month: 1
      })
    } else {
      month += 1
      months.push({
        year,
        month
      })
    }
  }

  // 月ごとにデータ取得してfirestoreに反映
  months.forEach(_month => {
    let orders = getOrderByMonth(_month.year, _month.month)
    orders.forEach(_order => firestore.createDocument(rakutenUsersCollectionPath, _order['OrdererModel']))
    notifyToSlack(`楽天: ${orders.length}件のユーザー情報を書き込みました`)
  })
  notifyToSlack("楽天のユーザー情報の書き込みが終了しました")
}

const createRakutenOrdersAndUsers = () => {
  notifyToSlack("楽天の情報の書き込みを開始します")
  let start_time = new Date()

  let firstMonth = {
    year: 19,
    month: 9
  }

  // 今までの月の配列作成
  let today = new Date()
  let thisYear = today.getFullYear() - 2000
  let thisMonth = today.getMonth()

  let monthes = [firstMonth]

  let {
    year,
    month
  } = firstMonth

  while (year < thisYear || month <= thisMonth) {
    if (month === 12) {
      year += 1
      month = 1
      monthes.push({
        year: year,
        month: 1
      })
    } else {
      month += 1
      monthes.push({
        year,
        month
      })
    }
  }

  let properties = PropertiesService.getScriptProperties()

  let ordersCount = 0
  let ordersCountProp = properties.getProperty("createRakutenOrdersAndUsers/ordersCount")
  if (ordersCountProp) ordersCount = parseInt(ordersCountProp)

  let monthesIndex = 0
  let monthesIndexProp = properties.getProperty("createRakutenOrdersAndUsers/monthesIndex")
  if (monthesIndexProp) monthesIndex = parseInt(monthesIndexProp)

  for (monthesIndex; monthesIndex < monthes.length; monthesIndex++) {
    let current_time = new Date()
    let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
    if (difference >= 5) {
      properties.setProperty("createRakutenOrdersAndUsers/ordersCount", ordersCount);
      properties.setProperty("createRakutenOrdersAndUsers/monthesIndex", monthesIndex);
      ScriptApp.newTrigger("createRakutenOrdersAndUsers").timeBased().after(60 * 1000).create()
      return
    }

    // 月ごとにデータ取得してfirestoreに反映
    let _month = monthes[monthesIndex]
    let orders = getOrderByMonth(_month.year, _month.month)

    orders.forEach(_order => {
      firestore.createDocument(rakutenOrdersCollectionPath, _order)
      firestore.createDocument(rakutenUsersCollectionPath, _order['OrdererModel'])
    })
    ordersCount += orders.length
    notifyToSlack(`楽天: ${ordersCount}件の注文情報と顧客情報を書き込みました`)
  }
  notifyToSlack("楽天の情報の書き込みが終了しました")

  properties.setProperty("createRakutenOrdersAndUsers/ordersCount", "")
  properties.setProperty("createRakutenOrdersAndUsers/monthesIndex", "")
  delete_specific_triggers("createRakutenOrdersAndUsers")
}

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

    let options = {
      "dateType": 1,
      "startDatetime": `${startYear}-${startMonth}-${startDate}T${startHour}:${startMinutes}:${startSeconds}+0900`,
      "endDatetime": `${endYear}-${endMonth}-${endDate}T00:00:00+0900`,
      "PaginationRequestModel": {
        "requestRecordsAmount": 1000,
        "requestPage": 1
      }
    }

    // firestoreの最新のドキュメントから当日0時までの注文情報取得
    let res = postRequestRakutenOrderApi("searchOrder", options)

    // startDatetimeの重複分の情報は必ず1つ返ってくるので配列が2つ以上の長さの時に処理
    if (res.orderNumberList && res.orderNumberList.length > 1) {
      // 配列の最初の要素を削除
      let orders = getOrder(res.orderNumberList)
      orders = orders.filter(_order => _order.orderNumber !== docData.orderNumber.stringValue)
      orders.forEach(_order => {
        firestore.createDocument(rakutenOrdersCollectionPath, _order)
        firestore.createDocument(rakutenUsersCollectionPath, _order['OrdererModel'])
      })
      notifyToSlack(`楽天: ${orders.length}件の注文情報と顧客情報を書き込みました`)
    } else {
      notifyToSlack("楽天: 新規注文はありませんでした")
    }
    return
  } catch (e) {
    notifyToSlack(`addRakutenOrdersAndUsers: ${e.message}`)
    return
  }
}
