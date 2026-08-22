// h-full sir, not a fixed min-height — a fixed 300px box only centers the spinner within
// that box, which reads as "stuck near the top" on a full-height page like NewReview's. h-full
// makes this fill whatever scrollable content area it's placed in (see PageTransition's
// h-full wrapper), so justify-center/items-center actually center it in the visible page.
const Loading = ({ text = "Loading..." }) => {
  return (
    <div className="w-full h-full min-h-[300px] flex flex-col justify-center items-center gap-4">
      <div className="w-16 h-16 border-4 border-yellow-50 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-yellow-50 font-semibold text-lg">{text}</p>
    </div>
  )
}

export default Loading
