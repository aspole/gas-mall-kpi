const importEcOrders = (_payload) => {
  let options = {
    "method": "post"
  };
  if(_payload) options["payload"] = _payload
  
  let url = "https://7a0580450966.ngrok.io/api/v1/gas/"

  let res = UrlFetchApp.fetch(`${url}export_orders`, options);
  res = JSON.parse(res)

  return res
}

const getAllEcOrders = () => {
  let start_time = new Date()
  let properties = PropertiesService.getScriptProperties()
  let created_date = properties.getProperty("getAllEcOrders/created_date")

  let searchParams = {}
  if (created_date) searchParams["created_date"] = created_date

  let next = true
  while(next) {
    let current_time = new Date()
    let difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));
    if (difference >= 5) {
      properties.setProperty("getAllEcOrders/created_date", searchParams["created_date"]);
      ScriptApp.newTrigger("getAllEcOrders").timeBased().after(60 * 1000).create()
      return
    }

    let res = importEcOrders(searchParams)
  
    if(res.status === 200) {
      let orders = res.data.list
      orders.forEach(_document => firestore.createDocument("tential-db/orders/ec", _document))
      notifyToSlack(`EC: ${orders.length}件の注文情報を書き込みました`)
      
      next = res.data.next
      if (!next) break
      
      let lastOrder = orders[orders.length - 1]
      searchParams["created_date"] = lastOrder.created_date
    } else {
      break
    }
  }
  notifyToSlack("ECの注文情報の書き込みが終了しました")

  properties.setProperty("getAllEcOrders/created_date", "")
  delete_specific_triggers("getAllEcOrders")
  return
}
