export default function IconBtn({
  text,
  onclick,
  children,
  disabled,
  outline = false,
  customClasses,
  type,
  borderColor = 'border-yellow-50',
  bgColor = 'bg-yellow-50',
}) {
  return (
    <button
      disabled={disabled}
      onClick={onclick}
      className={`flex items-center ${
        outline ? `border ${borderColor} bg-transparent` : bgColor
      } cursor-pointer gap-x-2 rounded-lg px-4 py-2.5 font-semibold text-richblack-900 transition-all duration-200 hover:shadow-md hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${customClasses}`}
      type={type}
    >
      {children ? (
        <>
          <span className={`${outline && "text-yellow-50"}`}>{text}</span>
          {children}
        </>
      ) : (
        text
      )}
    </button>
  )
}
