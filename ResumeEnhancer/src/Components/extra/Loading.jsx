import React from 'react'

const Loading = ({ text = "Loading..." }) => {
  return (
    <div className="w-full min-h-[300px] flex flex-col justify-center items-center gap-4">
      <div className="w-16 h-16 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-yellow-50 font-semibold text-lg">{text}</p>
    </div>
  )
}

export default Loading
