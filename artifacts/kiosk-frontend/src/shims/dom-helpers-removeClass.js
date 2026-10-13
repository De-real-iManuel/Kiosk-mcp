// Shim for dom-helpers/removeClass (removed in dom-helpers v5).
export default function removeClass(element, className) {
  if (element && className) {
    if (element.classList) {
      element.classList.remove(className);
    } else {
      element.className = element.className
        .replace(new RegExp('(\\s|^)' + className + '(\\s|$)'), ' ')
        .trim();
    }
  }
}
