import vueImitate from './init.js';
import Compile from './compile.js';

Compile(vueImitate);

let vm = new vueImitate({
	el: 'root',
	data() {
		return {
			message: 'this is test',
			number: 0,
			number1: 1,
			number2: 2
		}
	},
	methods: {
		add() {
			this.number1 += 1;
		}
	}
})

