export function extend(to, from) {
	Object.keys(from).forEach((key) => {
		to[key] = from[key];
	})
	return to;
}

export function replace (target, el) {
  var parent = target.parentNode
  if (parent) {
    parent.replaceChild(el, target)
  }
}

export function getAttrs (el) {
	if(el.nodeType === 1 && el.hasAttributes()) {
		return Array.prototype.slice.call(el.attributes);
	}
}