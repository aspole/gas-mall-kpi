// firestore library URL https://github.com/grahamearley/FirestoreGoogleAppsScript

const firestoreCredentials = {
  type: "service_account",
  project_id: "tential-db",
  private_key_id: "064e0efc014192c345d758f059440189cf22c301",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDD0rn7KKcpeMvT\nH++lh5VODy8w7AVAWlYnVHX42PKtoxVd2XI3tIXPy4WvJ5zGTF8cXFcORoSUy64y\nFWC74QYk9fubOe6aWD1wcuXBDo9EYQDTnr/jw15JK+KeLcIvw8NHgpH9UMK+CffH\nqee9SFgSU+Fpea0xD2G9rYXi1ouC58mxbVfSAInTMmjsvKWcVmUkhgb6P4XI+mEl\nCJeQDRJKdFG0eLTDepM3YAvlMfz5CUPXN44GgBLcxgLAReh8dZjS5r7O/1j0Asji\n91afJxwD9s/DeEilfvDWyjGNRl1kY0qVF+0DNQ0jCSwmyMgkl6Wp0XL6Jc1EzXKr\nf9AfdG7xAgMBAAECggEAVWRWgp4LKwwIgePayomRw4zejMxXS+U4zYTIvv/H74z+\nu8KfSohXk7IR9TvmYxiZnxHrSofYt9QL/b4RxUwOtF5p3hpIoJibDiakZuf09KIC\nTMXcsrMWsfzHoSeeFtsclFntVJP7oAhTuwctzX43HaLjWG3dZtfozOBW0oCxLJ8o\nkRxh1IjBlKWirGgKmWyaaEc8FOe7pOgRyYRnyDZD3SrQydd4Q7HMUz75qn7UM6Uu\n8Ca5nlBmwMzVBFdIqn2mzlzuCJusaNiy/aHAgtbnGWYWXaXPn42mIqpDAfTmoqED\nf1jyXIIhxFl/EqTJ1JbT4g2XeefWFXBuBSJLoAf0owKBgQDn+W+3tSO8ITdVcmXh\nTJUpp1RS4WUt7zS7KDMkbSb9welJunV2TUINPJIshv7EbemoTT47Wxe6H5SVomb3\nPpHo07Mhb9IF4sMA1k6nYmMzNJmWYsyVClT46gti/Zt5shvhHC925uinZVeEkVOo\nqJP1cwcP6KYjC+qpNbgRTRKtSwKBgQDYGscRjzCe1V3WVg7YQaBnUzQJy4ENMfyE\nfmNzSHefAN3tR/BHh7OLfim0O2YuECXHW4EDVIMwItYV2lcFeG9D1ymmbqd8cFAJ\na55Cx7pmuhQryVvWBxEj6L8h3ds6steKphCSjCQRKEROwvyXfjG32N0s+OptqSB1\nCXEnFT8bMwKBgQDLqUEeJphjGT59dFxh+1ySH2h3A5BTTcob7uVHu9UZwN9SbbOm\n05mECYPEOBkA2AbmTjqu3gDs1cEbxmNj+rkbkpGYb5YSuM2/tGeFqWmykSGu2LsI\ntvN3PfQVStbvdyHm91nsqDnmjaDSsMykLK0KN50hqH4EEvhI6vLZrbMSFQKBgQCe\n0/dxQWNDqZ/BExjv+jPRHQbHGCmuMAneuyGOrjk0xKdXaKMBf4wHPt+Z1no/6qBJ\niEgm0Wtl6oScJRAGNkDYhH/ZEcTJIabBdbYocLDgJW0DzYdQo3sGgF5RnsQsvRrL\njUfq3VL4xTaHCKorEZWrAJl2Hy/1DvOK8TiXt/bcnwKBgQDXOJcqZQfwf12e2KlQ\nJIwnhIIA0xrRi7daVf8s6Lt6BHLF5pJfiLl0dyrPtBbZJzRcwUGzmk4Z9MuQFK13\nXXv/IwVWB/ej8OQ3iYR7NEKuOlTK+OIvHEpXbzmqBIyVUtapchKT2vU2wcp1Gac/\ng3oqdlqFyJwA7y/mHz1WUSEpBg==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-ren8u@tential-db.iam.gserviceaccount.com",
  client_id: "116566890047531053846",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-ren8u%40tential-db.iam.gserviceaccount.com"
}

const firestore = FirestoreApp.getFirestore(
  firestoreCredentials.client_email,
  firestoreCredentials.private_key,
  firestoreCredentials.project_id,
)

const documentData = (_document) => {
  let str = /.*documents./
  let _id = _document.name.replace(str, "")
  let documentWithMetadata = firestore.getDocument(_id)

  return documentWithMetadata.fields
}
