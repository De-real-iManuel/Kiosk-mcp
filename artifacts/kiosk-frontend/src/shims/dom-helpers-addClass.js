// Shim for dom-helpers/addClass (removed in dom-helpers v5).
// react-transition-group 4.x references this path; we provide a no-op
// compatible replacement so the build doesn't break.
export default function addClass(element, className) {
  if (element && className) {
    if (element.classList) {
      element.classList.add(className);
    } else if (!element.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))) {
      element.className += ' ' + className;
    }
  }
}
