const ecOrdersCollectionPath = "ec_orders"
const ecUsersCollectionPath = "ec_users"

const postEcApi = (_payload, _action) => {
  let options = {
    "method": "post"
  };
  if (_payload) options["payload"] = _payload

  let url = "https://tential.jp/api/v1/gas/"

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

const createEcOrdersDocuments = async (_function_name) => {
  try {
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let createdDateProp = properties.getProperty(`${_function_name}/createdDate`)
    if (_function_name === "addEcOrders" && !createdDateProp) {
      let documents = firestore.query("ec_orders").OrderBy("created_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["created_date"] = docData.created_date.integerValue
    } else if (createdDateProp) searchParams["created_date"] = createdDateProp

    let ordersCount = 0
    let ordersCountProp = properties.getProperty(`${_function_name}/ordersCount`)
    if (ordersCountProp) ordersCount = parseInt(ordersCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 5) {
        properties.setProperty(`${_function_name}/ordersCount`, ordersCount);
        ScriptApp.newTrigger(_function_name).timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcOrders(searchParams)

      if (res.status === 200) {
        let orders = res.data.list
        orders.forEach(_document => firestore.createDocument(ecOrdersCollectionPath, _document))

        let lastOrder = orders[orders.length - 1]
        searchParams["created_date"] = lastOrder.created_date
        properties.setProperty(`${_function_name}/createdDate`, lastOrder.created_date)

        ordersCount += orders.length
        let dateTime = new Date(lastOrder.created_date * 1000);

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack(`${_function_name}: response failed`)
        break
      }
    }
    notifyToSlack(`EC: ${ordersCount}件の注文情報を書き込みました`)

    properties.setProperty(`${_function_name}/ordersCount`, "")
    properties.setProperty(`${_function_name}/createdDate`, "")
    delete_specific_triggers(_function_name)
    return
  } catch (e) {
    notifyToSlack(`${_function_name}: ${e.message}`)
    return
  }
}

const createEcUsersDocuments = async (_function_name) => {
  try {
    let start_time = new Date()
    let properties = PropertiesService.getScriptProperties()

    let searchParams = {}
    let createdDateProp = properties.getProperty(`${_function_name}/createdDate`)
    if (_function_name === "addEcUsers" && !createdDateProp) {
      let documents = firestore.query("ec_users").OrderBy("created_date", "desc").Limit(1).Execute()
      let docData = documentData(documents[0])
      searchParams["created_date"] = docData.created_date.integerValue
    } else if (createdDateProp) searchParams["created_date"] = createdDateProp

    let usersCount = 0
    let usersCountProp = properties.getProperty(`${_function_name}/usersCount`)
    if (usersCountProp) usersCount = parseInt(usersCountProp)

    let next = true
    while (next) {
      let current_time = new Date()
      let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
      if (difference >= 5) {
        properties.setProperty(`${_function_name}/usersCount`, usersCount);
        ScriptApp.newTrigger(_function_name).timeBased().after(60 * 1000).create()
        return
      }

      let res = importEcUsers(searchParams)

      if (res.status === 200) {
        let users = res.data.list
        users.forEach(_document => firestore.createDocument(ecUsersCollectionPath, _document))

        let lastUser = users[users.length - 1]
        searchParams["created_date"] = lastUser.created_date
        properties.setProperty(`${_function_name}/createdDate`, lastUser.created_date)

        usersCount += users.length
        let dateTime = new Date(lastUser.created_date * 1000);

        next = res.data.next
        if (!next) break
      } else {
        notifyToSlack(`${_function_name}: response failed`)
        break
      }
    }
    notifyToSlack(`EC: ${usersCount}件の顧客情報を書き込みました`)
  
    properties.setProperty(`${ _function_name } / usersCount`, 0)
    properties.setProperty(`${ _function_name } / createdDate`, "")
    delete_specific_triggers("createDocumentsEcAllUsers")
    return
  } catch (e) {
    notifyToSlack(`${ _function_name }: ${ e.message }`)
    return
  }
}

const createEcOrders = async () => {
  await createEcOrdersDocuments("createEcOrders")
  return
}

const addEcOrders = async () => {
  await createEcOrdersDocuments("addEcOrders")
  return
}

const createEcUsers = async () => {
  await createEcUsersDocuments("createEcUsers")
  return
}

const addEcUsers = async () => {
  await createEcUsersDocuments("addEcUsers")
  return
}

const createEcProducts = () => {
  let searchParams = {}
  let res = importEcProducts(searchParams)

  if (res.status === 200) {
    let products = res.data
    products.forEach(_document => firestore.createDocument("ec_products", _document))
  }
}

const updateEcProducts = async () => {
  try {
    let firestoreProducts = firestore.getDocuments("ec_products")
    let searchParams = {}
    let res = importEcProducts(searchParams)

    let ecProducts = []
    if (res.status === 200) {
      ecProducts = res.data
    } else {
      notifyToSlack(`Error: response failed`)
      return
    }

    let productsCount = 0
    firestoreProducts.forEach(_firestore_product => {
      let fsProductData = documentData(_firestore_product)
      let ecProductData = ecProducts.find(_ec_product => _ec_product._id === fsProductData._id.stringValue)

      if (parseInt(fsProductData.updated_date.integerValue) !== ecProductData.updated_date) {
        productsCount += 1
        let id = documentId(_firestore_product)
        firestore.updateDocument(id, ecProductData)
      }
    })
    if (productsCount >= 1) notifyToSlack(`EC: ${ productsCount }件の商品情報を更新しました`)
  } catch (e) {
    notifyToSlack(`updateEcProducts: ${ e.message }`)
    return
  }
}
