if(typeof Array.prototype.flatten !== 'function'){
	Array.prototype.flatten = function(){
		return this.reduce((acc, val) => acc.concat(val), []);
	}
}
class BufferMatrix{
	constructor(width, height, cellSize, arrayBuffer){
		this.width = width;
		this.height = height;
		this.cellSize = cellSize;
		this.view = new DataView(
			arrayBuffer
				? arrayBuffer.slice(0, width * height * cellSize)
				: new ArrayBuffer(width * height * cellSize)
		);
	}
	getOffset(x, y = 0, byte = 0, neededBytes = 1){
		if(byte + neededBytes > this.cellSize){
			throw new Error('Byte overflow!');
		}
		return (y * this.width + x) * this.cellSize;
	}
	some(func){
		for(let x = 0; x < this.width; x++){
			for(let y = 0; y < this.height; y++){
				if(func(this.getOffset(x,y), x, y)){
					return true;
				}
			}
		}
		return false;
	}
	all(func){
		return !this.some((...args) => !func(...args));
	}
	forEach(func){
		this.some((...args) => {
			func(...args);
			return false;
		});
	}
	toString(){
		let str = '';
		const arr = new Uint8Array(this.view.buffer);
		for(let i = 0; i < arr.byteLength; i += 1){
			str += ('00' + arr[i].toString(16)).slice(-2);
			if((i+1) % (this.width * this.cellSize) === 0){
				str += '\n';
			}else if((i+1) % this.cellSize === 0){
				str += '  ';
			}
		}
		return str;
	}
}

const lineBreakRegex = /\r?\n/;
const digitRegex = /\d/;
const parseLevelBuffer = buffer => {
	const metadataLength = 2;
	const metadata = new DataView(buffer.slice(0, metadataLength));
	const width = metadata.getUint8(0);
	const height = metadata.getUint8(1);
	const content = buffer.slice(metadataLength);
	const matrix = new BufferMatrix(width, height, 1, content);
	console.log(matrix.toString());
	return matrix;
};

const reqAnimFrame = () => new Promise(requestAnimationFrame);
const sendThrough = func => value => {
	func(value);
	return value;
};
const listen = (eventtarget, type, func, ...args) => {
	if(Array.isArray(eventtarget)){
		return eventtarget.map(et => listen(et, type, func, ...args)).flatten();
	}
	if(Array.isArray(type)){
		return type.map(t => listen(eventtarget, t, func, ...args)).flatten();
	}
	eventtarget.addEventListener(type, func, ...args);
	return[{
		destroy: () => {
			eventtarget.removeEventListener(type, func, ...args);
		}
	}];
};
const waitForEvent = (eventtarget, type, ...args) => new Promise(resolve => {
	const listeners = listen(eventtarget, type, e => {
		for(const listener of listeners){
			listener.destroy();
		}
		return resolve(e);
	}, ...args);
});
const between = (value, min, max) => {
	if(value < min) return min;
	if(value > max) return max;
	return value;
};
class Vector{
	constructor(x,y){
		this.x = x;
		this.y = y;
	}
	static fromDir(dir, length){
		return new Vector(Math.sin(dir) * length, Math.cos(dir) * length);
	}
	add(vector){
		return new Vector(this.x + vector.x, this.y + vector.y);
	}
	get length(){
		if(this.hasOwnProperty('_length')) return this._length;
		return this._length = Math.sqrt(this.x**2 + this.y**2);
	}
	normalize(){
		return new Vector(this.x / this._length, this.y / this._length);
	}
	multiply(n){
		return new Vector(this.x * n, this.y * n);
	}
	resize(n){
		return this.normalize().multiply(n);
	}
	resizeToX(x){
		return new Vector(x, (this.y / this.x) * x);
	}
	resizeToY(y){
		return new Vector((this.x / this.y) * y, y);
	}
	/** Only works if the two vectors are laying on the same line. */
	divideByVector(vec){
		const x = this.x / vec.x;
		const y = this.y / vec.y;
		if(Math.abs(x - y) > 0.0001) return undefined;
		return x;
	}
}
const doNothing = () => {};
const id = x => x;
const isSameSign = (a,b) => (a < 0 && b < 0) || (a === 0 && b === 0) || (a > 0 && b > 0);
const range = (from, to, step = 1) => {
	const arr = [];
	for(let i = from; i <= to; i += step){
		arr.push(i);
	}
	return arr;
};
const getById = id => document.getElementById(id);
const selectAll = (selector, parent) => [...parent.querySelectorAll(selector)];

export {parseLevelBuffer, BufferMatrix, reqAnimFrame, sendThrough, listen, between, Vector, waitForEvent, doNothing, id, isSameSign, range, getById, selectAll};