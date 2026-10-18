export const SA_PHONE_PATTERN = /^0\d{2}\s?\d{3}\s?\d{4}$/

export const normalizePhone = (phone: string) => phone.replace(/\s+/g, '')

export const isValidPhone = (phone: string) => SA_PHONE_PATTERN.test(phone.trim())

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin)

// Demo-only hash for PIN and ID handling in localStorage. Do not use in production.
export const demoHash = (value: string, salt = 'ifarma-demo-salt') =>
  btoa(`${salt}:${value}`)

export const luhnCheck = (value: string) => {
  let sum = 0
  let shouldDouble = false
  for (let i = value.length - 1; i >= 0; i -= 1) {
    let digit = Number(value[i])
    if (Number.isNaN(digit)) return false
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }
  return sum % 10 === 0
}

export const isValidSouthAfricanId = (idNumber: string) =>
  /^\d{13}$/.test(idNumber) && luhnCheck(idNumber)

export const maskSouthAfricanId = (idNumber: string) =>
  `${idNumber.slice(0, 6)}•••••${idNumber.slice(-2)}`
