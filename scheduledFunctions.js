const daily = () => {
  try {
    updateRakutenOrders()
  } catch(e) {
    notifyToSlack(`updateRakutenOrders: ${e.message}`)
  }
}
