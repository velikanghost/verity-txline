import { toast as hotToast, type ToastOptions } from "react-hot-toast"
export { Toaster } from "react-hot-toast"

const defaultStyle = {
  background: "var(--surface)",
  color: "var(--foreground)",
  borderRadius: "12px",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
  fontSize: "14px",
  fontWeight: "500",
}

const toastFn = (message: any, options?: ToastOptions) => {
  return hotToast(message, {
    ...options,
    style: {
      ...defaultStyle,
      ...options?.style,
    },
  })
}

toastFn.success = (message: any, options?: ToastOptions) => {
  return hotToast.success(message, {
    ...options,
    style: {
      ...defaultStyle,
      ...options?.style,
    },
  })
}

toastFn.error = (message: any, options?: ToastOptions) => {
  return hotToast.error(message, {
    ...options,
    style: {
      ...defaultStyle,
      ...options?.style,
    },
  })
}

toastFn.loading = (message: any, options?: ToastOptions) => {
  return hotToast.loading(message, {
    ...options,
    style: {
      ...defaultStyle,
      ...options?.style,
    },
  })
}

toastFn.dismiss = (toastId?: string) => {
  hotToast.dismiss(toastId)
}

toastFn.custom = (message: any, options?: ToastOptions) => {
  return hotToast.custom(message, {
    ...options,
    style: {
      ...defaultStyle,
      ...options?.style,
    },
  })
}

toastFn.promise = <T>(
  promise: Promise<T>,
  msgs: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((err: any) => string)
  },
  options?: ToastOptions,
) => {
  return hotToast.promise(promise, msgs, {
    ...options,
    style: {
      ...defaultStyle,
      ...options?.style,
    },
  })
}

export const toast = toastFn
export default toast
