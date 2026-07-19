import { auth } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function createApiError(data, statusCode, fallbackMessage) {
  const error = new Error(data?.message || fallbackMessage);
  error.statusCode = statusCode;
  error.code = data?.code || "";
  return error;
}

async function getAuthHeaders() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please login first.");
  }

  const token = await currentUser.getIdToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getPaymentAccess() {
  const response = await fetch(
    `${API_BASE_URL}/payments/access`,
    {
      method: "GET",
      headers: await getAuthHeaders(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(
      data,
      response.status,
      "Could not load your current plan."
    );
  }

  return data;
}

export async function createProPaymentQuote() {
  const response = await fetch(`${API_BASE_URL}/payments/quote`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(
      data,
      response.status,
      "Could not load live payment price."
    );
  }

  return data?.quote || null;
}

export async function createRazorpayOrder({ quoteId }) {
  const response = await fetch(`${API_BASE_URL}/payments/razorpay/order`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ quoteId }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(data, response.status, "Could not start payment.");
  }

  return data?.order || null;
}

export async function verifyRazorpayPayment(payload) {
  const response = await fetch(`${API_BASE_URL}/payments/razorpay/verify`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createApiError(data, response.status, "Could not verify payment.");
  }

  return data;
}
