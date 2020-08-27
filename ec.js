const ecOrdersCollectionPath = "ec_orders"
const ecUsersCollectionPath = "ec_users"
const ecProductsCollectionPath = "ec_products"

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
const updateEcOrders = () => {
  updateEcOrdersDocuments()
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
  if (_payload) options["payload"] = _payload

  let test = "https://d0ae6333d405.ngrok.io"
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

const getOneDayAgoUnix = () => {
  let newDate = new Date();
  let year = newDate.getFullYear();
  let month = newDate.getMonth();
  let date = newDate.getDate();
  let zeroOClock = new Date(year, month, date).getTime()
  let oneDayAgo = zeroOClock - 24 * 60 * 60 * 1000
  newDate.setTime(oneDayAgo)

  return newDate.getTime() / 1000
}

const createEcOrdersDocuments = async (_function_name) => {
  try {
    notifyToSlack("EC: 注文情報の書き込みを開始します")
    delete_specific_triggers("createEcOrdersDocuments")
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let createdDateProp = properties.getProperty("createEcOrdersDocuments/createdDate")
    if (_function_name === "addEcOrders" && !createdDateProp) {
      let documents = firestore.query("ec_orders").OrderBy("created_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["created_date"] = docData.created_date.integerValue
    } else if (createdDateProp) searchParams["created_date"] = createdDateProp

    let ordersCount = 0
    let ordersCountProp = properties.getProperty("createEcOrdersDocuments/ordersCount")
    if (ordersCountProp) ordersCount = parseInt(ordersCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 4) {
        notifyToSlack(`EC: ${ordersCount}件の注文情報を書き込みました`)
        properties.setProperty("createEcOrdersDocuments/ordersCount", ordersCount);
        ScriptApp.newTrigger("createEcOrdersDocuments").timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcOrders(searchParams)

      if (res.status === 200) {
        let orders = res.data.list
        orders.forEach(_document => fsCreateOrUpdateDocument(`${ecOrdersCollectionPath}/${_document._id}`, _document))

        let lastOrder = orders[orders.length - 1]
        searchParams["created_date"] = lastOrder.created_date
        properties.setProperty("createEcOrdersDocuments/createdDate", lastOrder.created_date)

        ordersCount += orders.length
        console.log(ordersCount)

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack("createEcOrdersDocuments: response failed")
        break
      }
    }
    if (ordersCount >= 1) {
      notifyToSlack(`EC: ${ordersCount}件の注文情報を書き込みました`)
    } else {
      notifyToSlack("EC: 新規の注文情報はありません")
    }

    notifyToSlack("EC: 注文情報の書き込みを終了します")
    properties.setProperty("createEcOrdersDocuments/ordersCount", "")
    properties.setProperty("createEcOrdersDocuments/createdDate", "")
    delete_specific_triggers("createEcOrdersDocuments")
    return
  } catch (e) {
    notifyToSlack(`createEcOrdersDocuments: ${e.message}`)
    return
  }
}

const updateEcOrdersDocuments = async () => {
  try {
    notifyToSlack("EC: 注文情報の更新を開始します")
    delete_specific_triggers("updateEcOrdersDocuments")
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let updatedDateProp = properties.getProperty("updateEcOrdersDocuments/updatedDate")
    if (!updatedDateProp) {
      let documents = firestore.query("ec_orders").OrderBy("updated_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["updated_date"] = docData.updated_date.integerValue
    } else searchParams["updated_date"] = updatedDateProp

    let ordersCount = 0
    let ordersCountProp = properties.getProperty("updateEcOrdersDocuments/ordersCount")
    if (ordersCountProp) ordersCount = parseInt(ordersCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 4) {
        notifyToSlack(`EC: ${ordersCount}件の注文情報を更新しました`)
        properties.setProperty("updateEcOrdersDocuments/ordersCount", ordersCount);
        ScriptApp.newTrigger("updateEcOrdersDocuments").timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcOrders(searchParams)

      if (res.status === 200) {
        let orders = res.data.list
        orders.forEach(_document => fsCreateOrUpdateDocument(`${ecOrdersCollectionPath}/${_document._id}`, _document))

        let lastOrder = orders[orders.length - 1]
        searchParams["updated_date"] = lastOrder.updated_date
        properties.setProperty("updateEcOrdersDocuments/updatedDate", lastOrder.updated_date)

        ordersCount += orders.length
        console.log(ordersCount)

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack("updateEcOrdersDocuments: response failed")
        break
      }
    }
    if (ordersCount >= 1) {
      notifyToSlack(`EC: ${ordersCount}件の注文情報を更新しました`)
    } else {
      notifyToSlack("EC: 新規の注文情報の更新はありません")
    }

    notifyToSlack("EC: 注文情報の更新を終了します")
    properties.setProperty("updateEcOrdersDocuments/ordersCount", "")
    properties.setProperty("updateEcOrdersDocuments/updatedDate", "")
    delete_specific_triggers("updateEcOrdersDocuments")
    return
  } catch (e) {
    notifyToSlack(`updateEcOrdersDocuments: ${e.message}`)
    return
  }
}

const createEcUsersDocuments = (_function_name) => {
  try {
    notifyToSlack("EC: 顧客情報の書き込みを開始します")
    delete_specific_triggers("createEcUsersDocuments")
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let createdDateProp = properties.getProperty("createEcUsersDocuments/createdDate")
    if (_function_name === "addEcUsers" && !createdDateProp) {
      let documents = firestore.query("ec_users").OrderBy("created_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["created_date"] = docData.created_date.integerValue
    } else if (createdDateProp) searchParams["created_date"] = createdDateProp

    let usersCount = 0
    let usersCountProp = properties.getProperty("createEcUsersDocuments/usersCount")
    if (usersCountProp) usersCount = parseInt(usersCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 4) {
        notifyToSlack(`EC: ${usersCount}件の顧客情報を書き込みました`)
        properties.setProperty("createEcUsersDocuments/usersCount", usersCount);
        ScriptApp.newTrigger("createEcUsersDocuments").timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcUsers(searchParams)

      if (res.status === 200) {
        let users = res.data.list
        users.forEach(_document => fsCreateOrUpdateDocument(`${ecUsersCollectionPath}/${_document._id}`, _document))

        let lastUser = users[users.length - 1]
        searchParams["created_date"] = lastUser.created_date
        properties.setProperty("createEcUsersDocuments/createdDate", lastUser.created_date)

        usersCount += users.length
        console.log(usersCount)

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack("createEcUsersDocuments: response failed")
        break
      }
    }
    if (usersCount >= 1) {
      notifyToSlack(`EC: ${usersCount}件の顧客情報を書き込みました`)
    } else {
      notifyToSlack("EC: 新規の顧客情報はありません")
    }

    notifyToSlack("EC: 顧客情報の書き込みを終了します")
    properties.setProperty("createEcUsersDocuments/usersCount", "")
    properties.setProperty("createEcUsersDocuments/createdDate", "")
    delete_specific_triggers("createEcUsersDocuments")
    return
  } catch (e) {
    notifyToSlack(`${_function_name}: ${e.message}`)
    return
  }
}

const updateEcUsersDocuments = async () => {
  try {
    notifyToSlack("EC: 顧客情報の更新を開始します")
    delete_specific_triggers("updateEcUsersDocuments")
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let updatedDateProp = properties.getProperty("updateEcUsersDocuments/updatedDate")
    if (!updatedDateProp) {
      let documents = firestore.query("ec_users").OrderBy("updated_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["updated_date"] = docData.updated_date.integerValue
    } else searchParams["updated_date"] = updatedDateProp

    let usersCount = 0
    let usersCountProp = properties.getProperty("updateEcUsersDocuments/usersCount")
    if (usersCountProp) usersCount = parseInt(usersCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 4) {
        notifyToSlack(`EC: ${usersCount}件の顧客情報を更新しました`)
        properties.setProperty("updateEcUsersDocuments/usersCount", usersCount);
        ScriptApp.newTrigger("updateEcUsersDocuments").timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcUsers(searchParams)

      if (res.status === 200) {
        let users = res.data.list
        users.forEach(_document => fsCreateOrUpdateDocument(`${ecUsersCollectionPath}/${_document._id}`, _document))

        let lastOrder = users[users.length - 1]
        searchParams["updated_date"] = lastOrder.updated_date
        properties.setProperty("updateEcUsersDocuments/updatedDate", lastOrder.updated_date)

        usersCount += users.length
        console.log(usersCount)

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack("updateEcUsersDocuments: response failed")
        break
      }
    }
    if (usersCount >= 1) {
      notifyToSlack(`EC: ${usersCount}件の顧客情報を更新しました`)
    } else {
      notifyToSlack("EC: 新規の顧客情報の更新はありません")
    }

    notifyToSlack("EC: 顧客情報の更新を終了します")
    properties.setProperty("updateEcUsersDocuments/usersCount", "")
    properties.setProperty("updateEcUsersDocuments/updatedDate", "")
    delete_specific_triggers("updateEcUsersDocuments")
    return
  } catch (e) {
    notifyToSlack(`updateEcUsersDocuments: ${e.message}`)
    return
  }
}
