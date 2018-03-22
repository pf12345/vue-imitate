import { replace, getAttrs } from './util.js';
import publicDirectives from './directives/index.js';

import Directive from './directive.js';

const bindRE = /^v-bind:|^:/;
const onRE = /^v-on:|^@/;
const dirAttrRE = /^v-([^:]+)(?:$|:(.*)$)/;

export default function Compile(vueImitate) {
	vueImitate.prototype.compile = function() {
		let nodeLink = compileNode(this.el),
			nodeListLink = compileNodeList(this.el.childNodes, this),
			_dirLength = this._directives.length;

		nodeLink && nodeLink(this);
		nodeListLink && nodeListLink(this);

		let newDirectives = this._directives.slice(_dirLength);

		for(let i = 0, _i = newDirectives.length; i < _i; i++) {
			newDirectives[i]._bind();
		}
	}
}

function compileNode(el) {
	let textLink, elementLink;
	// 编译文本节点
	if(el.nodeType === 3 && el.data.trim()) {
		textLink = compileTextNode(el);
	} else if(el.nodeType === 1) {
		elementLink = compileElementNode(el);
	}
	return function(vm) {
		textLink && textLink(vm);
		elementLink && elementLink(vm);
	}
}

function compileElementNode(el) {
	let attrs = getAttrs(el);
	return function(vm) {
		if(attrs && attrs.length) {
			attrs.forEach((attr) => {
				let name = attr.name, description, matched;
				if(bindRE.test(attr.name)) {
					description = {
						el: el,
						def: publicDirectives['bind'],
						name: name.replace(bindRE, ''),
						value: attr.value
					}
				} else if((matched = name.match(dirAttrRE))) {
					description = {
						el: el,
						def: publicDirectives[matched[1]],
						name: matched[1],
						value: attr.value
					}
				}
				if(description) {
					vm._directives.push(new Directive(vm, el, description));

				}
			})
		}
	}
}

function compileTextNode(el) {
	let tokens = parseText(el.wholeText);
	var frag = document.createDocumentFragment();
	for(let i = 0, _i = tokens.length; i < _i; i++) {
		let token = tokens[i], el = document.createTextNode(token.value)
		frag.appendChild(el);
	}

	return function(vm) {
		var fragClone = frag.cloneNode(true);
		var childNodes = Array.prototype.slice.call(fragClone.childNodes), token;
		for(let j = 0, _j = tokens.length; j < _j; j++) {
			if((token = tokens[j]) && token.tag) {
				let	_el = childNodes[j], description = {
					el: _el,
					token: tokens[j],
					def: publicDirectives['text']
				}
				vm._directives.push(new Directive(vm, _el, description))
			}
		}

		// 通过这儿将`THIS IS TEST {{ number }} test` 这种转化为三个textNode
		if(tokens.length) {
			replace(el, fragClone);
		}
	}	
}

function compileNodeList(nodeList, vm) {
	let nodeLinks = [], nodeListLinks = [];
	if(!nodeList || !nodeList.length) {
		return;
	}
	for(let i = 0, _i = nodeList.length; i < _i; i++) {
		let node = nodeList[i];
		nodeLinks.push(compileNode(node)),
		nodeListLinks.push(compileNodeList(node.childNodes, vm));
	}
	return function(vm) {
		if(nodeLinks && nodeLinks.length) {
			for(let i = 0, _i = nodeLinks.length; i < _i; i++) {
				nodeLinks[i] && nodeLinks[i](vm);
			}
		}
		if(nodeListLinks && nodeListLinks.length) {
			for(let i = 0, _i = nodeListLinks.length; i < _i; i++) {
				nodeListLinks[i] && nodeListLinks[i](vm);
			}
		}
	}
}

function parseText(str) {
	let reg = /\{\{(.+?)\}\}/ig;
	let matchs = str.match(reg), match, tokens = [], index, lastIndex = 0;

	while (match = reg.exec(str)) {
		index = match.index
	    if (index > lastIndex) {
	      tokens.push({
	        value: str.slice(lastIndex, index)
	      })
	    }
		tokens.push({
			value: match[1],
			html: match[0],
			tag: true
		})
	    lastIndex = index + match[0].length
	}

	return tokens;
}


function strToFragment(str) {
	let Fragment = document.createDocumentFragment();
	let node = document.createElement('div');
	node.innerHTML = str;

	while (child = node.firstChild) {
		Fragment.appendChild(child);
	}

	return Fragment;
}