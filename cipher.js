const splitString = (_str) => {
  let splitedString = _str.match(/[a-z]\d{1,}/g)
  let codeList = splitedString.map(_code => {
    let alphabet = /^[a-z]/.exec(_code)
    let integer = /\d{1,}$/.exec(_code)
    
    return {
      alp: alphabet[0],
      int: parseInt(integer[0])
    }
  })

  return codeList
}

const decipher = (_str) => {
  const alphabets = "abcdefghijklmnopqrstuvwxyz"
  let codeList = splitString(_str)

  let alphabetIndexes = codeList.map(_code => {
    let regex = new RegExp(_code.alp)
    let alphabetIndex = regex.exec(alphabets).index
    let number = _code.int % 26

    if (number % 2 === 0) {
      alphabetIndex = (alphabetIndex + number) % 26
      return alphabetIndex
    } else {
      alphabetIndex -= number
      if (Math.sign(alphabetIndex) === -1) {
        alphabetIndex = 26 + alphabetIndex
      }
      return alphabetIndex
    }
  })

  let str = ""
  alphabetIndexes.forEach(_index => str += alphabets[_index])

  return str
}

const question1 = () => {
  console.log(decipher("a0b1d3f5"))
}

const question2 = () => {
  console.log(decipher("a0y2d3w4"))
}

const question3 = () => {
  console.log(decipher("d4543i12q77n65c16d4f49a61w76"))
}

const question4 = () => {
  console.log(decipher("w526373x522568s87766h305218c894703"))
}

const question5 = () => {
  console.log(decipher("k46927595597b23999455421q67482438962k54959663593t66323632674o97789468516j64445937397y88486785969s72835486740c83666964247g32493592926i57254538568g24323636572x76885739897v32752784694f49994245441b25742799753"))
}
