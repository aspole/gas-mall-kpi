const ecOrdersCollectionPath = "ec_orders"
const ecUsersCollectionPath = "ec_users"
const ecProductsCollectionPath = "ec_products"
const ngrok = null

// ec_ordersを0から作成する関数
const createEcOrders = () => {
  createEcOrdersDocuments("createEcOrders")
  return
}

// firestoreのec_orderのcreated_dateが最新のもの以降のEC上のデータを
// firestoreに反映する関数
const addEcOrders = () => {
  createEcOrdersDocuments("addEcOrders")
  return
}

// firestoreのec_orderのupdated_dateが最新のもの以降のEC上のデータを
// firestoreに反映する関数
const updateEcOrders = (_value) => {
  updateEcOrdersDocuments(_value)
  return
}

// ec_usersを0から作成する関数
const createEcUsers = () => {
  createEcUsersDocuments("createEcUsers")
  return
}

// firestoreのec_usersのcreated_dateが最新のもの以降のEC上のデータを
// firestoreに反映する関数
const addEcUsers = () => {
  createEcUsersDocuments("addEcUsers")
  return
}

// firestoreのec_orderのupdated_dateが最新のもの以降のEC上のデータを
// firestoreに反映する関数
const updateEcUsers = () => {
  updateEcUsersDocuments()
  return
}

// ec_productsを0から作成する関数
const createEcProducts = () => {
  let searchParams = {}
  let res = importEcProducts(searchParams)

  if (res.status === 200) {
    let products = res.data
    products.forEach(_document => fsCreateOrUpdateDocument(`${ecProductsCollectionPath}/${_document._id}`, _document))
  }
}

/**
 * 以下は関数化して整理してるだけなので基本触らない
 */
const postEcApi = (_payload, _action) => {
  let options = {
    "method": "post"
  };
  if (_payload) options["payload"] = { searchParams: JSON.stringify(_payload) }

  let test = ngrok
  let url = (test || "https://tential.jp") + "/api/v1/gas/"

  let res = UrlFetchApp.fetch(`${url}${_action}`, options);
  res = JSON.parse(res)

  return res
}

const importEcOrders = (_payload) => {
  let res = postEcApi(_payload, "export_orders")
  return res
}

const importEcUsers = (_payload) => {
  let res = postEcApi(_payload, "export_users")
  return res
}

const importEcProducts = (_payload) => {
  let res = postEcApi(_payload, "export_products")
  return res
}

const countEcOrders = (_payload) => {
  let res = postEcApi(_payload, "order_count")
  return res
}

const getUnixTime = (_year, _month, _date) => {
  const dateObj = new Date(_year, _month - 1, _date)
  const unix = dateObj.getTime() / 1000
  return unix
}

