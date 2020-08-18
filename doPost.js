const doPost = (e) => {
  let output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    let params = JSON.parse(e.postData.contents);
    let {
      collection_name,
      data
    } = params

    let collectionPath = ""
    if (collection_name === "orders") {
      collectionPath = ecOrdersCollectionPath
    } else if (collection_name === "users") {
      collectionPath = ecUsersCollectionPath
    } else if (collection_name === "products") {
      collectionPath = ecProductsCollectionPath
    } else {
      notifyToSlack("doPost: collection_nameが存在しません")
      return
    }
    firestore.updateDocument(`${collectionPath}/${data._id}`, data)

    let payload = {
      status: 200,
      message: "success!"
    }
    output.setContent(JSON.stringify(payload));

    return output
  } catch (err) {
    notifyToSlack(`doPost: ${err.message}`)
    let payload = {
      status: 400,
      message: err.message,
    }
    output.setContent(JSON.stringify(payload));

    return output
  }
}
