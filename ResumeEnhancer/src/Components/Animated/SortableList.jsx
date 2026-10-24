import { useState } from "react";
import { LuTrash as Trash } from "react-icons/lu";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  Reorder,
  useDragControls
} from "motion/react";
import useMeasure from "react-use-measure";
import { cn } from "../../utils/cn.js";
function SortableListItem({
  item,
  order,
  onCompleteItem,
  onRemoveItem,
  renderExtra,
  handleDrag,
  isExpanded,
  className
}) {
  let [ref, bounds] = useMeasure();
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();
  const handleDragStart = (event) => {
    setIsDragging(true);
    dragControls.start(event, { snapToCursor: true });
    handleDrag();
  };
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  return <motion.div className={cn("", className)} key={item.id}>
      <div className="flex w-full items-center">
        <Reorder.Item
    value={item}
    className={cn(
      "relative z-auto grow",
      "bg-richblack-700 h-full rounded-xl",
      "shadow-[0px_1px_0px_0px_hsla(0,0%,100%,.03)_inset,0px_0px_0px_1px_hsla(0,0%,100%,.03)_inset,0px_0px_0px_1px_rgba(0,0,0,.1),0px_2px_2px_0px_rgba(0,0,0,.1),0px_4px_4px_0px_rgba(0,0,0,.1),0px_8px_8px_0px_rgba(0,0,0,.1)]",
      item.checked ? "cursor-not-allowed" : "cursor-grab",
      item.checked && !isDragging ? "w-7/10" : "w-full"
    )}
    key={item.id}
    initial={{ opacity: 0 }}
    animate={{
      opacity: 1,
      height: bounds.height > 0 ? bounds.height : void 0,
      transition: {
        type: "spring",
        bounce: 0,
        duration: 0.4
      }
    }}
    exit={{
      opacity: 0,
      transition: {
        duration: 0.05,
        type: "spring",
        bounce: 0.1
      }
    }}
    layout
    layoutId={`item-${item.id}`}
    dragListener={!item.checked}
    dragControls={dragControls}
    onDragEnd={handleDragEnd}
    style={isExpanded ? {
      zIndex: 9999,
      marginTop: 10,
      marginBottom: 10,
      position: "relative",
      overflow: "hidden"
    } : {
      position: "relative",
      overflow: "hidden"
    }}
    whileDrag={{ zIndex: 9999 }}
  >
          <div ref={ref} className={cn(isExpanded ? "" : "", "z-20")}>
            <motion.div
    layout="position"
    className="flex items-center justify-start py-2 pr-3"
  >
              <AnimatePresence>
                {!isExpanded ? <motion.div
    initial={{ opacity: 0, filter: "blur(4px)" }}
    animate={{ opacity: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, filter: "blur(4px)" }}
    transition={{ duration: 1e-3 }}
    className="flex items-center space-x-2"
  >
                    {
    /* List Remove Actions */
  }
                    <div className="pt-1 pl-3">
                      <input
    type="checkbox"
    checked={item.checked}
    id={`checkbox-${item.id}`}
    aria-label="Mark to delete"
    onChange={() => onCompleteItem(item.id)}
    className="h-5 w-5 cursor-pointer rounded-md accent-red-400"
  />
                    </div>
                    {
    /* List Order */
  }
                    <p className="pl-1 font-mono text-xs text-white/50">
                      {order + 1}
                    </p>

                    {
    /* List Title */
  }
                    <motion.div
    key={`${item.checked}`}
    className="min-w-[150px] px-1"
    initial={{
      opacity: 0,
      filter: "blur(4px)"
    }}
    animate={{ opacity: 1, filter: "blur(0px)" }}
    transition={{
      bounce: 0.2,
      delay: item.checked ? 0.2 : 0,
      type: "spring"
    }}
  >
                      <h4
    className={cn(
      "text-sm tracking-tight md:text-base",
      item.checked ? "text-red-400" : "text-richblack-100"
    )}
  >
                        {item.checked ? "Delete" : ` ${item.text}`}
                      </h4>
                    </motion.div>
                  </motion.div> : null}
              </AnimatePresence>

              {
    /* List Item Children */
  }
              {renderExtra && renderExtra(item)}
            </motion.div>
          </div>
          <div
    onPointerDown={handleDragStart}
    style={{ touchAction: "none" }}
  />
        </Reorder.Item>
        {
    /* List Delete Action Animation */
  }
        <AnimatePresence mode="popLayout">
          {item.checked ? <motion.div
    layout
    initial={{ opacity: 0, x: -10 }}
    animate={{
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.17,
        duration: 0.17,
        type: "spring",
        bounce: 0.6
      },
      zIndex: 5
    }}
    exit={{
      opacity: 0,
      x: -5,
      transition: {
        delay: 0,
        duration: 0,
        type: "spring",
        bounce: 0
      }
    }}
    className="-ml-[1px] h-[1.5rem] w-3 rounded-l-none rounded-r-none border-y border-y-white/5 border-r-white/10 bg-[#161716]"
  /> : null}
        </AnimatePresence>
        <AnimatePresence mode="popLayout">
          {item.checked ? <motion.div
    layout
    initial={{ opacity: 0, x: -5, filter: "blur(4px)" }}
    animate={{
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: {
        delay: 0.3,
        duration: 0.15,
        type: "spring",
        bounce: 0.9
      }
    }}
    exit={{
      opacity: 0,
      filter: "blur(4px)",
      x: -10,
      transition: { delay: 0, duration: 0.12 }
    }}
    className="inset-0 z-0 border-spacing-1 rounded-l-sm rounded-r-xl border-r-2 border-r-red-300/60 bg-[#161716]/80 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(0,0,0,0.1),0_2px_2px_0_rgba(0,0,0,0.1),0_4px_4px_0_rgba(0,0,0,0.1),0_8px_8px_0_rgba(0,0,0,0.1)] dark:bg-[#161716]/50"
  >
              <button
    type="button"
    className="focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
    onClick={() => onRemoveItem(item.id)}
  >
                <Trash className="h-4 w-4 fill-red-400/60 text-red-400 transition-colors duration-150" />
              </button>
            </motion.div> : null}
        </AnimatePresence>
      </div>
    </motion.div>;
}
SortableListItem.displayName = "SortableListItem";
function SortableList({
  items,
  setItems,
  onCompleteItem,
  renderItem
}) {
  if (items) {
    return <LayoutGroup>
        <Reorder.Group
      axis="y"
      values={items}
      onReorder={setItems}
      className="flex flex-col gap-2"
    >
          <AnimatePresence>
            {items?.map(
      (item, index) => renderItem(
        item,
        index,
        onCompleteItem,
        (id) => setItems((items2) => items2.filter((item2) => item2.id !== id))
      )
    )}
          </AnimatePresence>
        </Reorder.Group>
      </LayoutGroup>;
  }
  return null;
}
SortableList.displayName = "SortableList";
var stdin_default = SortableList;
export {
  SortableList,
  SortableListItem,
  stdin_default as default
};
