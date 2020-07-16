const daily = () => {
  try {
    addRakutenOrders()
    addEcOrders()
  } catch(e) {
    notifyToSlack(`updateRakutenOrders: ${e.message}`)
  }
}
