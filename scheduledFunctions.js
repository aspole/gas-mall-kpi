const daily = () => {
  Promise.all([
    addRakutenOrdersAndUsers(),
    addEcOrders(),
    addEcUsers(),
    updateEcProducts()
  ]).catch(e => {
    notifyToSlack(`Error: ${e.message}`)
  })
}