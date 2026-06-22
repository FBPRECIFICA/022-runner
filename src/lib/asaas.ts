const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY
const ASAAS_BASE_URL = 'https://api.asaas.com/v3'

export async function createCustomer(data: {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
}) {
  const response = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY
    },
    body: JSON.stringify(data)
  })
  return response.json()
}

export async function createPayment(data: {
  customer: string
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO'
  value: number
  dueDate: string
  description: string
}) {
  const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY
    },
    body: JSON.stringify(data)
  })
  return response.json()
}

export async function getPixQrCode(paymentId: string) {
  const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`, {
    headers: { 'access_token': ASAAS_API_KEY }
  })
  return response.json()
}
