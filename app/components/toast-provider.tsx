"use client"

import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export function ToastProvider() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      theme="colored"
      toastStyle={{
        borderRadius: "12px",
        fontWeight: 500,
        fontSize: "14px",
      }}
    />
  )
}