const createEcOrdersDocuments = async (_function_name, _searchParams) => {
  try {
    notifyToSlack("EC: 注文情報の書き込みを開始します")
    delete_specific_triggers("createEcOrdersDocuments")
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let searchParamsProps = properties.getProperty("createEcOrdersDocuments/searchParams")
    if (_function_name === "addEcOrders") {
      let documents = firestore.query("ec_orders").OrderBy("created_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["created_date"] = docData.created_date.integerValue
    } else if (_searchParams && _searchParams.searchParams) {
      searchParams = _searchParams.searchParams
    } else if (searchParamsProps) {
      searchParams = JSON.parse(searchParamsProps)
    } else {
      throw new Error("unexpected error has occurred on searchParams")
    }

    let ordersCount = 0
    let successCount = 0
    let ordersCountProp = properties.getProperty("createEcOrdersDocuments/ordersCount")
    let successCountProp = properties.getProperty("createEcOrdersDocuments/successCount")
    if (ordersCountProp) ordersCount = parseInt(ordersCountProp)
    if (successCountProp) successCount = parseInt(successCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 4) {
        notifyToSlack(`EC: 注文情報を更新しました (成功:${successCount}件, 失敗:${ordersCount - successCount}件)`)
        properties.setProperty("createEcOrdersDocuments/ordersCount", ordersCount);
        properties.setProperty("createEcOrdersDocuments/successCount", successCount);
        ScriptApp.newTrigger("createEcOrdersDocuments").timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcOrders(searchParams)

      if (res.status === 200) {
        let orders = res.data.list
        orders.forEach(_document => {
          try {
            let firestoreResponse = fsCreateOrUpdateDocument(`${ecOrdersCollectionPath}/${_document._id}`, _document)
            if (firestoreResponse.status === "success") {
              successCount++
            } else if (firestoreResponse.status === "error") {
              throw new Error(firestoreResponse.message)
            } else {
              throw new Error("unknown error occurred on update")
            }
          } catch (e) {
            console.log(e.message)
            console.log(_document)
            let orderId = _document._id
            let text = `【ECエラー注文】\n`
            text += `ID: ${orderId}(https://tential.jp/admin/orders/${orderId} )\n`
            text += `メッセージ: ${e.message}`
            notifyToSlack(text)
          }
        })

        let lastOrder = orders[orders.length - 1]
        searchParams["created_date"] = parseInt(lastOrder.created_date) + 1
        properties.setProperty("createEcOrdersDocuments/searchParams", JSON.stringify(searchParams))

        ordersCount += orders.length

        let date = new Date(lastOrder.created_date * 1000)
        console.log(`${date.toLocaleString("ja")}まで${ordersCount}件`)

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack("createEcOrdersDocuments: response failed")
        break
      }
    }
    if (ordersCount >= 1) {
      notifyToSlack(`EC: 注文情報の書き込みを終了します (成功:${successCount}件, 失敗:${ordersCount - successCount}件)`)
    } else {
      notifyToSlack("EC: 新規の注文情報はありません")
    }

    properties.setProperty("createEcOrdersDocuments/ordersCount", "")
    properties.setProperty("createEcOrdersDocuments/successCount", "")
    properties.setProperty("createEcOrdersDocuments/searchParams", "")
    delete_specific_triggers("createEcOrdersDocuments")
    return
  } catch (e) {
    notifyToSlack(`createEcOrdersDocuments: ${e.message}`)
    return
  }
}

const updateEcOrdersDocuments = async (_searchParams) => {
  try {
    notifyToSlack("EC: 注文情報の更新を開始します")
    delete_specific_triggers("updateEcOrdersDocuments")
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let searchParamsProps = properties.getProperty("updateEcOrdersDocuments/searchParams")
    if (_searchParams && _searchParams.searchParams) {
      searchParams = _searchParams.searchParams
    } else if (!searchParamsProps) {
      let documents = firestore.query("ec_orders").OrderBy("updated_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["updated_date"] = parseInt(docData.updated_date.integerValue)
    } else if (searchParamsProps) {
      searchParams = JSON.parse(searchParamsProps)
    } else {
      throw new Error("unexpected error has occurred on searchParams")
    }

    let ordersCount = 0
    let successCount = 0
    let ordersCountProp = properties.getProperty("updateEcOrdersDocuments/ordersCount")
    let successCountProp = properties.getProperty("updateEcOrdersDocuments/successCount")
    if (ordersCountProp) ordersCount = parseInt(ordersCountProp)
    if (successCountProp) successCount = parseInt(successCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 4) {
        notifyToSlack(`EC: 注文情報を更新しました (成功:${successCount}件, 失敗:${ordersCount - successCount}件)`)
        properties.setProperty("updateEcOrdersDocuments/ordersCount", ordersCount);
        properties.setProperty("updateEcOrdersDocuments/successCount", successCount);
        ScriptApp.newTrigger("updateEcOrdersDocuments").timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcOrders(searchParams)

      if (res.status === 200) {
        let orders = res.data.list
        orders.forEach(_document => {
          try {
            let firestoreResponse = fsCreateOrUpdateDocument(`${ecOrdersCollectionPath}/${_document._id}`, _document)
            if (firestoreResponse.status === "success") {
              successCount++
            } else if (firestoreResponse.status === "error") {
              throw new Error(firestoreResponse.message)
            } else {
              throw new Error("unknown error occurred on update")
            }
          } catch (e) {
            console.log(e.message)
            console.log(_document)
            let orderId = _document._id
            let text = `【ECエラー注文】\n`
            text += `ID: ${orderId}(https://tential.jp/admin/orders/${orderId} )\n`
            text += `メッセージ: ${e.message}`
            notifyToSlack(text)
          }
        })

        let lastOrder = orders[orders.length - 1]
        searchParams["updated_date"] = parseInt(lastOrder.updated_date) + 1
        properties.setProperty("updateEcOrdersDocuments/searchParams", JSON.stringify(searchParams))

        ordersCount += orders.length

        let date = new Date(lastOrder.updated_date * 1000)
        console.log(`${date.toLocaleString("ja")}まで${ordersCount}件`)

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack("updateEcOrdersDocuments: response failed")
        break
      }
    }
    if (ordersCount >= 1) {
      notifyToSlack(`EC: 注文情報の更新を終了します (成功:${successCount}件, 失敗:${ordersCount - successCount}件)`)
    } else {
      notifyToSlack("EC: 新規の注文情報の更新はありません")
    }

    properties.setProperty("updateEcOrdersDocuments/ordersCount", "")
    properties.setProperty("updateEcOrdersDocuments/successCount", "")
    properties.setProperty("updateEcOrdersDocuments/searchParams", "")
    delete_specific_triggers("updateEcOrdersDocuments")
    return
  } catch (e) {
    notifyToSlack(`updateEcOrdersDocuments: ${e.message}`)
    return
  }
}

const createEcUsersDocuments = (_function_name, _searchParams) => {
  try {
    notifyToSlack("EC: 顧客情報の書き込みを開始します")
    delete_specific_triggers("createEcUsersDocuments")
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let createdDateProp = properties.getProperty("createEcUsersDocuments/searchParams")
    if (_function_name === "addEcUsers") {
      let documents = firestore.query("ec_users").OrderBy("created_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["created_date"] = docData.created_date.integerValue
    } else if (_searchParams && _searchParams.searchParams) {
      searchParams = _searchParams.searchParams
    } else if (createdDateProp) {
      searchParams = JSON.parse(createdDateProp)
    } else {
      throw new Error("unexpected error has occurred on searchParams")
    }


    let usersCount = 0
    let successCount = 0
    let usersCountProp = properties.getProperty("createEcUsersDocuments/usersCount")
    let successCountProp = properties.getProperty("createEcUsersDocuments/successCount")
    if (usersCountProp) usersCount = parseInt(usersCountProp)
    if (successCountProp) successCount = parseInt(successCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 4) {
        notifyToSlack(`EC: 顧客情報を更新しました (成功:${successCount}件, 失敗:${usersCount - successCount}件)`)
        properties.setProperty("createEcUsersDocuments/usersCount", usersCount);
        properties.setProperty("createEcUsersDocuments/successCount", successCount);
        ScriptApp.newTrigger("createEcUsersDocuments").timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcUsers(searchParams)

      if (res.status === 200) {
        let users = res.data.list
        users.forEach(_document => {
          try {
            let firestoreResponse = fsCreateOrUpdateDocument(`${ecUsersCollectionPath}/${_document._id}`, _document)
            if (firestoreResponse.status === "success") {
              successCount++
            } else if (firestoreResponse.status === "error") {
              throw new Error(firestoreResponse.message)
            } else {
              throw new Error("unknown error occurred on update")
            }
          } catch (e) {
            console.log(e.message)
            console.log(_document)
            let userId = _document._id
            let text = `【ECエラーユーザー】\n`
            text += `ID: ${userId}(https://tential.jp/admin/users/${userId} )\n`
            text += `メッセージ: ${e.message}`
            notifyToSlack(text)
          }
        })

        let lastUser = users[users.length - 1]
        searchParams["created_date"] = parseInt(lastUser.created_date) + 1
        properties.setProperty("createEcUsersDocuments/searchParams", JSON.stringify(searchParams))

        usersCount += users.length

        let date = new Date(lastUser.created_date * 1000)
        console.log(`${date}まで${usersCount}件`)

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack("createEcUsersDocuments: response failed")
        break
      }
    }
    if (usersCount >= 1) {
      notifyToSlack(`EC: ${usersCount}件の顧客情報の書き込みを終了します (成功:${successCount}件, 失敗:${usersCount - successCount}件)`)
    } else {
      notifyToSlack("EC: 新規の顧客情報はありません")
    }

    properties.setProperty("createEcUsersDocuments/usersCount", "")
    properties.setProperty("createEcUsersDocuments/successCount", "")
    properties.setProperty("createEcUsersDocuments/searchParams", "")
    delete_specific_triggers("createEcUsersDocuments")
    return
  } catch (e) {
    notifyToSlack(`${_function_name}: ${e.message}`)
    return
  }
}

const updateEcUsersDocuments = async (_searchParams) => {
  try {
    notifyToSlack("EC: 顧客情報の更新を開始します")
    delete_specific_triggers("updateEcUsersDocuments")
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let searchParamsProps = properties.getProperty("updateEcUsersDocuments/searchParams")
    if (_searchParams && _searchParams.searchParams) {
      searchParams = _searchParams.searchParams
    } else if (!searchParamsProps) {
      let documents = firestore.query("ec_users").OrderBy("updated_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["updated_date"] = parseInt(docData.updated_date.integerValue)
    } else if (searchParamsProps) {
      searchParams = JSON.parse(searchParamsProps)
    } else {
      throw new Error("unexpected error has occurred on searchParams")
    }

    let usersCount = 0
    let successCount = 0
    let usersCountProp = properties.getProperty("updateUserssDocuments/usersCount")
    let successCountProp = properties.getProperty("updateUserssDocuments/successCount")
    if (usersCountProp) usersCount = parseInt(usersCountProp)
    if (successCountProp) successCount = parseInt(successCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 4) {
        notifyToSlack(`EC: 顧客情報を更新しました (成功:${successCount}件, 失敗:${usersCount - successCount}件)`)
        properties.setProperty("updateEcUsersDocuments/usersCount", usersCount);
        properties.setProperty("updateEcUsersDocuments/successCount", successCount);
        ScriptApp.newTrigger("updateEcUsersDocuments").timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcUsers(searchParams)

      if (res.status === 200) {
        let users = res.data.list
        users.forEach(_document => {
          try {
            const firestoreResponse = fsCreateOrUpdateDocument(`${ecUsersCollectionPath}/${_document._id}`, _document)
            if (firestoreResponse.status === "success") {
              successCount++
            } else if (firestoreResponse.status === "error") {
              throw new Error(firestoreResponse.message)
            } else {
              throw new Error("unknown error occurred on update")
            }
          } catch (e) {
            console.log(e.message)
            console.log(_document)
            let userId = _document._id
            let text = `【ECエラーユーザー】\n`
            text += `ID: ${userId}(https://tential.jp/admin/orders/${userId} )\n`
            text += `メッセージ: ${e.message}`
            notifyToSlack(text)
          }
        })

        let lastUser = users[users.length - 1]
        searchParams["updated_date"] = parseInt(lastUser.updated_date) + 1
        properties.setProperty("updateEcUsersDocuments/updatedDate", searchParams)

        usersCount += users.length

        let date = new Date(lastUser.created_date * 1000)
        console.log(`${date.toLocaleString("ja")}まで${usersCount}件`)

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack("updateEcUsersDocuments: response failed")
        break
      }
    }
    if (usersCount >= 1) {
      notifyToSlack(`EC: 顧客情報を更新を終了します (成功:${successCount}件, 失敗:${usersCount - successCount}件)`)
    } else {
      notifyToSlack("EC: 新規の顧客情報の更新はありません")
    }

    properties.setProperty("updateEcUsersDocuments/usersCount", "")
    properties.setProperty("updateEcUsersDocuments/updatedDate", "")
    properties.setProperty("updateEcUsersDocuments/searchParams", "")
    delete_specific_triggers("updateEcUsersDocuments")
    return
  } catch (e) {
    notifyToSlack(`updateEcUsersDocuments: ${e.message}`)
    return
  }
}

const createLackOrders = async () => {
  // 以下変数を任意で入力
  const year = 2020
  let month = 6
  // ここまで

  month -= 1
  const startDate = new Date(year, month, 1)
  const startUnix = startDate.getTime() / 1000
  const endDate = new Date(year, month + 1, 1)
  const endUnix = endDate.getTime() / 1000

  const searchParams = {
    created_date: startUnix,
    created_date_end: endUnix
  }

  createEcOrdersDocuments("createLackOrders", { searchParams })
}

const createLackUsers = async () => {
  try {
    // 以下変数を任意で入力
    const year = 2020
    let month = 8
    // ここまで

    month -= 1
    const startDate = new Date(year, month, 1)
    const startUnix = startDate.getTime() / 1000
    const endDate = new Date(year, month + 1, 1)
    const endUnix = endDate.getTime() / 1000

    const searchParams = {
      created_date: startUnix,
      created_date_end: endUnix
    }

    createEcUsersDocuments("createLackUsers", { searchParams })
  } catch (e) {
    console.log(e)
  }
}

const compareEcAndFirestore = async () => {
  const startYear = 2020
  const startMonth = 8
  const startDate = 1

  const endYear = 2020
  const endMonth = 8
  const endDate = 31

  const formatMonth = (_month) => {
    if (_month === 1) {
      return 11
    } else {
      return _month - 1
    }
  }

  let start = new Date(startYear, formatMonth(startMonth), startDate)
  start = start.getTime() / 1000

  let end = new Date(endYear, formatMonth(endMonth), endDate + 1)
  end = end.getTime() / 1000

  const res = countEcOrders({
    created_date: start,
    created_date_end: end
  })
  if (res.status !== 200) throw new Error("compareEcAndFirestore: error on ec api")

  const firestoreOrders = await firestore
    .query("ec_orders")
    .Where("created_date", ">=", start)
    .Where("created_date", "<", end)
    .Execute()

  console.log(`${startYear}年${startMonth}月${startDate}日から${endYear}年${endMonth}月${endDate}日まで`)
  console.log(`EC側: ${res.data}件`)
  console.log(`firestore側: ${firestoreOrders.length}件`)
}

const compareEcAndFirestoreByMonth = async (_year, _month) => {
  const formatMonth = (_month) => {
    if (_month === 1) {
      return 11
    } else {
      return _month - 1
    }
  }

  if (!_year || !_month) {
    let now = new Date
    _year = now.getFullYear()
    _month = now.getMonth() + 1
  }

  let start = new Date(_year, formatMonth(_month), 1)
  start = start.getTime() / 1000

  let end = new Date(_year, formatMonth(_month + 1), 1)
  end = end.getTime() / 1000

  const res = countEcOrders({
    created_date: start,
    created_date_end: end
  })
  if (res.status !== 200) throw new Error("compareEcAndFirestore: error on ec api")

  const firestoreOrders = await firestore
    .query("ec_orders")
    .Where("created_date", ">=", start)
    .Where("created_date", "<", end)
    .Execute()

  console.log("-----------------------------")
  console.log(`${_year}年${_month}月`)
  console.log(`EC側: ${res.data}件`)
  console.log(`firestore側: ${firestoreOrders.length}件`)
}
