const postEcApi = (_payload, _action) => {
  let options = {
    "method": "post"
  };
  if (_payload) options["payload"] = _payload

  let url = "https://db406db4d74e.ngrok.io/api/v1/gas/"

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

const createDocumentsEcAllOrders = () => {
  let start_time = new Date()
  let properties = PropertiesService.getScriptProperties()

  let searchParams = {}
  let created_date = properties.getProperty("createDocumentsEcAllOrders/created_date")
  if (created_date) searchParams["created_date"] = created_date

  let ordersCount = 0
  if (properties.getProperty("createDocumentsEcAllOrders/ordersCount")) ordersCount = parseInt(properties.getProperty("createDocumentsEcAllOrders/ordersCount"))

  let next = true
  while (next) {
    let current_time = new Date()
    let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
    if (difference >= 5) {
      properties.setProperty("createDocumentsEcAllOrders/created_date", searchParams["created_date"]);
      properties.setProperty("createDocumentsEcAllOrders/ordersCount", ordersCount);
      ScriptApp.newTrigger("createDocumentsEcAllOrders").timeBased().after(60 * 1000).create()
      return
    }

    let res = importEcOrders(searchParams)

    if (res.status === 200) {
      let orders = res.data.list
      orders.forEach(_document => firestore.createDocument("ec_orders", _document))
      ordersCount += orders.length
      notifyToSlack(`EC: ${ordersCount}件の注文情報を書き込みました`)

      next = res.data.next
      if (!next) break

      let lastOrder = orders[orders.length - 1]
      searchParams["created_date"] = lastOrder.created_date
    } else {
      break
    }
  }
  notifyToSlack("ECの注文情報の書き込みが終了しました")

  properties.setProperty("createDocumentsEcAllOrders/created_date", "")
  properties.setProperty("createDocumentsEcAllOrders/ordersCount", 0)
  delete_specific_triggers("createDocumentsEcAllOrders")
  return
}

const createDocumentsEcAllUsers = () => {
  let start_time = new Date()
  let properties = PropertiesService.getScriptProperties()

  let searchParams = {}
  let created_date = properties.getProperty("createDocumentsEcAllUsers/created_date")
  if (created_date) searchParams["created_date"] = created_date

  let usersCount = 0
  if (properties.getProperty("createDocumentsEcAllUsers/usersCount")) usersCount = parseInt(properties.getProperty("createDocumentsEcAllUsers/usersCount"))

  let next = true
  while (next) {
    let current_time = new Date()
    let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
    if (difference >= 5) {
      properties.setProperty("createDocumentsEcAllUsers/created_date", searchParams["created_date"]);
      properties.setProperty("createDocumentsEcAllUsers/usersCount", usersCount);
      ScriptApp.newTrigger("createDocumentsEcAllUsers").timeBased().after(60 * 1000).create()
      return
    }

    let res = importEcUsers(searchParams)

    if (res.status === 200) {
      let orders = res.data.list
      orders.forEach(_document => firestore.createDocument("ec_users", _document))
      usersCount += orders.length
      notifyToSlack(`EC: ${usersCount}件のユーザー情報を書き込みました`)

      next = res.data.next
      if (!next) break

      let lastOrder = orders[orders.length - 1]
      searchParams["created_date"] = lastOrder.created_date
    } else {
      break
    }
  }
  notifyToSlack("ECのユーザー情報の書き込みが終了しました")

  properties.setProperty("createDocumentsEcAllUsers/created_date", "")
  properties.setProperty("createDocumentsEcAllUsers/usersCount", 0)
  delete_specific_triggers("createDocumentsEcAllUsers")
  return
}

const createDocumentsEcAllProducts = () => {
  let searchParams = {}
  let res = importEcProducts(searchParams)

  if (res.status === 200) {
    let products = res.data
    products.forEach(_document => firestore.createDocument("ec_products_test", _document))
  }
}

const updateProductDocument = () => {
  let firestoreProducts = firestore.getDocuments("ec_products_test")
  let searchParams = {}
  let res = importEcProducts(searchParams)

  let ecProducts = []
  if (res.status === 200) {
    ecProducts = res.data
  } else {
    return
  }

  firestoreProducts.forEach(_firestore_product => {
    let fsProductData = documentData(_firestore_product)
    let ecProductData = ecProducts.find(_ec_product => _ec_product._id === fsProductData._id.stringValue)

    if (parseInt(fsProductData.updated_date.integerValue) !== ecProductData.updated_date) {
      let id = documentId(_firestore_product)
      firestore.updateDocument(id, ecProductData)
    }
  })
}
